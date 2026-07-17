# Angus Liang — Portfolio

個人作品集網站：UI/UX、品牌識別、網頁與攝影。
純靜態 SPA（hash 路由），無框架、無建置步驟即可部署 — SCSS 為唯一需要編譯的部分。

## 專案結構

```
portfolio-site/
├── index.html          # 唯一的 HTML — nav / menu / curtain 靜態外殼
├── data/site.json      # ★ 所有內容（文字、專案、照片）都在這 — 用後台編輯
├── admin/              # 本機後台（npm run admin）：視覺化編輯 + 一鍵發布
├── css/main.css        # 由 SCSS 編譯出的樣式（commit 進 repo）
├── scss/
│   ├── main.scss       # 進入點
│   ├── abstracts/      # _tokens（設計變數）、_mixins（斷點等）
│   ├── base/           # reset、body、smooth scroll、共用 .page
│   ├── layout/         # _nav、_menu（漢堡選單）
│   ├── components/     # _section-label、_tag、_project-card、_curtain
│   └── pages/          # _home、_work、_project、_photo
├── js/
│   ├── app.js          # hash 路由、視圖渲染、curtain 轉場、Lenis、parallax
│   └── lib/lenis.mjs   # self-host 的 smooth scroll 庫
└── assets/
    ├── images/         # 已壓縮成網頁尺寸（最長邊 2000px）
    └── video/          # 示範影片
```

## 後台管理（推薦的內容編輯方式）

```bash
npm install       # 第一次（或換電腦後）執行
npm run admin     # 開啟 http://localhost:5050/admin/
```

後台可以視覺化地：

- 編輯首頁所有文字（hero、about、聯絡方式）、更換照片
- 新增 / 刪除 / 排序專案，編輯專案文字、封面、gallery、影片
- 管理攝影作品（上傳、刪除、排序、選擇哪些出現在首頁照片列）
- 圖片上傳會自動壓縮成網頁尺寸（最長邊 2000px）
- 「儲存」= 寫入本機 `data/site.json`；「發布」= 自動 git commit + push，
  約 1 分鐘後 GitHub Pages 上的網站更新

換電腦時：`git clone` → `npm install` → `npm run admin`，工具跟著 repo 走，
不用重新設定（只有第一次 push 時 git 會要求登入 GitHub 一次）。

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

用後台（`npm run admin`）→「專案」分頁 →「＋ 新增專案」即可；
也可以直接手改 [data/site.json](data/site.json)。

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
