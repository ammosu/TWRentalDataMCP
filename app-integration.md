# MCP系統開發與整合指南

## 系統架構概述

MCP (Master Control Program) 房地產資料系統是一個專為連接私人資料庫並提供API認證的系統，它包含以下幾個關鍵元件：

1. **MCP伺服器**：核心後端系統，連接資料庫並提供API服務
2. **API金鑰認證系統**：管理用戶訪問權限
3. **房地產資料庫**：存儲所有房地產相關數據
4. **管理介面**：用於管理用戶和API金鑰
5. **客戶端SDK**：便於第三方應用整合的工具包

## 部署步驟

### 1. 環境準備

#### 系統需求：
- Node.js (v14.0.0 或更高版本)
- MongoDB (v4.4 或更高版本)
- npm 或 yarn

#### 安裝依賴：
```bash
# 創建專案目錄
mkdir mcp-estate-api
cd mcp-estate-api

# 初始化 npm 專案
npm init -y

# 安裝所需套件
npm install express mongoose dotenv jsonwebtoken bcryptjs cors helmet morgan uuid rate-limiter-flexible winston
```

### 2. 目錄結構設置

建立以下目錄結構：

```
mcp-estate-api/
├── config/             # 配置文件
│   ├── db.js           # 資料庫配置
│   └── logger.js       # 日誌配置
├── controllers/        # 控制器
│   ├── estate.js       # 房地產資料控制器
│   ├── auth.js         # 認證控制器
│   └── admin.js        # 管理控制器
├── middleware/         # 中間件
│   ├── auth.js         # 認證中間件
│   ├── error.js        # 錯誤處理中間件
│   └── rateLimiter.js  # 請求限制中間件
├── models/             # 數據模型
│   ├── User.js         # 用戶模型
│   ├── ApiKey.js       # API金鑰模型
│   └── Estate.js       # 房地產模型
├── routes/             # 路由
│   ├── estates.js      # 房地產路由
│   ├── admin.js        # 管理路由
│   └── auth.js         # 認證路由
├── utils/              # 通用工具
│   ├── apiKeyGenerator.js # API金鑰生成器
│   └── responseFormatter.js # 響應格式化工具
├── .env                # 環境變數
├── app.js              # 應用入口
└── package.json        # 項目依賴
```

### 3. 設置環境變數

創建 `.env` 文件，根據之前提供的模板配置環境變數。

### 4. 實現資料庫模型

按照之前提供的代碼，實現 User、ApiKey 和 Estate 資料模型。

### 5. 實現API路由和控制器

按照之前提供的代碼，實現以下功能：
- API金鑰認證中間件
- 房地產資料CRUD操作
- 管理員API路由

### 6. 啟動應用

在 `app.js` 中綁定路由並啟動服務器：

```javascript
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');

// 引入路由
const estateRoutes = require('./routes/estates');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');

// 引入中間件
const errorHandler = require('./middleware/error');
const rateLimiter = require('./middleware/rateLimiter');

// 加載環境變數
dotenv.config();

// 連接資料庫
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB連接成功'))
.catch(err => console.error('MongoDB連接失敗:', err));

// 初始化Express應用
const app = express();

// 安全設置
app.use(helmet());

// CORS設置
app.use(cors());

// 請求日誌
app.use(morgan('dev'));

// 請求限制
app.use(rateLimiter);

// 解析JSON請求體
app.use(express.json());

// 路由
app.use('/api/estates', estateRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);

// 錯誤處理
app.use(errorHandler);

// 啟動服務器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服務器運行在端口 ${PORT}`);
});
```

## 使用客戶端SDK

### JavaScript SDK

在前端或Node.js應用中使用提供的JavaScript SDK：

```javascript
// 引入SDK
const McpApiClient = require('./path/to/client-sdk');

// 初始化客戶端
const client = new McpApiClient('http://your-api-server.com/api', 'your-api-key');

// 使用客戶端查詢房地產資料
async function searchEstates() {
  try {
    const results = await client.searchEstates({
      city: '台北',
      minPrice: 5000000,
      maxPrice: 10000000
    });
    console.log('搜索結果:', results);
  } catch (error) {
    console.error('搜索失敗:', error);
  }
}

searchEstates();
```

### Python SDK

在Python應用中使用提供的Python SDK：

```python
# 引入SDK
from client_sdk_python import McpApiClient

# 初始化客戶端
client = McpApiClient('http://your-api-server.com/api', 'your-api-key')

# 使用客戶端查詢房地產資料
try:
    results = client.search_estates({
        'city': '台北',
        'minPrice': 5000000,
        'maxPrice': 10000000
    })
    print('搜索結果:', results)
except Exception as e:
    print('搜索失敗:', e)
```

## 安全性考量

1. **API金鑰安全**：
   - 不要在公開的代碼庫中提交API金鑰
   - 定期輪換API金鑰
   - 設置適當的過期時間

2. **權限控制**：
   - 最小權限原則：僅授予用戶所需的最小權限
   - 定期審查用戶權限

3. **數據傳輸安全**：
   - 在生產環境中使用HTTPS
   - 考慮使用API響應簽名機制

4. **請求限流**：
   - 已實現基本的請求限流機制
   - 可根據不同用戶設置不同的限制

## 監控與日誌

1. **API使用監控**：
   - 記錄每個API金鑰的使用情況
   - 設置異常使用量警報

2. **錯誤日誌**：
   - 使用Winston等工具進行日誌記錄
   - 對關鍵錯誤設置通知機制

## 擴展建議

1. **數據緩存**：
   - 實現Redis緩存以提高常用查詢的性能

2. **搜索功能增強**：
   - 整合Elasticsearch以實現更強大的全文搜索功能

3. **批量操作**：
   - 實現批量查詢和更新API

4. **Web hook**：
   - 實現事件通知機制，當資料變更時通知訂閱者

## 常見問題排解

1. **連接問題**：
   - 檢查網絡連接和防火牆設置
   - 驗證API服務器URL是否正確

2. **認證錯誤**：
   - 確認API金鑰是否有效且未過期
   - 檢查API金鑰是否有足夠的權限

3. **資料格式錯誤**：
   - 查看API文檔中的資料格式要求
   - 確保日期和數字格式正確

## 升級與維護

1. **版本控制**：
   - 對API進行版本控制，如`/api/v1/estates`
   - 提前通知用戶API變更

2. **定期維護**：
   - 定期備份資料庫
   - 更新依賴套件以修復安全漏洞

3. **性能監控**：
   - 監控API響應時間
   - 識別並優化慢查詢
