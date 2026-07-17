# Angus Liang — Portfolio

個人作品集網站：UI/UX、品牌識別、網頁與攝影。
純靜態 SPA（hash 路由），無框架、無建置步驟即可部署 — SCSS 為唯一需要編譯的部分。

## 專案結構

```
portfolio-site/
├── index.html          # 唯一的 HTML — nav / menu / curtain 靜態外殼
├── css/main.css        # 由 SCSS 編譯出的樣式（commit 進 repo）
├── scss/
│   ├── main.scss       # 進入點
│   ├── abstracts/      # _tokens（設計變數）、_mixins（斷點等）
│   ├── base/           # reset、body、共用 .page
│   ├── layout/         # _nav、_menu（漢堡選單）
│   ├── components/     # _section-label、_tag、_project-card、_curtain
│   └── pages/          # _home、_work、_project、_photo
├── js/
│   ├── data.js         # ★ 所有專案 / 攝影資料都在這裡 — 新增作品改這個檔
│   └── app.js          # hash 路由、視圖渲染、curtain 轉場、photo viewer
└── assets/
    ├── images/         # 已壓縮成網頁尺寸（最長邊 2000px）
    └── video/          # 示範影片
```

## 路由

| URL | 頁面 |
|-----|------|
| `#/` | 首頁（hero、精選作品、攝影、about、contact） |
| `#/work` | 作品總覽（卡片格） |
| `#/project/<id>` | 專案內頁（planet / goahand / drop / hometrust / maple / web） |
| `#/photo` | 全螢幕攝影瀏覽器（← → 鍵盤、點擊左右換頁） |

## 本機開發

```bash
npm install          # 只有 sass 一個 devDependency
npm run watch:css    # 監看 scss/ 並自動編譯
npm run serve        # http://localhost:8080
```

修改樣式後執行 `npm run build:css` 產出壓縮版 `css/main.css`（記得 commit）。

## 新增作品

編輯 [js/data.js](js/data.js)：在 `PROJECTS` 陣列加一筆物件（id、title、img、gallery…），
圖片放進 `assets/images/`，其他程式碼不用動。

## 部署到 GitHub Pages

```bash
git init
git add .
git commit -m "portfolio site"
git branch -M main
git remote add origin https://github.com/Phnagi/<repo-name>.git
git push -u origin main
```

然後到 GitHub repo → **Settings → Pages → Source** 選 `main` branch（root）。
幾分鐘後網站就會出現在 `https://phnagi.github.io/<repo-name>/`。

> `.nojekyll` 已附上，確保 GitHub Pages 不會用 Jekyll 處理（避免底線開頭的檔案被略過）。
