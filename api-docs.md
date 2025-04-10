# MCP 房地產API使用文件

## 概述

本API提供了房地產資料的查詢、新增、修改和刪除功能。所有請求都需要通過API金鑰進行認證。

## 認證

所有API請求都需要在HTTP Header中包含一個有效的API金鑰：

```
X-API-KEY: your_api_key_here
```

## API金鑰權限級別

API金鑰可以具有以下權限：

- `read`: 允許讀取房地產資料
- `write`: 允許新增和修改房地產資料
- `admin`: 允許刪除房地產資料和管理API金鑰

## 端點

### 1. 查詢所有房地產資料

```
GET /api/estates
```

**查詢參數：**

- `type` (可選): 房產類型，例如 "apartment"、"house"、"commercial"
- `city` (可選): 城市名稱
- `minPrice` (可選): 最低價格
- `maxPrice` (可選): 最高價格
- `limit` (可選): 每頁顯示數量，默認為10
- `page` (可選): 頁碼，默認為1

**請求範例：**

```
GET /api/estates?type=apartment&city=台北&minPrice=5000000&maxPrice=10000000&limit=20&page=1
```

**成功響應：**

```json
{
  "data": [
    {
      "propertyId": "P123456",
      "address": {
        "street": "忠孝東路100號",
        "city": "台北",
        "state": "台北市",
        "zipCode": "10646",
        "country": "台灣"
      },
      "type": "apartment",
      "price": 8500000,
      "size": 85,
      "bedrooms": 3,
      "bathrooms": 2,
      "features": ["電梯", "保全", "停車場"],
      "availableFor": "sale",
      "status": "available",
      "createdAt": "2023-01-15T08:30:00.000Z",
      "updatedAt": "2023-01-15T08:30:00.000Z"
    },
    // ... 更多房產資料
  ],
  "pagination": {
    "total": 157,
    "page": 1,
    "limit": 20,
    "pages": 8
  }
}
```

### 2. 根據ID查詢房地產資料

```
GET /api/estates/:id
```

**路徑參數：**

- `id`: 房產ID (propertyId)

**請求範例：**

```
GET /api/estates/P123456
```

**成功響應：**

```json
{
  "propertyId": "P123456",
  "address": {
    "street": "忠孝東路100號",
    "city": "台北",
    "state": "台北市",
    "zipCode": "10646",
    "country": "台灣"
  },
  "type": "apartment",
  "price": 8500000,
  "size": 85,
  "bedrooms": 3,
  "bathrooms": 2,
  "features": ["電梯", "保全", "停車場"],
  "availableFor": "sale",
  "status": "available",
  "createdAt": "2023-01-15T08:30:00.000Z",
  "updatedAt": "2023-01-15T08:30:00.000Z"
}
```

### 3. 新增房地產資料

```
POST /api/estates
```

**請求 Body：**

```json
{
  "propertyId": "P654321",
  "address": {
    "street": "信義路50號",
    "city": "台北",
    "state": "台北市",
    "zipCode": "11049",
    "country": "台灣"
  },
  "type": "commercial",
  "price": 15000000,
  "size": 120,
  "bedrooms": 0,
  "bathrooms": 1,
  "features": ["電梯", "中央空調", "保全", "停車場"],
  "availableFor": "rent",
  "status": "available"
}
```

**成功響應：**

```json
{
  "propertyId": "P654321",
  "address": {
    "street": "信義路50號",
    "city": "台北",
    "state": "台北市",
    "zipCode": "11049",
    "country": "台灣"
  },
  "type": "commercial",
  "price": 15000000,
  "size": 120,
  "bedrooms": 0,
  "bathrooms": 1,
  "features": ["電梯", "中央空調", "保全", "停車場"],
  "availableFor": "rent",
  "status": "available",
  "createdAt": "2023-04-10T09:15:00.000Z",
  "updatedAt": "2023-04-10T09:15:00.000Z"
}
```

### 4. 更新房地產資料

```
PUT /api/estates/:id
```

**路徑參數：**

- `id`: 房產ID (propertyId)

**請求 Body：**

```json
{
  "price": 14500000,
  "status": "pending"
}
```

**成功響應：**

```json
{
  "propertyId": "P654321",
  "address": {
    "street": "信義路50號",
    "city": "台北",
    "state": "台北市",
    "zipCode": "11049",
    "country": "台灣"
  },
  "type": "commercial",
  "price": 14500000,
  "size": 120,
  "bedrooms": 0,
  "bathrooms": 1,
  "features": ["電梯", "中央空調", "保全", "停車場"],
  "availableFor": "rent",
  "status": "pending",
  "createdAt": "2023-04-10T09:15:00.000Z",
  "updatedAt": "2023-04-10T10:20:00.000Z"
}
```

### 5. 刪除房地產資料

```
DELETE /api/estates/:id
```

**路徑參數：**

- `id`: 房產ID (propertyId)

**成功響應：**

```json
{
  "message": "房地產資料已刪除"
}
```

## 錯誤響應

當API請求出現錯誤時，將收到以下格式的響應：

```json
{
  "message": "錯誤描述"
}
```

常見的錯誤HTTP狀態碼：

- `400 Bad Request`: 請求格式錯誤
- `401 Unauthorized`: API金鑰缺失或無效
- `403 Forbidden`: 權限不足
- `404 Not Found`: 資源不存在
- `500 Internal Server Error`: 伺服器內部錯誤

## API使用限制

為保護服務器資源，API有以下使用限制：

- 每15秒最多100個請求
- 超過限制將返回429狀態碼

## 客戶端範例

### JavaScript (Node.js)

```javascript
const axios = require('axios');

const apiKey = 'your_api_key_here';
const baseUrl = 'http://your-server.com/api';

// 查詢所有房地產資料
async function getEstates() {
  try {
    const response = await axios.get(`${baseUrl}/estates`, {
      headers: {
        'X-API-KEY': apiKey
      },
      params: {
        city: '台北',
        limit: 20,
        page: 1
      }
    });
    console.log(response.data);
  } catch (error) {
    console.error('錯誤:', error.response ? error.response.data : error.message);
  }
}

getEstates();
```

### Python

```python
import requests

api_key = 'your_api_key_here'
base_url = 'http://your-server.com/api'

# 查詢所有房地產資料
def get_estates():
    headers = {
        'X-API-KEY': api_key
    }
    params = {
        'city': '台北',
        'limit': 20,
        'page': 1
    }
    response = requests.get(f'{base_url}/estates', headers=headers, params=params)
    
    if response.status_code == 200:
        print(response.json())
    else:
        print(f'錯誤: {response.status_code}', response.json())

get_estates()
```
