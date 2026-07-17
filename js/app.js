// ===================================================================
// App — hash-routed single-page portfolio.
// Routes: #/  #/work  #/photo  #/project/<id>
// All content lives in data/site.json (edited via `npm run admin`).
// ===================================================================
import Lenis from "./lib/lenis.mjs";

const app = document.getElementById("app");
const nav = document.getElementById("nav");
const menu = document.getElementById("menu");
const curtain = document.getElementById("curtain");

const CURTAIN_SWAP = 480; // content swaps while fully covered
const CURTAIN_END = 960;

// site content, loaded from data/site.json at boot
let SITE = null;
let PROJECTS = [];
let PHOTOS = [];
let FILMSTRIP = [];

let currentRoute = null;
let transitioning = false;
let photoIndex = parseInt(localStorage.getItem("portfolio-photo") || "0", 10) || 0;

// smooth scroll (Lenis) — page instance + per-render filmstrip instance
let lenis;
let stripLenis;

// hero parallax layers (re-cached each home render; null elsewhere)
let heroBg = null;
let heroContent = null;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------------- data ----------------

async function loadData() {
  const res = await fetch("data/site.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`data/site.json → HTTP ${res.status}`);
  SITE = await res.json();
  PROJECTS = SITE.projects.map((p, i) => ({ ...p, num: pad(i + 1) }));
  PHOTOS = SITE.photos.map((p) => p.src);
  FILMSTRIP = SITE.photos.filter((p) => p.filmstrip).map((p) => p.src);
  const footer = document.querySelector(".menu__footer");
  if (footer && SITE.contact.footerNote) footer.textContent = SITE.contact.footerNote;
}

// ---------------- helpers ----------------

const pad = (n) => String(n).padStart(2, "0");

function parseRoute() {
  const hash = location.hash.replace(/^#\/?/, "");
  if (hash.startsWith("project/")) {
    const id = hash.slice(8);
    if (PROJECTS.some((p) => p.id === id)) return { view: "project", id };
    return { view: "home" };
  }
  if (hash === "work" || hash === "photo") return { view: hash };
  return { view: "home" };
}

function routeLabel(route) {
  if (route.view === "work") return "WORK";
  if (route.view === "photo") return "PHOTO";
  if (route.view === "project") {
    const p = PROJECTS.find((p) => p.id === route.id);
    return p ? p.title : "PROJECT";
  }
  return "HOME";
}

const tags = (list) => list.map((t) => `<span class="tag">${t}</span>`).join("");

const sectionLabel = (index, text) => `
  <div class="section-label">
    ${index != null ? `<span class="section-label__num">${pad(index)}</span>` : ""}
    <span class="section-label__rule"></span>${text}
  </div>`;

// ---------------- views ----------------

function homeView() {
  const rows = PROJECTS.map(
    (p) => `
    <a class="work-index__row" href="#/project/${p.id}">
      <span class="work-index__num">${p.num}</span>
      <span class="work-index__title">${p.title}</span>
      <span class="work-index__desc">${p.desc}</span>
      <img class="work-index__thumb" src="${p.img}" alt="${p.title}" loading="lazy">
    </a>`
  ).join("");

  const strip = FILMSTRIP.map((src) => `<img src="${src}" alt="photography" loading="lazy">`).join("");
  const heroGradient =
    "linear-gradient(to bottom, oklch(9% 0.002 90 / 0.3), oklch(9% 0.002 90 / 0.05) 40%, oklch(9% 0.002 90 / 0.8))";
  const contactLinks = SITE.contact.links
    .map((l) => {
      const ext = l.url.startsWith("http") ? ` target="_blank" rel="noopener"` : "";
      return `<a href="${l.url}"${ext}>${l.label}</a>`;
    })
    .join(" ·\n        ");

  return `
  <!-- hero -->
  <header class="hero">
    <div class="hero__bg" style="background-image:${heroGradient}, url('${SITE.hero.image}')"></div>
    <div class="hero__content">
      <div class="hero__kicker">${SITE.hero.kicker}</div>
      <h1 class="hero__title">${SITE.hero.title}<span class="dot">.</span></h1>
      <div class="hero__row">
        <p class="hero__intro">${SITE.hero.intro}</p>
        <div class="hero__scroll">SCROLL ↓</div>
      </div>
    </div>
  </header>

  <!-- 01 selected work -->
  <section class="section work-index">
    ${sectionLabel(1, "SELECTED WORK")}
    <div class="section__head">
      <h2 class="section__title">Selected projects<span class="dot">.</span></h2>
      <a class="section__link" href="#/work">VIEW ALL ↗</a>
    </div>
    ${rows}
    <div class="work-index__rule"></div>
  </section>

  <!-- 02 photography filmstrip -->
  <section class="filmstrip" id="photo">
    <div class="filmstrip__head">
      <div>
        ${sectionLabel(2, "PHOTOGRAPHY — 攝影")}
        <h2 class="filmstrip__title">Through my lens<span class="dot">.</span></h2>
      </div>
      <div class="filmstrip__hint">DRAG / SCROLL →</div>
    </div>
    <div class="filmstrip__track"><div class="filmstrip__inner">${strip}</div></div>
  </section>

  <!-- 03 about -->
  <section class="about" id="about">
    <img class="about__portrait" src="${SITE.about.portrait}" alt="${SITE.hero.title}">
    <div>
      ${sectionLabel(3, "ABOUT")}
      <h2 class="about__title">${SITE.about.title}</h2>
      ${SITE.about.paragraphs.map((t) => `<p class="about__text">${t}</p>`).join("\n      ")}
      <div class="about__tags">${tags(SITE.about.tags)}</div>
    </div>
  </section>

  <!-- contact -->
  <footer class="contact" id="contact">
    <div>
      ${sectionLabel(4, "CONTACT")}
      <h2 class="contact__title">Say hello<span class="dot">.</span></h2>
      <div class="contact__links">
        ${contactLinks}
      </div>
    </div>
    <div class="contact__copy">${SITE.contact.copyright}</div>
  </footer>`;
}

function workView() {
  const cards = PROJECTS.map(
    (p) => `
    <a class="project-card" href="#/project/${p.id}">
      <div class="project-card__media"><img src="${p.img}" alt="${p.title}" loading="lazy"></div>
      <h3 class="project-card__title">${p.title}</h3>
      <p class="project-card__desc">${p.cardDesc}</p>
      <div class="project-card__tags">${tags(p.tags)}</div>
    </a>`
  ).join("");

  return `
  <div class="page work-page">
    ${sectionLabel(1, "WORK")}
    <h1 class="work-page__title">Selected projects<span class="dot">.</span></h1>
    <div class="work-page__grid">${cards}</div>
    <div class="work-page__footer">
      <a href="#/">← BACK TO HOME</a>
      <span>${SITE.contact.copyright}</span>
    </div>
  </div>`;
}

function projectView(id) {
  const i = PROJECTS.findIndex((p) => p.id === id);
  const p = PROJECTS[i];
  const prev = PROJECTS[(i - 1 + PROJECTS.length) % PROJECTS.length];
  const next = PROJECTS[(i + 1) % PROJECTS.length];

  const videos = p.videos.length
    ? `
    <section class="project__section">
      ${sectionLabel(1, "DEMO — 示範影片")}
      <div class="project__videos">
        ${p.videos.map((v) => `<video src="${v}" autoplay loop muted playsinline preload="auto" disablepictureinpicture controlslist="nodownload noplaybackrate"></video>`).join("")}
      </div>
    </section>`
    : "";

  const gallery = p.gallery.map((g) => `<img src="${g}" alt="${p.title}" loading="lazy">`).join("");

  return `
  <article class="page project">
    <div class="project__kicker">${p.kicker}</div>
    <div class="project__head">
      <h1 class="project__title">${p.title}<span class="dot">.</span></h1>
      <div class="project__tags">${tags(p.tags)}</div>
    </div>
    <p class="project__detail">${p.detail}</p>
    <img class="project__hero" src="${p.img}" alt="${p.title}">
    ${videos}
    <section class="project__section">
      ${sectionLabel(2, "SELECTED FRAMES — 精選")}
      <div class="project__gallery">${gallery}</div>
    </section>
    <nav class="project__pager">
      <a class="project__pager-item" href="#/project/${prev.id}">
        <div class="project__pager-dir">← PREVIOUS</div>
        <div class="project__pager-title">${prev.title}</div>
      </a>
      <a class="project__all" href="#/work">ALL WORK</a>
      <a class="project__pager-item project__pager-item--next" href="#/project/${next.id}">
        <div class="project__pager-dir">NEXT →</div>
        <div class="project__pager-title">${next.title}</div>
      </a>
    </nav>
  </article>`;
}

function photoView() {
  const idx = Math.min(photoIndex, PHOTOS.length - 1);
  const src = PHOTOS[idx];
  return `
  <div class="viewer">
    <img class="viewer__backdrop" src="${src}" alt="" aria-hidden="true">
    <div class="viewer__zone viewer__zone--prev" data-step="-1" title="Previous"></div>
    <div class="viewer__zone viewer__zone--next" data-step="1" title="Next"></div>
    <div class="viewer__stage"><img id="viewer-photo" src="${src}" alt="photography"></div>
    <div class="viewer__counter" id="viewer-counter">${pad(idx + 1)} / ${pad(PHOTOS.length)}</div>
    <div class="viewer__chevrons">
      <span data-step="-1">‹</span>
      <span data-step="1">›</span>
    </div>
  </div>`;
}

// ---------------- photo stepping ----------------

function stepPhoto(dir) {
  photoIndex = (photoIndex + dir + PHOTOS.length) % PHOTOS.length;
  localStorage.setItem("portfolio-photo", String(photoIndex));
  const img = document.getElementById("viewer-photo");
  const backdrop = document.querySelector(".viewer__backdrop");
  const counter = document.getElementById("viewer-counter");
  if (img) img.src = PHOTOS[photoIndex];
  if (backdrop) backdrop.src = PHOTOS[photoIndex];
  if (counter) counter.textContent = `${pad(photoIndex + 1)} / ${pad(PHOTOS.length)}`;
}

// ---------------- rendering & transitions ----------------

function render(route) {
  currentRoute = route;
  if (route.view === "work") app.innerHTML = workView();
  else if (route.view === "photo") app.innerHTML = photoView();
  else if (route.view === "project") app.innerHTML = projectView(route.id);
  else app.innerHTML = homeView();

  const label = routeLabel(route);
  document.title = label === "HOME" ? `${SITE.hero.title} — Portfolio` : `${label} — ${SITE.hero.title}`;
  updateNav();
  if (lenis) lenis.scrollTo(0, { immediate: true });
  else window.scrollTo(0, 0);
  setupFilmstrip(); // (re)bind the horizontal smooth-scroll strip
  setupHero(); // (re)cache hero parallax layers

  // kick off muted autoplay for any project videos (some browsers don't
  // honour the autoplay attribute on nodes inserted via innerHTML)
  app.querySelectorAll("video[autoplay]").forEach((v) => {
    const play = () => v.play().catch(() => {});
    v.readyState >= 2 ? play() : v.addEventListener("canplay", play, { once: true });
  });
}

function route(withCurtain) {
  const next = parseRoute();
  if (currentRoute && next.view === currentRoute.view && next.id === currentRoute.id) return;
  closeMenu();

  if (!withCurtain || !currentRoute) {
    render(next);
    return;
  }
  if (transitioning) return;
  transitioning = true;

  curtain.querySelector(".curtain__label").textContent = routeLabel(next);
  curtain.classList.add("is-active");
  setTimeout(() => render(next), CURTAIN_SWAP);
  setTimeout(() => {
    curtain.classList.remove("is-active");
    transitioning = false;
  }, CURTAIN_END);
}

// ---------------- nav / menu ----------------

function updateNav() {
  const isHome = !currentRoute || currentRoute.view === "home";
  const isPhoto = currentRoute && currentRoute.view === "photo";
  const solid = !isPhoto && (!isHome || window.scrollY > 40);
  nav.classList.toggle("is-solid", solid);
}

function scrollToId(id) {
  const go = () => {
    const el = document.getElementById(id);
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -80 });
    else {
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };
  if (currentRoute && currentRoute.view !== "home") {
    // navigate home first, then scroll once the curtain transition has
    // swapped in the home view and reset its scroll position
    location.hash = "#/";
    setTimeout(go, CURTAIN_END + 40);
  } else {
    go();
  }
}

function closeMenu() {
  menu.classList.remove("is-open");
  nav.classList.remove("is-menu-open");
  document.body.classList.remove("is-locked");
}

function toggleMenu() {
  const open = !menu.classList.contains("is-open");
  menu.classList.toggle("is-open", open);
  nav.classList.toggle("is-menu-open", open);
  document.body.classList.toggle("is-locked", open);
}

// ---------------- events ----------------

window.addEventListener("hashchange", () => route(true));
window.addEventListener("scroll", updateNav, { passive: true });

window.addEventListener("keydown", (e) => {
  if (!currentRoute || currentRoute.view !== "photo") return;
  if (e.key === "ArrowRight") stepPhoto(1);
  if (e.key === "ArrowLeft") stepPhoto(-1);
});

// photo viewer click zones / chevrons (delegated — viewer is re-rendered)
app.addEventListener("click", (e) => {
  const step = e.target.closest("[data-step]");
  if (step) stepPhoto(parseInt(step.dataset.step, 10));
});

// nav & menu actions
document.querySelectorAll("[data-scroll]").forEach((el) =>
  el.addEventListener("click", (e) => {
    e.preventDefault();
    closeMenu();
    scrollToId(el.dataset.scroll);
  })
);
document.getElementById("burger").addEventListener("click", toggleMenu);

// ---------------- smooth scroll (Lenis) ----------------

function initSmoothScroll() {
  // page-level vertical smooth scroll. `prevent` hands wheel events over
  // the filmstrip to its own horizontal Lenis instead of scrolling the page.
  lenis = new Lenis({
    duration: 1.05,
    easing: (t) => 1 - Math.pow(1 - t, 3), // easeOutCubic — quick start, soft stop
    smoothWheel: true,
    prevent: (node) => !!(node.closest && node.closest(".filmstrip__track")),
  });
  lenis.on("scroll", ({ scroll }) => {
    updateNav();
    applyHeroParallax(scroll);
  });

  // single rAF loop drives both the page and the filmstrip instances
  function raf(time) {
    lenis.raf(time);
    if (stripLenis) stripLenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
}

// (re)create a horizontal Lenis on the filmstrip after each home render.
// gestureOrientation "both" lets a vertical wheel glide it sideways; the
// page instance's `prevent` keeps it from double-scrolling over the strip.
function setupFilmstrip() {
  if (stripLenis) {
    stripLenis.destroy();
    stripLenis = null;
  }
  const wrapper = document.querySelector(".filmstrip__track");
  const content = wrapper && wrapper.querySelector(".filmstrip__inner");
  if (!wrapper || !content) return;

  stripLenis = new Lenis({
    wrapper,
    content,
    orientation: "horizontal",
    gestureOrientation: "both",
    duration: 0.9,
    easing: (t) => 1 - Math.pow(1 - t, 3),
    smoothWheel: true,
  });
}

// cache the hero's parallax layers after a home render (null on other views)
function setupHero() {
  heroBg = document.querySelector(".hero__bg");
  heroContent = document.querySelector(".hero__content");
  applyHeroParallax(lenis ? lenis.scroll : window.scrollY || 0);
}

// drive the parallax: the background trails at ~0.5× scroll speed while the
// text leads at ~0.8× and fades out — the differing speeds create depth.
function applyHeroParallax(scroll) {
  if (!heroBg || reduceMotion) return;
  const vh = window.innerHeight;
  const s = Math.max(0, Math.min(scroll, vh)); // only while the hero is on screen
  heroBg.style.transform = `translate3d(0, ${s * 0.5}px, 0)`;
  if (heroContent) {
    heroContent.style.transform = `translate3d(0, ${s * 0.2}px, 0)`;
    heroContent.style.opacity = String(Math.max(0, 1 - s / (vh * 0.82)));
  }
}

// ---------------- boot ----------------

loadData()
  .then(() => {
    initSmoothScroll();
    render(parseRoute());
  })
  .catch((err) => {
    app.innerHTML = `<div style="padding:150px 48px;font-family:monospace">⚠ 無法載入網站內容（${err.message}）</div>`;
  });
