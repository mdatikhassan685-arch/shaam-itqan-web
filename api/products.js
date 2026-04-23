import mysql from 'mysql2/promise';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // কানেকশন পুল ব্যবহার করলে টাইমআউট হওয়ার চান্স কমে যায়
    const connection = await mysql.createConnection({
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

    try {
        const { name, price, image_url, description } = req.body;

        // আপনার ডাটাবেসের কলাম নাম image_url হলে নিচের লাইনে image এর বদলে image_url দিন
        const query = 'INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)';
        await connection.execute(query, [name, price, image_url, description]);

        await connection.end();
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Database Error:', error);
        return res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
}
