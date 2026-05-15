import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    if (req.method === 'POST') {
        const { email, name, price, image_url, size, quantity } = req.body;
        await db.execute('INSERT INTO bag (email, product_name, price, image_url, size, quantity) VALUES (?, ?, ?, ?, ?, ?)', 
        [email, name, price, image_url, size, quantity]);
        res.status(200).json({ status: "Added to Bag" });
    } else if (req.method === 'GET') {
        const email = new URL(req.url, `http://${req.headers.host}`).searchParams.get('email');
        const [rows] = await db.execute('SELECT * FROM bag WHERE email = ?', [email]);
        res.status(200).json(rows);
    } else if (req.method === 'DELETE') {
        await db.execute('DELETE FROM bag WHERE id = ?', [req.body.id]);
        res.status(200).json({ status: "Removed" });
    }
    await db.end();
}
