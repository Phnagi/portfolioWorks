// ===================================================================
// Local admin server — run with `npm run admin`.
//
//   http://localhost:5050/admin/   → visual editor for data/site.json
//   http://localhost:5050/         → live preview of the site
//
// API (localhost only):
//   GET  /api/data          read data/site.json
//   POST /api/data          save data/site.json
//   POST /api/upload        { folder, name, dataUrl } → compress & save,
//                           returns { path } (images resized to 2000px,
//                           jpg q82 / png→webp q90; videos copied as-is)
//   POST /api/delete-file   { path } → delete a file inside assets/
//   GET  /api/git-status    porcelain summary of pending changes
//   POST /api/publish       { message } → git add/commit/pull --rebase/push
// ===================================================================
import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile, exec } from "node:child_process";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_FILE = path.join(ROOT, "data", "site.json");
const PORT = 5050;
const MAX_BODY = 200 * 1024 * 1024; // 200MB (videos arrive base64-encoded)
const MAX_EDGE = 2000; // longest image edge after compression

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".md": "text/plain",
};

// ---------------- helpers ----------------

const send = (res, code, body, type = "application/json") => {
  const buf = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(buf);
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// resolve a repo-relative path and refuse anything escaping ROOT
function safePath(rel) {
  const abs = path.resolve(ROOT, rel);
  if (!abs.startsWith(ROOT + path.sep)) throw new Error("path outside repo");
  return abs;
}

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "file";

function git(args) {
  return new Promise((resolve) => {
    execFile("git", args, { cwd: ROOT, timeout: 120000 }, (err, stdout, stderr) => {
      resolve({ ok: !err, out: (stdout + stderr).trim(), cmd: "git " + args.join(" ") });
    });
  });
}

// ---------------- API handlers ----------------

async function apiGetData(res) {
  send(res, 200, await fsp.readFile(DATA_FILE, "utf8"));
}

async function apiSaveData(req, res) {
  const body = JSON.parse((await readBody(req)).toString("utf8"));
  // minimal shape check so a buggy client can't wipe the site
  for (const key of ["hero", "about", "contact", "projects", "photos"]) {
    if (!(key in body)) throw new Error(`missing "${key}"`);
  }
  await fsp.writeFile(DATA_FILE, JSON.stringify(body, null, 2) + "\n", "utf8");
  send(res, 200, { ok: true });
}

async function apiUpload(req, res) {
  const { folder, name, dataUrl } = JSON.parse((await readBody(req)).toString("utf8"));

  // only allow writing into the site's asset folders
  if (!/^assets\/(images(\/[a-z0-9_-]+){0,2}|video)$/.test(folder)) {
    throw new Error(`invalid folder: ${folder}`);
  }
  const m = /^data:([a-z0-9/+.-]+);base64,(.+)$/is.exec(dataUrl || "");
  if (!m) throw new Error("bad dataUrl");
  const buf = Buffer.from(m[2], "base64");
  const isVideo = m[1].startsWith("video/");
  const isPng = /png|gif/.test(m[1]);

  const dir = safePath(folder);
  await fsp.mkdir(dir, { recursive: true });

  // unique, url-safe filename
  const stamp = Date.now().toString(36).slice(-4);
  let base = `${slugify(name || "upload")}-${stamp}`;
  let outName, outBuf;

  if (isVideo) {
    outName = base + ".mp4";
    outBuf = buf; // videos are stored as-is
  } else {
    const img = sharp(buf).rotate().resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    });
    if (isPng) {
      outName = base + ".webp";
      outBuf = await img.webp({ quality: 90 }).toBuffer();
    } else {
      outName = base + ".jpg";
      outBuf = await img.jpeg({ quality: 82, progressive: true, mozjpeg: true }).toBuffer();
    }
  }

  await fsp.writeFile(path.join(dir, outName), outBuf);
  send(res, 200, { ok: true, path: `${folder}/${outName}`, bytes: outBuf.length });
}

async function apiDeleteFile(req, res) {
  const { path: rel } = JSON.parse((await readBody(req)).toString("utf8"));
  if (!/^assets\//.test(rel || "")) throw new Error("only files inside assets/ can be deleted");
  const abs = safePath(rel);
  await fsp.unlink(abs).catch(() => {}); // already gone is fine
  send(res, 200, { ok: true });
}

async function apiGitStatus(res) {
  const st = await git(["status", "--porcelain"]);
  const branch = await git(["rev-parse", "--abbrev-ref", "HEAD"]);
  send(res, 200, {
    branch: branch.out,
    changes: st.out ? st.out.split("\n") : [],
  });
}

async function apiPublish(req, res) {
  const { message } = JSON.parse((await readBody(req)).toString("utf8"));
  const log = [];
  const run = async (args) => {
    const r = await git(args);
    log.push(`$ ${r.cmd}\n${r.out}`);
    return r;
  };

  const st = await git(["status", "--porcelain"]);
  if (st.out) {
    await run(["add", "-A"]);
    const msg = (message || "").trim() || `更新網站內容（${new Date().toLocaleString("zh-TW")}）`;
    const c = await run(["commit", "-m", msg]);
    if (!c.ok) return send(res, 500, { ok: false, log });
  } else {
    log.push("（沒有新的變更需要 commit）");
  }
  const pull = await run(["pull", "--rebase", "origin", "main"]);
  if (!pull.ok) return send(res, 500, { ok: false, log });
  const push = await run(["push", "origin", "main"]);
  send(res, push.ok ? 200 : 500, { ok: push.ok, log });
}

// ---------------- static files ----------------

async function serveStatic(req, res) {
  let urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (urlPath.endsWith("/")) urlPath += "index.html";
  let abs;
  try {
    abs = safePath("." + urlPath);
  } catch {
    return send(res, 403, "forbidden", "text/plain");
  }
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    return send(res, 404, "not found", "text/plain");
  }
  send(res, 200, await fsp.readFile(abs), MIME[path.extname(abs).toLowerCase()] || "application/octet-stream");
}

// ---------------- server ----------------

const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, "http://x");
    if (pathname === "/api/data" && req.method === "GET") return await apiGetData(res);
    if (pathname === "/api/data" && req.method === "POST") return await apiSaveData(req, res);
    if (pathname === "/api/upload" && req.method === "POST") return await apiUpload(req, res);
    if (pathname === "/api/delete-file" && req.method === "POST") return await apiDeleteFile(req, res);
    if (pathname === "/api/git-status" && req.method === "GET") return await apiGitStatus(res);
    if (pathname === "/api/publish" && req.method === "POST") return await apiPublish(req, res);
    return await serveStatic(req, res);
  } catch (err) {
    send(res, 500, { ok: false, error: err.message });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  const url = `http://localhost:${PORT}/admin/`;
  console.log(`\n  ✦ 後台管理    ${url}`);
  console.log(`  ✦ 網站預覽    http://localhost:${PORT}/\n`);
  // best-effort: open the browser automatically on Windows
  if (process.platform === "win32") exec(`start ${url}`, () => {});
});
