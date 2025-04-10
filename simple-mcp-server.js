#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/dist/esm/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/dist/esm/server/stdio.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// 確保API金鑰存在
const API_KEY = process.env.MCP_API_KEY;
if (!API_KEY) {
  console.error('錯誤: 缺少MCP_API_KEY環境變數');
  process.exit(1);
}

// 主要API伺服器的URL
const API_URL = `http://localhost:${process.env.PORT || 3001}`;

// 創建MCP伺服器
const server = new Server(
  {
    name: 'rental-data-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 列出可用工具
server.setRequestHandler('list_tools', async () => {
  return {
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
  };
});

// 處理工具調用
server.setRequestHandler('call_tool', async (request) => {
  if (request.params.name !== 'query_estates') {
    throw new Error(`未知的工具: ${request.params.name}`);
  }

  try {
    const response = await axios.get(`${API_URL}/estates`, {
      headers: {
        'X-API-KEY': API_KEY
      },
      params: request.params.arguments || {}
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }
      ]
    };
  } catch (error) {
    console.error('API請求錯誤:', error.message);
    
    return {
      content: [
        {
          type: 'text',
          text: `查詢錯誤: ${error.response?.data?.message || error.message}`
        }
      ],
      isError: true
    };
  }
});

// 錯誤處理
server.onerror = (error) => {
  console.error('[MCP錯誤]', error);
};

// 啟動伺服器
async function run() {
  try {
    // 檢查主API伺服器是否運行中
    await axios.get(`${API_URL}/health`);
    console.error('主API伺服器運行中');
    
    // 使用標準輸入/輸出作為傳輸層
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('MCP伺服器已啟動並使用標準輸入/輸出通信');
  } catch (error) {
    console.error('無法連接到主API伺服器:', error.message);
    process.exit(1);
  }
}

// 處理進程信號
process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});

// 啟動伺服器
run().catch(console.error);
