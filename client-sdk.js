// MCP API 客戶端SDK (JavaScript)
// 用於簡化API的調用

class McpApiClient {
  /**
   * 建立MCP API客戶端實例
   * @param {string} baseUrl - API伺服器基礎URL
   * @param {string} apiKey - API金鑰
   */
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.apiKey = apiKey;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'X-API-KEY': this.apiKey,
    };
  }

  /**
   * 發送HTTP請求
   * @private
   * @param {string} method - HTTP方法
   * @param {string} endpoint - API端點
   * @param {Object} data - 請求資料
   * @param {Object} params - 查詢參數
   * @returns {Promise<Object>} - API響應
   */
  async _request(method, endpoint, data = null, params = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // 添加查詢參數
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });
    
    const options = {
      method,
      headers: this.defaultHeaders,
    };
    
    // 添加請求體
    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      options.body = JSON.stringify(data);
    }
    
    try {
      const response = await fetch(url.toString(), options);
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || `請求失敗: ${response.status}`);
      }
      
      return responseData;
    } catch (error) {
      console.error(`API請求錯誤 (${method} ${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * 獲取所有房地產資料
   * @param {Object} params - 查詢參數
   * @param {string} params.type - 房產類型
   * @param {string} params.city - 城市
   * @param {number} params.minPrice - 最低價格
   * @param {number} params.maxPrice - 最高價格
   * @param {number} params.limit - 每頁數量
   * @param {number} params.page - 頁碼
   * @returns {Promise<Object>} - 房地產資料列表
   */
  async getAllEstates(params = {}) {
    return this._request('GET', '/estates', null, params);
  }

  /**
   * 根據ID獲取房地產資料
   * @param {string} id - 房產ID
   * @returns {Promise<Object>} - 房地產資料
   */
  async getEstateById(id) {
    return this._request('GET', `/estates/${id}`);
  }

  /**
   * 創建新的房地產資料
   * @param {Object} estateData - 房地產資料
   * @returns {Promise<Object>} - 創建的房地產資料
   */
  async createEstate(estateData) {
    return this._request('POST', '/estates', estateData);
  }

  /**
   * 更新房地產資料
   * @param {string} id - 房產ID
   * @param {Object} estateData - 更新的房地產資料
   * @returns {Promise<Object>} - 更新後的房地產資料
   */
  async updateEstate(id, estateData) {
    return this._request('PUT', `/estates/${id}`, estateData);
  }

  /**
   * 刪除房地產資料
   * @param {string} id - 房產ID
   * @returns {Promise<Object>} - 刪除結果
   */
  async deleteEstate(id) {
    return this._request('DELETE', `/estates/${id}`);
  }

  /**
   * 搜索房地產資料
   * @param {Object} searchParams - 搜索參數
   * @returns {Promise<Object>} - 搜索結果
   */
  async searchEstates(searchParams) {
    return this.getAllEstates(searchParams);
  }

  /**
   * 驗證API金鑰
   * @returns {Promise<Object>} - 驗證結果
   */
  async validateApiKey() {
    try {
      // 嘗試獲取一條資料，僅驗證API金鑰
      const response = await this._request('GET', '/estates', null, { limit: 1 });
      return {
        valid: true,
        message: 'API金鑰有效',
        permissions: response.permissions || ['read'] // 伺服器如果返回權限資訊
      };
    } catch (error) {
      return {
        valid: false,
        message: error.message || 'API金鑰無效',
        permissions: []
      };
    }
  }
}

// 為Node.js環境導出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = McpApiClient;
}

// 使用範例:
/*
// 建立客戶端實例
const client = new McpApiClient('http://example.com/api', 'your_api_key_here');

// 獲取所有房地產資料
client.getAllEstates({ city: '台北', limit: 10, page: 1 })
  .then(result => console.log(result))
  .catch(error => console.error(error));

// 根據ID獲取房地產資料
client.getEstateById('P123456')
  .then(estate => console.log(estate))
  .catch(error => console.error(error));

// 創建新的房地產資料
const newEstate = {
  propertyId: 'P654321',
  address: {
    street: '信義路50號',
    city: '台北',
    state: '台北市',
    zipCode: '11049',
    country: '台灣'
  },
  type: 'commercial',
  price: 15000000,
  // ... 其他屬性
};

client.createEstate(newEstate)
  .then(result => console.log(result))
  .catch(error => console.error(error));
*/
