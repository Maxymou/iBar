const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'ibar',
  user: process.env.DB_USER || 'ibar_user',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});

const query = async (text, params, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      if (i === retries - 1 || !err.message.includes('connect')) throw err;
      console.warn(`DB query retry ${i + 1}/${retries} after connection error`);
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
};

module.exports = {
  query,
  getClient: () => pool.connect(),
  pool,
};
