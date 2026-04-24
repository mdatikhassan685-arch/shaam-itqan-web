import mysql from 'mysql2/promise';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST allowed' });

    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.TIDB_HOST,
            user: process.env.TIDB_USER,
            password: process.env.TIDB_PASSWORD,
            database: process.env.TIDB_DB,
            port: 4000,
            ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
        });

        const { name, price, image, description } = req.body;
        
        const query = 'INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)';
        const [result] = await connection.execute(query, [name, price, image, description]);

        return res.status(200).json({ success: true, id: result.insertId });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
}
