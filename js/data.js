// ===================================================================
// Site data — projects & photography.
// Edit this file to add/remove work; no other code changes needed.
// ===================================================================
const IMG = "assets/images/";
const VID = "assets/video/";

export const PROJECTS = [
  {
    id: "planet",
    num: "01",
    kicker: "PROJECT 01 — APP UI/UX",
    title: "PlanET 星球計畫",
    desc: "Carbon-footprint app — UI/UX",
    cardDesc: "A carbon-footprint companion app — track, exchange, and green your daily commute.",
    detail:
      "PlanET 星球計畫是一款碳足跡追蹤 App — 記錄日常通勤與消費的碳排放，透過綠色行動累積點數並兌換獎勵，讓減碳變成一場遊戲。負責完整 UI/UX：從研究、資訊架構、Wireframe 到高保真介面與設計系統。",
    img: IMG + "planet/cover.jpg",
    tags: ["UI/UX", "Figma", "App"],
    gallery: [1, 4, 9, 13, 21, 30, 40, 50].map((n) => IMG + "planet/" + n + ".webp"),
    videos: [],
  },
  {
    id: "goahand",
    num: "02",
    kicker: "PROJECT 02 — APP UI/UX + MOTION",
    title: "GoAhand",
    desc: "Barrier-free navigation — UI/UX + motion",
    cardDesc: "Barrier-free navigation app — anyone can bravely go ahead. 無障礙導航.",
    detail:
      "GoAhand 是一款無障礙導航 App — 為輪椅使用者與行動不便者規劃可通行的路線，回報並避開障礙點，讓每個人都能勇敢地向前走（go ahead）。包含 UI/UX 設計與互動動態示範。",
    img: IMG + "goahand/frame-226.webp",
    tags: ["UI/UX", "Motion", "App"],
    gallery: [IMG + "goahand/frame-226.webp", IMG + "goahand/frame-228.webp"],
    videos: [2, 5, 10].map((n) => VID + n + ".mp4"),
  },
  {
    id: "drop",
    num: "03",
    kicker: "PROJECT 03 — BRAND IDENTITY",
    title: "Drop Coffee",
    desc: "Brand identity — VI",
    cardDesc: "Visual identity for a slow-drip coffee brand.",
    detail:
      "Drop 是一個手沖慢滴咖啡品牌的視覺識別 — 以一滴咖啡為核心符號，延伸至標準字、包裝、杯身與店面應用，傳達「慢下來，等一杯好咖啡」的品牌態度。",
    img: IMG + "vi/drop/drop-1.jpg",
    tags: ["Branding", "VI"],
    gallery: [2, 4, 7, 10, 13, 16, 19, 22].map((n) => IMG + "vi/drop/drop-" + n + ".jpg"),
    videos: [],
  },
  {
    id: "hometrust",
    num: "04",
    kicker: "PROJECT 04 — BRAND IDENTITY",
    title: "HomeTrust 嘉信驗屋",
    desc: "Brand identity — VI",
    cardDesc: "Calligraphic identity for a home-inspection company.",
    detail:
      "嘉信驗屋的品牌識別 — 以書法筆觸結合房屋輪廓，傳達「嘉」與「信」的專業與信任感，延伸至名片、制服、報告書與車體等應用。",
    img: IMG + "vi/hometrust/vi.jpg",
    tags: ["Branding", "VI"],
    gallery: [1, 2, 3, 4, 5, 6].map((n) => IMG + "vi/hometrust/vi-" + n + "-0.jpg"),
    videos: [],
  },
  {
    id: "maple",
    num: "05",
    kicker: "PROJECT 05 — BRAND IDENTITY",
    title: "Maple 楓茶米社區",
    desc: "Community brand — VI",
    cardDesc: "Community brand for a rural tea-and-rice village.",
    detail:
      "楓茶米社區品牌 — 為一個以楓樹、茶園與稻米聞名的農村社區打造識別系統，將三種在地物產融入標誌與插畫，應用於包裝、指標與活動視覺。",
    img: IMG + "vi/maple/vi2.jpg",
    tags: ["Branding", "VI"],
    gallery: ["02", "04", "05", "07", "09", "11"].map((n) => IMG + "vi/maple/vi2-" + n + ".jpg"),
    videos: [],
  },
  {
    id: "web",
    num: "06",
    kicker: "PROJECT 06 — WEB",
    title: "Web Design",
    desc: "Selected interactive web works",
    cardDesc: "Selected interactive web works — designed and hand-coded.",
    detail:
      "精選網頁作品 — 從設計到前端實作皆由自己完成，練習將視覺、互動與程式整合成完整的網頁體驗。",
    img: IMG + "other/web1.webp",
    tags: ["Web", "HTML/CSS/JS"],
    gallery: [IMG + "other/web1.webp", IMG + "other/web2.jpg", IMG + "other/web3.webp"],
    videos: [],
  },
];

// full photo-viewer gallery: first + 1..30
export const PHOTOS = ["first", ...Array.from({ length: 30 }, (_, i) => String(i + 1))].map(
  (n) => IMG + "photo/" + n + ".jpg"
);

// subset shown in the home filmstrip
export const FILMSTRIP = ["first", "2", "3", "5", "7", "9", "11", "12", "15", "18", "20", "22", "25", "27", "30"].map(
  (n) => IMG + "photo/" + n + ".jpg"
);
