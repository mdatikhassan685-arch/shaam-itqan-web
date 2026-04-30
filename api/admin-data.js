import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    
    // URL থেকে টাইপ বের করার সঠিক উপায়
    const url = new URL(req.url, `http://${req.headers.host}`);
    const type = url.searchParams.get('type');
    
    // টেবিল ম্যাপ (এখানে ভুল নাম দিলে ডাটাবেস এরর দিবে)
    const tableMap = { 
        'product': 'products', 
        'banner': 'banners', 
        'category': 'categories' 
    };
    const tableName = tableMap[type];

    // যদি টাইপ ভুল হয় তবে এরর রিটার্ন করবে
    if (!tableName) {
        await db.end();
        return res.status(400).json({ error: "Invalid type provided" });
    }

    try {
        if (req.method === 'GET') {
            // ORDER BY id DESC দিলে নতুন ডাটা সবার আগে আসবে
            const [rows] = await db.execute(`SELECT * FROM ${tableName} ORDER BY id DESC`);
            await db.end();
            return res.status(200).json(rows);
        } 
        else if (req.method === 'POST') {
            const b = req.body;
            let query = "";
            let values = [];

            if (type === 'product') {
                query = 'INSERT INTO products (name, price, stock, image_url) VALUES (?, ?, ?, ?)';
                values = [b.name, b.price, b.stock || 0, b.image_url];
            } else if (type === 'banner') {
                query = 'INSERT INTO banners (image_url, link_url) VALUES (?, ?)';
                values = [b.image_url, b.link_url];
            } else if (type === 'category') {
                query = 'INSERT INTO categories (name, image_url, link_url) VALUES (?, ?, ?)';
                values = [b.name, b.image_url, b.link_url];
            }

            await db.execute(query, values);
            await db.end();
            return res.status(200).json({ message: "Success" });
        }
    } catch (e) {
        await db.end();
        return res.status(500).json({ error: e.message });
    }
}
