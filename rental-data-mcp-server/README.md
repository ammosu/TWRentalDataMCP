# Rental Data MCP Server

一個基於 Model Context Protocol (MCP) 的伺服器，提供台灣租屋房地產資料的查詢服務。  
支援以 MCP 工具查詢房屋資訊，並以資源 URI 方式存取房屋詳細資料。

## 功能特色

- **房地產資料資源**  
  - 以 `estate://` URI 提供房屋資訊  
  - 包含城市、地址、價格、坪數、聯絡方式等欄位  
  - 支援分頁查詢

- **MCP 工具**  
  - `query_estates`：根據城市、分頁參數查詢租屋資料

- **範例用途**  
  - 整合至 Claude Desktop 或其他支援 MCP 的應用  
  - 作為租屋資料 API 範例
## 架設與運作流程

### 架構說明

本專案包含兩個主要元件：

1. **主 API 伺服器**（如 `server.js`）：負責連接資料庫並提供 RESTful API，需先於本機或遠端伺服器啟動。
2. **MCP Server**（本專案）：作為 Model Context Protocol 標準的中介層，將 REST API 轉換為 MCP 工具，供支援 MCP 的應用程式（如 Claude Desktop、AI 代理人）查詢。

### 典型部署情境

- **伺服器端**：同時啟動主 API server 及 MCP server，兩者可在同一台機器或不同機器上運行。
- **MCP client 端**：需能存取 MCP server 的執行檔（如 `build/index.js`），並於本地或雲端啟動 MCP server，與主 API server 通訊。

### 必要環境變數

請於 `.env` 檔案中設定下列參數：

- `PORT`：主 API server 監聽的 port（預設 3001）
- `PG_HOST`、`PG_PORT`、`PG_USER`、`PG_PASSWORD`、`PG_DATABASE`：PostgreSQL 連線資訊
- `RENTAL_DATA_API_KEY`：MCP server 對主 API server 查詢時使用的 API 金鑰

### 完整啟動步驟

1. **安裝依賴與建置**
   ```bash
   npm install
   npm run build
   ```

2. **啟動主 API server**
   ```bash
   node ../server.js
   ```
   > 請確認主 API server 已正確連線資料庫並啟動於指定 port。

3. **啟動 MCP server**
   ```bash
   node build/index.js
   ```
   > MCP server 啟動後，會自動連線本機或指定的主 API server，並對外提供 MCP 工具。

4. **於 MCP client 端整合**
   - 於設定檔指定 MCP server 執行檔路徑與必要環境變數（如 RENTAL_DATA_API_KEY）。

### 常見問題

- **Q: MCP server 需要在 client 端架設嗎？**
  - A: 只要你想讓某個應用程式能用 MCP 協議查詢房地產資料，就必須在該應用程式所在的機器上啟動 MCP server，並確保有 `build/index.js`。

- **Q: MCP server 與主 API server 可以分開部署嗎？**
  - A: 可以，只要 MCP server 能正確連線到主 API server 即可。

- **Q: MCP server 是否給一般終端用戶（瀏覽器、手機）直接使用？**
  - A: 否，MCP server 是給 AI 代理人、MCP client 或自動化服務用來查詢資料的中介層。

## 安裝與建置
## 安裝與建置

```bash
npm install
npm run build
```

## 開發模式

```bash
npm run watch
```

## 啟動伺服器

```bash
node build/index.js
```

或於 `package.json` 中加入啟動腳本：

```json
"scripts": {
  "start": "node build/index.js"
}
```

## 整合至 Claude Desktop

於設定檔中加入：

```json
{
  "mcpServers": {
    "rental-data-mcp-server": {
      "command": "/path/to/rental-data-mcp-server/build/index.js"
    }
  }
}
```

## 目錄結構

- `src/` TypeScript 原始碼
- `build/` 編譯後 JS 檔案
- `.gitignore` 忽略不必要檔案
- `package.json` 專案設定

## 授權

MIT License
