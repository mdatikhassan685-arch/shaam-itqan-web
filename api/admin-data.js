import pool from './db.js';

const ADMIN_SECRET = process.env.ADMIN_SECRET;

export default async function handler(req, res) {
    if (req.headers['authorization'] !== ADMIN_SECRET) return res.status(403).end();
    
    const { type } = req.query;
    try {
        if (req.method === 'GET') {
            const [rows] = await pool.query('SELECT * FROM ??', [type]);
            return res.status(200).json(rows);
        }
        // অন্যান্য মেথড (POST, PUT, DELETE) আগের মতোই রাখবে
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
