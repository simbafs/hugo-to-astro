# 🛠 Markdown 批次處理與資源複製腳本

這是一個用於批次轉換 Markdown 檔案 Frontmatter 與複製相關資源的 Node.js 腳本。主要支援將內容從指定資料夾中擷取並轉換，再輸出至安全命名的目錄中。

---

## 📦 功能說明

- 自動產生 Markdown 處理任務（task）
- 支援 YAML Frontmatter 格式轉換
- 自動處理目錄命名與資源複製（圖片、PDF 等非 `.md` 檔）
- 支援 slugify 輸出資料夾名稱，避免衝突或無效名稱

---

## 🚀 使用方式

### 1️⃣ 產生任務清單

將掃描 `articles/` 中的 `.md` 檔案（不含 `_index.md`），並產生 `tasks.json`。

```bash
node index.mjs
```

### 2️⃣ 執行轉換任務

依照 `tasks.json` 對應設定處理 Markdown 檔案與資源：

```bash
node index.mjs --run
```

---

## ⚙️ 可用參數

| 參數       | 說明                       | 預設值     |
| ---------- | -------------------------- | ---------- |
| `--input`  | 指定 Markdown 檔來源資料夾 | `articles` |
| `--output` | 指定輸出資料夾路徑         | `output`   |
| `--run`    | 執行轉換任務               | 無         |

---

## 🧠 Frontmatter 轉換邏輯

```js
{
  title: '原始標題',
  publishDate: '從原始 date 擷取日期部分',
  description: '',
  tags: ['合併 tags 和 categories'],
  legacy: true
}
```

> `categories` 會在轉換時將其最後一個元素移除（資料清理用途）。

你應該根據你自己的需求自行修改 `transformFrontmatter()` 函式。

---

## 🔒 Slugify 命名規則

輸出目錄名稱將根據 `slug` 或 Markdown 所在資料夾自動產生安全的英文檔名，避免中文或特殊字元問題，且避免與 `output` 衝突。

---

## 📌 備註

- 若無 `slug`，會自動 fallback 使用資料夾名稱
- 若轉換結果無法產出合法目錄名，將使用亂數生成 `untitled-xxxxxx` 為備用名稱

---

## ✍️ 製作說明

本專案的 `README` 及 `index.mjs` 程式由人類指導 ChatGPT 共同生成。
