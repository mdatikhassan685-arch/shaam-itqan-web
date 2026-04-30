import { getDb } from './db.js';
export default async function handler(req, res) {
    const db = await getDb();
    const url = new URL(req.url, `http://${req.headers.host}`);
    const type = url.searchParams.get('type');
    const tableMap = { 'product': 'products', 'banner': 'banners', 'category': 'categories' };
    const tableName = tableMap[type];

    if (req.method === 'GET') {
        const [rows] = await db.execute(`SELECT * FROM ${tableName}`);
        await db.end();
        res.status(200).json(rows);
    } else {
        const b = req.body;
        if (type === 'product') await db.execute('INSERT INTO products (name, price, stock, image_url) VALUES (?, ?, ?, ?)', [b.name, b.price, b.stock, b.image_url]);
        else if (type === 'banner') await db.execute('INSERT INTO banners (image_url, link_url) VALUES (?, ?)', [b.image_url, b.link_url]);
        else if (type === 'category') await db.execute('INSERT INTO categories (name, image_url, link_url) VALUES (?, ?, ?)', [b.name, b.image_url, b.link_url]);
        await db.end();
        res.status(200).json({ status: "Success" });
    }
}
