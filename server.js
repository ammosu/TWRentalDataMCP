import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import bodyParser from 'body-parser';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

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
    
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);
    
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
    console.error('查詢錯誤:', err);
    res.status(500).json({ message: '伺服器錯誤', error: err.message });
  }
});

// 啟動伺服器
app.listen(port, () => {
  console.log(`伺服器啟動於 http://localhost:${port}`);
});
