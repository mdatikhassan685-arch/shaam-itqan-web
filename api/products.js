import mysql from 'mysql2/promise';

export default async function handler(req, res) {
    const dbConfig = {
        host: process.env.TIDB_HOST,
        user: process.env.TIDB_USER,
        password: process.env.TIDB_PASSWORD,
        database: process.env.TIDB_DB,
        port: 4000,
        ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
    };

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        // ১. ডাটাবেস থেকে প্রোডাক্ট লিস্ট পড়ার জন্য (GET)
        if (req.method === 'GET') {
            const [rows] = await connection.execute('SELECT * FROM products ORDER BY created_at DESC');
            return res.status(200).json(rows);
        }

        // ২. নতুন প্রোডাক্ট সেভ করার জন্য (POST)
        if (req.method === 'POST') {
            const { name, price, image, description } = req.body;
            // কলামের নাম 'image' হিসেবেই ডাটা পাঠাতে হবে
            const query = 'INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)';
            const [result] = await connection.execute(query, [name, price, image, description]);
            return res.status(200).json({ success: true, id: result.insertId });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error("Database Error:", error.message);
        return res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
}
