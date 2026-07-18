// ===================================================================
// 網站後台 — edits data/site.json through the local admin server.
// ===================================================================
let site = null; // working copy of site.json
let dirty = false;

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---------------- status & dirty ----------------

let statusTimer;
function setStatus(text, cls = "", sticky = false) {
  const el = $("#status");
  el.textContent = text;
  el.className = "actionbar__status " + cls;
  clearTimeout(statusTimer);
  if (!sticky && text) statusTimer = setTimeout(() => (el.textContent = ""), 4000);
}

function markDirty() {
  dirty = true;
  $("#dirty-hint").textContent = "● 有未儲存的變更";
}

window.addEventListener("beforeunload", (e) => {
  if (dirty) e.preventDefault();
});

// ---------------- API ----------------

async function api(url, body) {
  const res = await fetch(url, body ? { method: "POST", body: JSON.stringify(body) } : undefined);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// read a File → upload → returns saved repo path
function uploadFile(file, folder) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("讀取檔案失敗"));
    reader.onload = async () => {
      try {
        setStatus(`上傳中… ${file.name}`, "", true);
        const r = await api("/api/upload", { folder, name: file.name, dataUrl: reader.result });
        resolve(r.path);
      } catch (e) {
        reject(e);
      }
    };
    reader.readAsDataURL(file);
  });
}

async function uploadMany(files, folder, accept) {
  const paths = [];
  for (const f of files) {
    if (accept && !f.type.startsWith(accept)) continue;
    paths.push(await uploadFile(f, folder));
  }
  setStatus(`已上傳 ${paths.length} 個檔案（已自動壓縮成網頁尺寸）`, "is-ok");
  return paths;
}

// delete a no-longer-referenced asset file from disk
function deleteFileIfUnused(path) {
  if (!path || !path.startsWith("assets/")) return;
  if (JSON.stringify(site).includes(path)) return; // still referenced somewhere
  api("/api/delete-file", { path }).catch(() => {});
}

// ---------------- small ui builders ----------------

function field(label, value, onInput, { textarea = false, hint = "" } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  wrap.innerHTML = `<label>${label}</label>`;
  const input = document.createElement(textarea ? "textarea" : "input");
  if (!textarea) input.type = "text";
  input.value = value ?? "";
  input.addEventListener("input", () => {
    onInput(input.value);
    markDirty();
  });
  wrap.appendChild(input);
  if (hint) wrap.insertAdjacentHTML("beforeend", `<div class="hint">${hint}</div>`);
  return wrap;
}

// cover-style single image picker with preview
function imagePicker(label, get, set, folder, portrait = false) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  wrap.innerHTML = `<label>${label}</label>`;
  const row = document.createElement("div");
  row.className = "imgpick";
  const img = document.createElement("img");
  img.className = "thumb" + (portrait ? " thumb--portrait" : "");
  img.src = "/" + get();
  const btn = document.createElement("button");
  btn.className = "btn btn--sm";
  btn.textContent = "更換圖片…";
  const file = document.createElement("input");
  file.type = "file";
  file.accept = "image/*";
  file.hidden = true;
  btn.addEventListener("click", () => file.click());
  file.addEventListener("change", async () => {
    if (!file.files[0]) return;
    try {
      const old = get();
      const p = await uploadFile(file.files[0], folder);
      set(p);
      img.src = "/" + p;
      markDirty();
      deleteFileIfUnused(old);
      setStatus("圖片已更換（記得儲存）", "is-ok");
    } catch (e) {
      setStatus("上傳失敗：" + e.message, "is-err");
    }
  });
  row.append(img, btn, file);
  wrap.appendChild(row);
  return wrap;
}

function dropzone(text, onFiles, accept = "image/*") {
  const dz = document.createElement("div");
  dz.className = "dropzone";
  dz.textContent = text;
  const file = document.createElement("input");
  file.type = "file";
  file.accept = accept;
  file.multiple = true;
  file.hidden = true;
  dz.appendChild(file);
  dz.addEventListener("click", () => file.click());
  file.addEventListener("change", () => onFiles([...file.files]));
  dz.addEventListener("dragover", (e) => {
    e.preventDefault();
    dz.classList.add("is-over");
  });
  dz.addEventListener("dragleave", () => dz.classList.remove("is-over"));
  dz.addEventListener("drop", (e) => {
    e.preventDefault();
    dz.classList.remove("is-over");
    onFiles([...e.dataTransfer.files]);
  });
  return dz;
}

const move = (arr, i, dir) => {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return false;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  return true;
};

// ---------------- tab: 首頁文字 ----------------

function renderTexts() {
  const tab = $("#tab-texts");
  tab.innerHTML = "";

  tab.insertAdjacentHTML("beforeend", `<h2 class="sec">Hero（首頁大標區）</h2>`);
  const hero = document.createElement("div");
  hero.className = "card";
  hero.append(
    field("小標（kicker）", site.hero.kicker, (v) => (site.hero.kicker = v)),
    field("名字（大標題，網站各處都會用到）", site.hero.title, (v) => (site.hero.title = v)),
    field("自我介紹", site.hero.intro, (v) => (site.hero.intro = v), { textarea: true }),
    imagePicker("背景照片", () => site.hero.image, (p) => (site.hero.image = p), "assets/images")
  );
  tab.appendChild(hero);

  tab.insertAdjacentHTML("beforeend", `<h2 class="sec">About（關於我）</h2>`);
  const about = document.createElement("div");
  about.className = "card";
  about.append(
    field("標題", site.about.title, (v) => (site.about.title = v)),
    field(
      "內文段落",
      site.about.paragraphs.join("\n"),
      (v) => (site.about.paragraphs = v.split("\n").map((s) => s.trim()).filter(Boolean)),
      { textarea: true, hint: "一行 = 一個段落" }
    ),
    field(
      "技能標籤",
      site.about.tags.join(", "),
      (v) => (site.about.tags = v.split(",").map((s) => s.trim()).filter(Boolean)),
      { hint: "用逗號分隔，例如：UI/UX, Front-end, Branding" }
    ),
    imagePicker("形象照", () => site.about.portrait, (p) => (site.about.portrait = p), "assets/images", true)
  );
  tab.appendChild(about);

  tab.insertAdjacentHTML("beforeend", `<h2 class="sec">Contact（聯絡方式）</h2>`);
  const contact = document.createElement("div");
  contact.className = "card";
  site.contact.links.forEach((link, i) => {
    const row = document.createElement("div");
    row.className = "row";
    row.style.marginBottom = "10px";
    const label = field("顯示文字", link.label, (v) => (link.label = v));
    const url = field("連結（mailto: 或 https://）", link.url, (v) => (link.url = v));
    label.style.flex = "1";
    url.style.flex = "1.4";
    label.style.marginBottom = url.style.marginBottom = "0";
    const del = document.createElement("button");
    del.className = "btn btn--sm btn--danger";
    del.textContent = "刪除";
    del.addEventListener("click", () => {
      site.contact.links.splice(i, 1);
      markDirty();
      renderTexts();
    });
    row.append(label, url, del);
    contact.appendChild(row);
  });
  const addLink = document.createElement("button");
  addLink.className = "btn btn--sm";
  addLink.textContent = "＋ 新增連結";
  addLink.addEventListener("click", () => {
    site.contact.links.push({ label: "", url: "" });
    markDirty();
    renderTexts();
  });
  contact.appendChild(addLink);
  contact.append(
    field("版權文字", site.contact.copyright, (v) => (site.contact.copyright = v)),
    field("手機選單底部文字", site.contact.footerNote, (v) => (site.contact.footerNote = v))
  );
  tab.appendChild(contact);
}

// ---------------- tab: 專案 ----------------

const openProjects = new Set(); // ids of expanded panels

function projectFolder(p) {
  const id = p.id.replace(/[^a-z0-9_-]/g, "").slice(0, 24) || "misc";
  return `assets/images/${id}`;
}

function renderProjects() {
  const tab = $("#tab-projects");
  tab.innerHTML = `<h2 class="sec">專案（順序 = 網站上的顯示順序）</h2>`;

  const addBtn = document.createElement("button");
  addBtn.className = "btn btn--primary";
  addBtn.textContent = "＋ 新增專案";
  addBtn.style.marginBottom = "16px";
  addBtn.addEventListener("click", () => {
    const id = "p" + Date.now().toString(36);
    site.projects.unshift({
      id,
      kicker: "PROJECT — CATEGORY",
      title: "新專案",
      desc: "一句話簡介",
      cardDesc: "作品卡片上的描述",
      detail: "專案的完整介紹…",
      img: "",
      tags: [],
      gallery: [],
      videos: [],
    });
    openProjects.add(id);
    markDirty();
    renderProjects();
  });
  tab.appendChild(addBtn);

  site.projects.forEach((p, i) => {
    const el = document.createElement("div");
    el.className = "proj" + (openProjects.has(p.id) ? " is-open" : "");

    // ----- header row -----
    const head = document.createElement("div");
    head.className = "proj__head";
    head.innerHTML = `
      <span class="proj__num">${String(i + 1).padStart(2, "0")}</span>
      ${p.img ? `<img src="/${esc(p.img)}" alt="">` : ""}
      <span class="proj__title">${esc(p.title)}</span>`;
    const tools = document.createElement("div");
    tools.className = "row";
    for (const [txt, fn] of [
      ["↑", () => move(site.projects, i, -1) && (markDirty(), renderProjects())],
      ["↓", () => move(site.projects, i, 1) && (markDirty(), renderProjects())],
      [
        "刪除",
        () => {
          if (!confirm(`確定刪除專案「${p.title}」？\n（專案圖片檔案也會一併移除）`)) return;
          site.projects.splice(i, 1);
          markDirty();
          [p.img, ...p.gallery, ...p.videos].forEach(deleteFileIfUnused);
          renderProjects();
        },
      ],
    ]) {
      const b = document.createElement("button");
      b.className = "btn btn--sm" + (txt === "刪除" ? " btn--danger" : "");
      b.textContent = txt;
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        fn();
      });
      tools.appendChild(b);
    }
    head.appendChild(tools);
    head.addEventListener("click", () => {
      openProjects.has(p.id) ? openProjects.delete(p.id) : openProjects.add(p.id);
      el.classList.toggle("is-open");
    });
    el.appendChild(head);

    // ----- body -----
    const body = document.createElement("div");
    body.className = "proj__body";

    const grid = document.createElement("div");
    grid.className = "grid-2";
    grid.append(
      field("專案名稱", p.title, (v) => {
        p.title = v;
        head.querySelector(".proj__title").textContent = v;
      }),
      field("列表簡介（首頁清單右側）", p.desc, (v) => (p.desc = v)),
      field("分類標籤（頁面頂端小字）", p.kicker, (v) => (p.kicker = v)),
      field("卡片描述（WORK 頁卡片）", p.cardDesc, (v) => (p.cardDesc = v)),
      field(
        "技術/類型標籤",
        p.tags.join(", "),
        (v) => (p.tags = v.split(",").map((s) => s.trim()).filter(Boolean)),
        { hint: "逗號分隔" }
      )
    );
    body.appendChild(grid);
    body.appendChild(field("完整介紹（專案內頁）", p.detail, (v) => (p.detail = v), { textarea: true }));
    body.appendChild(
      imagePicker("封面圖", () => p.img || "", (v) => {
        p.img = v;
        renderProjects();
      }, projectFolder(p))
    );

    // gallery
    body.insertAdjacentHTML("beforeend", `<h2 class="sec">內頁圖片（gallery）</h2>`);
    const gal = document.createElement("div");
    gal.className = "gallery";
    p.gallery.forEach((src, gi) => {
      const item = document.createElement("div");
      item.className = "gallery__item";
      item.innerHTML = `<img src="/${esc(src)}" loading="lazy">`;
      const t = document.createElement("div");
      t.className = "gallery__tools";
      for (const [txt, fn] of [
        ["◀", () => move(p.gallery, gi, -1) && (markDirty(), renderProjects())],
        ["▶", () => move(p.gallery, gi, 1) && (markDirty(), renderProjects())],
        [
          "✕",
          () => {
            p.gallery.splice(gi, 1);
            markDirty();
            deleteFileIfUnused(src);
            renderProjects();
          },
        ],
      ]) {
        const b = document.createElement("button");
        b.className = "btn";
        b.textContent = txt;
        b.addEventListener("click", fn);
        t.appendChild(b);
      }
      item.appendChild(t);
      gal.appendChild(item);
    });
    body.appendChild(gal);
    body.appendChild(
      dropzone("點擊或拖曳圖片到這裡上傳（可多張，會自動壓縮）", async (files) => {
        try {
          const paths = await uploadMany(files, projectFolder(p), "image/");
          p.gallery.push(...paths);
          markDirty();
          renderProjects();
        } catch (e) {
          setStatus("上傳失敗：" + e.message, "is-err");
        }
      })
    );

    // videos
    body.insertAdjacentHTML("beforeend", `<h2 class="sec">VIDEO — 影片（自動循環播放）</h2>`);
    p.videos.forEach((src, vi) => {
      const row = document.createElement("div");
      row.className = "row";
      row.style.marginBottom = "8px";
      row.innerHTML = `<span style="font-family:var(--mono);font-size:12.5px;flex:1">${esc(src)}</span>`;
      const del = document.createElement("button");
      del.className = "btn btn--sm btn--danger";
      del.textContent = "刪除";
      del.addEventListener("click", () => {
        p.videos.splice(vi, 1);
        markDirty();
        deleteFileIfUnused(src);
        renderProjects();
      });
      row.appendChild(del);
      body.appendChild(row);
    });
    body.appendChild(
      dropzone("點擊或拖曳影片（mp4）到這裡上傳", async (files) => {
        try {
          const paths = await uploadMany(files, "assets/video", "video/");
          p.videos.push(...paths);
          markDirty();
          renderProjects();
        } catch (e) {
          setStatus("上傳失敗：" + e.message, "is-err");
        }
      }, "video/mp4")
    );

    el.appendChild(body);
    tab.appendChild(el);
  });
}

// ---------------- tab: 攝影 ----------------

function renderPhotos() {
  const tab = $("#tab-photos");
  tab.innerHTML = `
    <h2 class="sec">攝影作品（順序 = 瀏覽器內的順序）</h2>
    <p class="hint" style="margin:0 0 14px">
      橘色「首頁」標籤 = 這張會出現在首頁的橫向照片列，點標籤可切換。
    </p>`;

  const gal = document.createElement("div");
  gal.className = "gallery";
  site.photos.forEach((ph, i) => {
    const item = document.createElement("div");
    item.className = "gallery__item";
    item.innerHTML = `<img src="/${esc(ph.src)}" loading="lazy">`;

    const badge = document.createElement("div");
    badge.className = "gallery__badge" + (ph.filmstrip ? " is-on" : "");
    badge.textContent = ph.filmstrip ? "★ 首頁" : "首頁";
    badge.title = "切換是否顯示在首頁照片列";
    badge.addEventListener("click", () => {
      ph.filmstrip = !ph.filmstrip;
      markDirty();
      renderPhotos();
    });
    item.appendChild(badge);

    const t = document.createElement("div");
    t.className = "gallery__tools";
    for (const [txt, fn] of [
      ["◀", () => move(site.photos, i, -1) && (markDirty(), renderPhotos())],
      ["▶", () => move(site.photos, i, 1) && (markDirty(), renderPhotos())],
      [
        "✕",
        () => {
          if (!confirm("確定刪除這張照片？檔案會一併移除。")) return;
          site.photos.splice(i, 1);
          markDirty();
          deleteFileIfUnused(ph.src);
          renderPhotos();
        },
      ],
    ]) {
      const b = document.createElement("button");
      b.className = "btn";
      b.textContent = txt;
      b.addEventListener("click", fn);
      t.appendChild(b);
    }
    item.appendChild(t);
    gal.appendChild(item);
  });
  tab.appendChild(gal);

  tab.appendChild(
    dropzone("點擊或拖曳照片到這裡上傳（可多張，會自動壓縮成網頁尺寸）", async (files) => {
      try {
        const paths = await uploadMany(files, "assets/images/photo", "image/");
        site.photos.push(...paths.map((src) => ({ src, filmstrip: false })));
        markDirty();
        renderPhotos();
      } catch (e) {
        setStatus("上傳失敗：" + e.message, "is-err");
      }
    })
  );
}

// ---------------- tabs / actions ----------------

$$(".sidebar__tab").forEach((btn) =>
  btn.addEventListener("click", () => {
    $$(".sidebar__tab").forEach((b) => b.classList.toggle("is-active", b === btn));
    $$(".tab").forEach((t) => (t.hidden = t.id !== "tab-" + btn.dataset.tab));
  })
);

$("#btn-preview").addEventListener("click", () => window.open("/", "_blank"));

$("#btn-save").addEventListener("click", async () => {
  try {
    await api("/api/data", site);
    dirty = false;
    $("#dirty-hint").textContent = "";
    setStatus("✓ 已儲存（本機預覽已更新；要上線請按「發布」）", "is-ok");
  } catch (e) {
    setStatus("儲存失敗：" + e.message, "is-err");
  }
});

$("#btn-publish").addEventListener("click", () => {
  $("#publish-log").hidden = true;
  $("#publish-msg").value = "";
  $("#publish-dialog").showModal();
});
$("#publish-cancel").addEventListener("click", () => $("#publish-dialog").close());
$("#publish-go").addEventListener("click", async () => {
  const goBtn = $("#publish-go");
  goBtn.disabled = true;
  try {
    if (dirty) {
      await api("/api/data", site);
      dirty = false;
      $("#dirty-hint").textContent = "";
    }
    setStatus("發布中…（git commit + push）", "", true);
    const r = await api("/api/publish", { message: $("#publish-msg").value });
    $("#publish-log").hidden = false;
    $("#publish-log").textContent = r.log.join("\n\n");
    setStatus("🚀 已發布！約 1 分鐘後線上網站更新", "is-ok");
  } catch (e) {
    $("#publish-log").hidden = false;
    $("#publish-log").textContent = "發布失敗：" + e.message;
    setStatus("發布失敗", "is-err");
  } finally {
    goBtn.disabled = false;
  }
});

// ---------------- boot ----------------

(async () => {
  try {
    site = await api("/api/data");
    renderTexts();
    renderProjects();
    renderPhotos();
    const st = await api("/api/git-status");
    $("#git-branch").textContent = `branch: ${st.branch}`;
  } catch {
    $("#offline").hidden = false;
    ["btn-save", "btn-publish", "btn-preview"].forEach((id) => ($("#" + id).disabled = true));
  }
})();
