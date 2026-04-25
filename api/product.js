import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    if (req.method === 'GET') {
        const [rows] = await db.execute('SELECT * FROM products');
        res.status(200).json(rows);
    } else if (req.method === 'POST') {
        const { name, price, stock, image_url } = req.body;
        await db.execute('INSERT INTO products (name, price, stock, image_url) VALUES (?, ?, ?, ?)', [name, price, stock, image_url]);
        res.status(200).json({ message: "Product Added" });
    }
    await db.end();
}
