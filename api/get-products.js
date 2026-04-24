const mysql = require('mysql2/promise');

export default async function handler(req, res) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: 4000
  });
  const [rows] = await connection.execute('SELECT * FROM products');
  await connection.end();
  res.status(200).json(rows);
}
