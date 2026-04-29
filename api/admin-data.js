import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    const url = new URL(req.url, `http://${req.headers.host}`);
    const type = url.searchParams.get('type');

    if (req.method === 'GET') {
        const tableMap = { 'product': 'products', 'banner': 'banners', 'category': 'categories' };
        const [rows] = await db.execute(`SELECT * FROM ${tableMap[type]}`);
        await db.end();
        res.status(200).json(rows);
    } 
    else if (req.method === 'POST') {
        const body = req.body;
        try {
            if (type === 'product') {
                await db.execute('INSERT INTO products (name, price, stock, image_url) VALUES (?, ?, ?, ?)', 
                [body.name, body.price, body.stock || 0, body.image_url]);
            } else if (type === 'banner') {
                await db.execute('INSERT INTO banners (image_url, link_url) VALUES (?, ?)', 
                [body.image_url, body.link_url]);
            }
            await db.end();
            res.status(200).json({ message: "Success" });
        } catch (e) {
            await db.end();
            res.status(500).json({ error: e.message });
        }
    }
}
