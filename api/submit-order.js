import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Only POST allowed' });

  const { name, phone, address, products, total } = req.body;

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: 4000,
      ssl: { rejectUnauthorized: false }
    });

    await connection.execute(
      'INSERT INTO orders (customer_name, phone, address, products, total_price) VALUES (?, ?, ?, ?, ?)',
      [name, phone, address, JSON.stringify(products), total]
    );

    await connection.end();
    res.status(200).json({ message: 'Order successful!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
