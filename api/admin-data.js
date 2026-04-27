import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    const { type } = req.query; // URL-এ /api/admin-data?type=product পাঠাবেন

    if (req.method === 'GET') {
        const [rows] = await db.execute(`SELECT * FROM ${type}s`);
        await db.end();
        res.status(200).json(rows);
    } 
    else if (req.method === 'POST') {
        const body = req.body;
        let query = "";
        let values = [];

        if (type === 'product') {
            query = 'INSERT INTO products (name, price, stock, image_url) VALUES (?, ?, ?, ?)';
            values = [body.name, body.price, body.stock, body.image_url];
        } else if (type === 'banner') {
            query = 'INSERT INTO banners (image_url, link_url) VALUES (?, ?)';
            values = [body.image_url, body.link_url];
        } else if (type === 'category') {
            query = 'INSERT INTO categories (name, image_url, link_url) VALUES (?, ?, ?)';
            values = [body.name, body.image_url, body.link_url];
        }

        await db.execute(query, values);
        await db.end();
        res.status(200).json({ message: "Success" });
    }
}
