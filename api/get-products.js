// api/get-products.js
const mysql = require('mysql2/promise');

export default async function handler(req, res) {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const [rows] = await connection.execute('SELECT * FROM products');
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await connection.end();
  }
}
