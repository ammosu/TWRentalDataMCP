#!/usr/bin/env node

/**
 * This is a rental data MCP server that provides access to real estate data.
 * It implements MCP tools to query real estate data from a REST API.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// API configuration
const API_KEY = process.env.MCP_API_KEY || "test-api-key-123456";
const API_URL = `http://localhost:${process.env.PORT || 3001}`;

/**
 * Create an MCP server with capabilities for tools to query real estate data.
 */
const server = new Server(
  {
    name: "rental-data-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Handler that lists available tools.
 * Exposes a "query_estates" tool that lets clients query real estate data.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "query_estates",
        description: "查詢房地產資料",
        inputSchema: {
          type: "object",
          properties: {
            city: {
              type: "string",
              description: "城市名稱，例如：台北市、新北市"
            },
            limit: {
              type: "number",
              description: "每頁結果數量，預設為10",
              default: 10
            },
            page: {
              type: "number",
              description: "頁碼，從1開始，預設為1",
              default: 1
            }
          }
        }
      }
    ]
  };
});

/**
 * Handler for the query_estates tool.
 * Queries real estate data from the API and returns the results.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "query_estates") {
    throw new Error("Unknown tool");
  }

  try {
    // Check if the main API server is running
    try {
      await axios.get(`${API_URL}/health`);
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: "主API伺服器未運行，請先啟動伺服器。"
          }
        ],
        isError: true
      };
    }

    // Query the API
    const response = await axios.get(`${API_URL}/estates`, {
      headers: {
        "X-API-KEY": API_KEY
      },
      params: request.params.arguments || {}
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2)
        }
      ]
    };
  } catch (error: any) {
    console.error("API請求錯誤:", error.message);
    
    return {
      content: [
        {
          type: "text",
          text: `查詢錯誤: ${error.response?.data?.message || error.message}`
        }
      ],
      isError: true
    };
  }
});

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP伺服器已啟動並使用標準輸入/輸出通信");
  } catch (error: any) {
    console.error("伺服器錯誤:", error);
    process.exit(1);
  }
}

// Handle process signals
process.on("SIGINT", async () => {
  console.error("正在關閉伺服器...");
  process.exit(0);
});

// Start the server
main().catch((error: any) => {
  console.error("伺服器錯誤:", error);
  process.exit(1);
});
