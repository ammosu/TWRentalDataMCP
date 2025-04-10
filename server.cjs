const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

// 讀取環境變數
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// 啟用CORS
app.use(cors());

// 設定速率限制
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 預設15分鐘
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 每個IP在windowMs內的最大請求數
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '請求過多，請稍後再試' }
});

// 套用速率限制到所有請求
app.use(limiter);

// 記錄請求
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${new Date().toISOString()} | ${req.method} ${req.originalUrl} | ${res.statusCode} | ${duration}ms`
    );
  });
  next();
});

// PostgreSQL連線池
const pool = new Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT) || 5432,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

// 測試資料庫連線
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('資料庫連線錯誤:', err);
  } else {
    console.log('資料庫連線成功:', res.rows[0].now);
  }
});

// 解析JSON請求體
app.use(bodyParser.json());

// 健康檢查端點
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API文檔端點
app.get('/api-docs', (req, res) => {
  res.json({
    api_version: '1.0.0',
    endpoints: [
      { method: 'GET', path: '/estates', description: '取得所有房地產資料' },
      { method: 'GET', path: '/estates/:id', description: '根據ID取得房地產資料' },
      { method: 'POST', path: '/estates', description: '新增房地產資料' },
      { method: 'PUT', path: '/estates/:id', description: '更新房地產資料' },
      { method: 'DELETE', path: '/estates/:id', description: '刪除房地產資料' }
    ],
    authentication: 'API金鑰需要在請求標頭中以X-API-KEY提供'
  });
});

// 驗證房地產資料
const validateEstateData = (data) => {
  const errors = [];
  
  // 必填欄位檢查
  const requiredFields = ['transaction_id', 'transaction_date', 'city', 'district', 'building_type', 'price'];
  requiredFields.forEach(field => {
    if (!data[field]) {
      errors.push(`${field} 是必填欄位`);
    }
  });
  
  // 數值欄位檢查
  const numberFields = ['price', 'building_area', 'unit_price', 'floor_level', 'building_age', 'total_floors', 'land_area'];
  numberFields.forEach(field => {
    if (data[field] !== undefined && (isNaN(data[field]) || data[field] < 0)) {
      errors.push(`${field} 必須是非負數值`);
    }
  });
  
  // 日期欄位檢查
  if (data.transaction_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.transaction_date)) {
    errors.push('transaction_date 格式必須為 YYYY-MM-DD');
  }
  
  return errors;
};

// 中介層：API_KEY驗證
app.use(async (req, res, next) => {
  // 健康檢查和API文檔端點不需要驗證
  if (req.path === '/health' || req.path === '/api-docs') {
    return next();
  }
  
  const apiKey = req.header('X-API-KEY');
  if (!apiKey) {
    return res.status(401).json({ message: '缺少API_KEY' });
  }
  
  try {
    const result = await pool.query(
      'SELECT * FROM api_keys WHERE key = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())',
      [apiKey]
    );
    
    if (result.rowCount === 0) {
      return res.status(403).json({ message: 'API_KEY無效或已過期' });
    }
    
    // 更新最後使用時間
    await pool.query(
      'UPDATE api_keys SET last_used_at = NOW() WHERE key = $1',
      [apiKey]
    );
    
    req.apiKeyInfo = result.rows[0];
    next();
  } catch (err) {
    console.error('API_KEY驗證錯誤:', err);
    res.status(500).json({ message: '伺服器錯誤', error: err.message });
  }
});

// 取得所有房地產資料
app.get('/estates', async (req, res) => {
  try {
    const { city, district, building_type, min_price, max_price, limit = 10, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let paramIndex = 1;
    let query = 'SELECT * FROM real_estate_data';
    
    // 建立WHERE子句
    const conditions = [];
    
    if (city) {
      conditions.push(`city = $${paramIndex++}`);
      params.push(city);
    }
    
    if (district) {
      conditions.push(`district = $${paramIndex++}`);
      params.push(district);
    }
    
    if (building_type) {
      conditions.push(`building_type = $${paramIndex++}`);
      params.push(building_type);
    }
    
    if (min_price) {
      conditions.push(`price >= $${paramIndex++}`);
      params.push(min_price);
    }
    
    if (max_price) {
      conditions.push(`price <= $${paramIndex++}`);
      params.push(max_price);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    // 計算總筆數
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);
    
    // 添加排序和分頁
    query += ' ORDER BY transaction_date DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex++;
    params.push(limit);
    params.push(offset);
    
    const result = await pool.query(query, params);
    
    res.json({
      data: result.rows,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    console.error('查詢錯誤:', err, {
      query: req.query,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ message: '伺服器錯誤', error: err.message });
  }
});

// 根據ID取得房地產資料
app.get('/estates/:id', async (req, res) => {
  try {
    // 驗證UUID格式
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(req.params.id)) {
      return res.status(400).json({ message: '無效的ID格式' });
    }
    
    const result = await pool.query('SELECT * FROM real_estate_data WHERE transaction_id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: '找不到資料' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('查詢錯誤:', err, {
      id: req.params.id,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ message: '伺服器錯誤', error: err.message });
  }
});

// 新增房地產資料
app.post('/estates', async (req, res) => {
  try {
    const e = req.body;
    
    // 驗證資料
    const validationErrors = validateEstateData(e);
    if (validationErrors.length > 0) {
      return res.status(400).json({ message: '資料驗證失敗', errors: validationErrors });
    }
    
    // 如果沒有提供transaction_id，自動生成
    if (!e.transaction_id) {
      e.transaction_id = uuidv4();
    }
    
    await pool.query(
      `INSERT INTO real_estate_data (
        transaction_id, transaction_date, city, district, address, building_type, price, building_area, unit_price, floor_level, building_age, total_floors, land_area, main_use, construction_materials, transaction_type
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
      )`,
      [
        e.transaction_id, e.transaction_date, e.city, e.district, e.address, e.building_type, e.price, e.building_area, e.unit_price, e.floor_level, e.building_age, e.total_floors, e.land_area, e.main_use, e.construction_materials, e.transaction_type
      ]
    );
    
    res.status(201).json({ 
      message: '新增成功',
      transaction_id: e.transaction_id
    });
  } catch (err) {
    console.error('新增錯誤:', err, {
      body: req.body,
      timestamp: new Date().toISOString()
    });
    
    // 處理重複鍵錯誤
    if (err.code === '23505') { // 唯一約束違反
      return res.status(409).json({ message: '資料已存在', error: err.detail });
    }
    
    res.status(500).json({ message: '伺服器錯誤', error: err.message });
  }
});

// 更新房地產資料
app.put('/estates/:id', async (req, res) => {
  try {
    // 驗證UUID格式
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(req.params.id)) {
      return res.status(400).json({ message: '無效的ID格式' });
    }
    
    const e = req.body;
    
    // 驗證資料
    const validationErrors = validateEstateData(e);
    if (validationErrors.length > 0) {
      return res.status(400).json({ message: '資料驗證失敗', errors: validationErrors });
    }
    
    // 檢查資料是否存在
    const checkResult = await pool.query(
      'SELECT * FROM real_estate_data WHERE transaction_id = $1',
      [req.params.id]
    );
    
    if (checkResult.rowCount === 0) {
      return res.status(404).json({ message: '找不到要更新的資料' });
    }
    
    const result = await pool.query(
      `UPDATE real_estate_data SET
        transaction_date=$2, city=$3, district=$4, address=$5, building_type=$6, price=$7, building_area=$8, unit_price=$9, floor_level=$10, building_age=$11, total_floors=$12, land_area=$13, main_use=$14, construction_materials=$15, transaction_type=$16
      WHERE transaction_id=$1`,
      [
        req.params.id, e.transaction_date, e.city, e.district, e.address, e.building_type, e.price, e.building_area, e.unit_price, e.floor_level, e.building_age, e.total_floors, e.land_area, e.main_use, e.construction_materials, e.transaction_type
      ]
    );
    
    res.json({ 
      message: '更新成功',
      transaction_id: req.params.id,
      affected_rows: result.rowCount
    });
  } catch (err) {
    console.error('更新錯誤:', err, {
      id: req.params.id,
      body: req.body,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ message: '伺服器錯誤', error: err.message });
  }
});

// 刪除房地產資料
app.delete('/estates/:id', async (req, res) => {
  try {
    // 驗證UUID格式
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(req.params.id)) {
      return res.status(400).json({ message: '無效的ID格式' });
    }
    
    // 檢查資料是否存在
    const checkResult = await pool.query(
      'SELECT * FROM real_estate_data WHERE transaction_id = $1',
      [req.params.id]
    );
    
    if (checkResult.rowCount === 0) {
      return res.status(404).json({ message: '找不到要刪除的資料' });
    }
    
    const result = await pool.query(
      'DELETE FROM real_estate_data WHERE transaction_id = $1',
      [req.params.id]
    );
    
    res.json({ 
      message: '刪除成功',
      transaction_id: req.params.id,
      affected_rows: result.rowCount
    });
  } catch (err) {
    console.error('刪除錯誤:', err, {
      id: req.params.id,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ message: '伺服器錯誤', error: err.message });
  }
});

// 全局錯誤處理中介層
app.use((err, req, res, next) => {
  console.error('未處理的錯誤:', err.stack);
  res.status(500).json({
    message: '伺服器內部錯誤',
    error: err.message
  });
});

// 處理未捕獲的異常
process.on('uncaughtException', (err) => {
  console.error('未捕獲的異常:', err);
  // 在生產環境中，可能需要通知管理員或重啟服務
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未處理的Promise拒絕:', reason);
});

// 處理進程退出
process.on('exit', (code) => {
  console.error(`進程退出，退出碼: ${code}`);
});

// 保持進程運行
setInterval(() => {
  console.log('伺服器仍在運行中...');
}, 10000);

try {
  console.log(`嘗試在端口 ${port} 上啟動伺服器...`);
  const server = app.listen(port, () => {
    console.log(`MCP伺服器運行於 http://localhost:${port}`);
    console.log(`伺服器詳細信息:`, server.address());
  });
  
  server.on('error', (err) => {
    console.error(`伺服器啟動錯誤:`, err);
  });
} catch (err) {
  console.error(`啟動伺服器時發生錯誤:`, err);
}
