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
