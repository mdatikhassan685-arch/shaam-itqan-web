import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    const { type } = req.query; 

    // টেবিলের নাম ঠিক করার ম্যাপিং
    const tableMap = {
        'product': 'products',
        'banner': 'banners',
        'category': 'categories'
    };

    const tableName = tableMap[type];

    if (req.method === 'GET') {
        try {
            const [rows] = await db.execute(`SELECT * FROM ${tableName}`);
            await db.end();
            res.status(200).json(rows);
        } catch (e) {
            await db.end();
            res.status(500).json({ error: e.message });
        }
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

        try {
            await db.execute(query, values);
            await db.end();
            res.status(200).json({ message: "Success" });
        } catch (e) {
            await db.end();
            res.status(500).json({ error: e.message });
        }
    }
}
