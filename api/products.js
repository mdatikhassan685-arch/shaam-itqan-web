import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // TiDB কানেকশন কনফিগ (আপনার TiDB কনসোল থেকে এগুলো পাবেন)
    const connection = await mysql.createConnection({
      host: process.env.TIDB_HOST,
      user: process.env.TIDB_USER,
      password: process.env.TIDB_PASSWORD,
      database: 'test', // আপনার ডাটাবেস নাম
      port: 4000,
      ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
    });

    try {
      const { name, price, image_url, description } = req.body;
      const [result] = await connection.execute(
        'INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)',
        [name, price, image_url, description]
      );
      res.status(200).json({ success: true, id: result.insertId });
    } catch (error) {
      res.status(500).json({ error: error.message });
    } finally {
      await connection.end();
    }
  }
}
