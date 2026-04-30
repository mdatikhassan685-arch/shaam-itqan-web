import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    const url = new URL(req.url, `http://${req.headers.host}`);
    const type = url.searchParams.get('type');
    
    // টেবিলে ডাটাবেসের নামের সাথে মিল থাকতে হবে
    const tableMap = { 'product': 'products', 'banner': 'banners', 'category': 'categories' };
    const tableName = tableMap[type];

    if (req.method === 'GET') {
        try {
            const [rows] = await db.execute(`SELECT * FROM ${tableName}`);
            await db.end();
            return res.status(200).json(rows);
        } catch (e) {
            await db.end();
            return res.status(500).json({ error: e.message });
        }
    } else if (req.method === 'POST') {
        const b = req.body;
        try {
            if (type === 'product') await db.execute('INSERT INTO products (name, price, stock, image_url) VALUES (?, ?, ?, ?)', [b.name, b.price, b.stock, b.image_url]);
            else if (type === 'banner') await db.execute('INSERT INTO banners (image_url, link_url) VALUES (?, ?)', [b.image_url, b.link_url]);
            else if (type === 'category') await db.execute('INSERT INTO categories (name, image_url, link_url) VALUES (?, ?, ?)', [b.name, b.image_url, b.link_url]);
            await db.end();
            return res.status(200).json({ message: "Success" });
        } catch (e) {
            await db.end();
            return res.status(500).json({ error: e.message });
        }
    }
}
