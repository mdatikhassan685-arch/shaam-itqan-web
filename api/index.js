import mysql from 'mysql2/promise';

export default async function handler(req, res) {
    // ডাটাবেস কানেকশন
    const connection = await mysql.createConnection({
        host: process.env.TIDB_HOST,
        user: process.env.TIDB_USER,
        password: process.env.TIDB_PASSWORD,
        database: process.env.TIDB_DB,
        port: 4000,
        ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
    });

    try {
        // লগইন রুট (POST /api/index)
        if (req.method === 'POST') {
            const { email, password } = req.body;
            
            // ইমেইল ও পাসওয়ার্ড চেক
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

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error("Auth Error:", error.message);
        return res.status(500).json({ error: error.message });
    } finally {
        await connection.end();
    }
}
