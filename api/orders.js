import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    if (req.method === 'GET') {
        const [rows] = await db.execute('SELECT * FROM orders ORDER BY created_at DESC');
        await db.end();
        res.status(200).json(rows);
    } else if (req.method === 'POST') {
        const { id, status } = req.body; // status: 'Confirmed' or 'Shipped'
        await db.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
        await db.end();
        res.status(200).json({ message: "Order Updated" });
    }
}
