import mysql from 'mysql2/promise';

export default async function handler(req, res) {
    // ডাটাবেস কানেকশন পুল (বারবার কানেক্ট করার ঝামেলা নেই)
    const connection = await mysql.createConnection({
        host: process.env.TIDB_HOST,
        user: process.env.TIDB_USER,
        password: process.env.TIDB_PASSWORD,
        database: process.env.TIDB_DB,
        port: 4000,
        ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
    });

    try {
        // ১. প্রোডাক্ট দেখার জন্য (GET রিকোয়েস্ট - যা এখন এরর দিচ্ছে)
        if (req.method === 'GET') {
            const [rows] = await connection.execute('SELECT * FROM products ORDER BY created_at DESC');
            return res.status(200).json(rows);
        }

        // ২. প্রোডাক্ট সেভ করার জন্য (POST রিকোয়েস্ট)
        if (req.method === 'POST') {
            const { name, price, image, description } = req.body;
            // আপনার ডাটাবেসের কলাম নাম এখন 'image'
            const query = 'INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)';
            await connection.execute(query, [name, price, image, description]);
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Database Error:', error);
        return res.status(500).json({ error: error.message });
    } finally {
        // কানেকশন শেষ করা জরুরি
        await connection.end();
    }
}
