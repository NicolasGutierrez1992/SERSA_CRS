const { Pool } = require('pg');

//host de la base de datos en render.com
//dpg-d32b1rbuibrs739mug40-a.oregon-postgres.render.com/db_sersa
//PORT: 5432
//user: s3rs4
//password: k5gEWsK1hBTWoiVo2c7mwQTxN9Z07wXI
//database: db_sersa


const pool = new Pool({
  connectionString: process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
});

module.exports = pool;