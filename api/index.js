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

        // ১. লগইন হ্যান্ডলিং (POST)
        if (req.method === 'POST') {
            const { email, password } = req.body;
            const [rows] = await connection.execute(
                'SELECT * FROM users WHERE email_address = ? AND password = ?', 
                [email, password]
            );

            if (rows.length > 0) {
                return res.status(200).json({ success: true, user: rows[0] });
            } else {
                return res.status(401).json({ success: false, message: 'ভুল ইমেইল বা পাসওয়ার্ড' });
            }
        }

        // ২. প্রোডাক্ট লিস্ট দেখার জন্য (GET)
        if (req.method === 'GET') {
            const [rows] = await connection.execute('SELECT * FROM products ORDER BY id DESC');
            return res.status(200).json(rows);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
}
