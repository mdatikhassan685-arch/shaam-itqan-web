import mysql from 'mysql2/promise';

export default async function handler(req, res) {
    const connection = await mysql.createConnection({
        host: process.env.TIDB_HOST,
        user: process.env.TIDB_USER,
        password: process.env.TIDB_PASSWORD,
        database: process.env.TIDB_DB,
        port: 4000,
        ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
    });

    try {
        // প্রোডাক্ট লিস্ট পড়ার জন্য (GET)
        if (req.method === 'GET') {
            const [rows] = await connection.execute('SELECT * FROM products ORDER BY created_at DESC');
            return res.status(200).json(rows);
        }

        // প্রোডাক্ট সেভ করার জন্য (POST)
        if (req.method === 'POST') {
            const { name, price, image, description } = req.body;
            // কলামের নাম 'image'
            const query = 'INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)';
            const [result] = await connection.execute(query, [name, price, image, description]);
            return res.status(200).json({ success: true, id: result.insertId });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    } finally {
        await connection.end();
    }
}
