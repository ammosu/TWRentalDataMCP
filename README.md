# 台灣租屋資料 MCP 專案

本專案為基於 Model Context Protocol (MCP) 的租屋資料查詢伺服器，提供房地產資料的 API 與 MCP 工具，方便整合至 AI 助理或其他應用。

---

## 專案結構

- `rental-data-mcp-server/`  
  主要 MCP 伺服器，使用 TypeScript 開發，提供租屋資料查詢功能。

- `.env`  
  環境變數設定檔，**請勿推送至 Git**。

- `.gitignore`  
  忽略敏感與不必要檔案。

---

## 安裝與建置

進入 `rental-data-mcp-server` 目錄：

```bash
cd rental-data-mcp-server
npm install
npm run build
```

---

## 啟動 MCP 伺服器

```bash
cd rental-data-mcp-server
node build/index.js
```

或使用 package script：

```bash
npm start
---

## 授權

MIT License