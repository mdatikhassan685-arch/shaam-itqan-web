import { getDb } from './db.js';

export default async function handler(req, res) {
    const { userId, action } = req.body;
    const db = await getDb();
    if (action === 'getProfile') {
        const [rows] = await db.execute('SELECT username, email FROM users WHERE id = ?', [userId]);
        res.status(200).json(rows[0]);
    }
    await db.end();
}
