const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.MCP_WRAPPER_PORT || 4000;

// 啟用CORS
app.use(cors());

// 解析JSON
app.use(express.json());

// 健康檢查端點
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 驗證查詢參數
const validateQueryParams = (params) => {
  const errors = [];
  
  if (params.city && typeof params.city !== 'string') {
    errors.push('city 必須是字串');
  }
  
  if (params.limit !== undefined) {
    const limit = Number(params.limit);
    if (isNaN(limit) || limit <= 0) {
      errors.push('limit 必須是正數');
    }
  }
  
  if (params.page !== undefined) {
    const page = Number(params.page);
    if (isNaN(page) || page <= 0) {
      errors.push('page 必須是正數');
    }
  }
  
  return errors;
};

// MCP工具：查詢房地產資料
app.post('/tools/query_estates', async (req, res) => {
  const { arguments: args } = req.body;
  const params = args || {};

  // 驗證參數
  const validationErrors = validateQueryParams(params);
  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      error: '參數驗證失敗',
      details: validationErrors
    });
  }

  try {
    const apiKey = process.env.MCP_API_KEY;
    if (!apiKey) {
      throw new Error('缺少API金鑰設定');
    }

    const response = await axios.get('http://localhost:3001/estates', {
      headers: {
        'X-API-KEY': apiKey
      },
      params
    });
    res.json({
      success: true,
      result: response.data
    });
  } catch (error) {
    console.error('MCP wrapper error:', error.message, {
      path: '/tools/query_estates',
      params: JSON.stringify(params),
      timestamp: new Date().toISOString()
    });
    
    // 根據錯誤類型返回適當的狀態碼
    const status = error.response?.status || 500;
    res.status(status).json({
      success: false,
      error: error.message,
      details: error.response?.data || '伺服器內部錯誤'
    });
  }
});

// MCP工具列表
app.get('/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'query_estates',
        description: '查詢房地產資料',
        inputSchema: {
          type: 'object',
          properties: {
            city: { 
              type: 'string',
              description: '城市名稱，例如：台北市、新北市'
            },
            limit: { 
              type: 'number',
              description: '每頁結果數量，預設為10',
              default: 10
            },
            page: { 
              type: 'number',
              description: '頁碼，從1開始，預設為1',
              default: 1
            }
          }
        }
      }
    ]
  });
});

// 錯誤處理中介層
app.use((err, req, res, next) => {
  console.error('未處理的錯誤:', err.stack);
  res.status(500).json({
    success: false,
    error: '伺服器內部錯誤',
    message: err.message
  });
});

app.listen(port, () => {
  console.log(`MCP wrapper server running at http://localhost:${port}`);
});

// 處理未捕獲的異常
process.on('uncaughtException', (err) => {
  console.error('未捕獲的異常:', err);
  // 在生產環境中，可能需要通知管理員或重啟服務
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未處理的Promise拒絕:', reason);
});
