import mysql from 'mysql2/promise';

export default async function handler(req, res) {
    // ১. প্রাক-প্রস্তুতি: শুধু GET এবং POST এলাউ করা
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let connection;

    try {
        // ২. ডাটাবেস কানেকশন
        connection = await mysql.createConnection({
            host: process.env.TIDB_HOST,
            user: process.env.TIDB_USER,
            password: process.env.TIDB_PASSWORD,
            database: process.env.TIDB_DB,
            port: 4000,
            ssl: {
                minVersion: 'TLSv1.2',
                rejectUnauthorized: true
            }
        });

        // ৩. ডাটা দেখার জন্য (GET)
        if (req.method === 'GET') {
            const [rows] = await connection.execute('SELECT * FROM products ORDER BY created_at DESC');
            return res.status(200).json(rows);
        }

        // ৪. ডাটা সেভ করার জন্য (POST)
        if (req.method === 'POST') {
            const { name, price, image, description } = req.body;

            // ডাটাবেস কলামের নাম এখন 'image'
            const query = 'INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)';
            const [result] = await connection.execute(query, [
                name || 'No Name', 
                price || 0, 
                image || '', 
                description || ''
            ]);

            return res.status(200).json({ success: true, insertId: result.insertId });
        }

    } catch (error) {
        console.error('SERVER_ERROR:', error.message);
        return res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
}
