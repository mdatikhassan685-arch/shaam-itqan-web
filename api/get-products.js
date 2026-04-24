const mysql = require('mysql2/promise');

export default async function handler(req, res) {
  try {
    const connection = await mysql.createConnection({
      uri: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    const [rows] = await connection.execute('SELECT * FROM products');
    await connection.end();
    
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
