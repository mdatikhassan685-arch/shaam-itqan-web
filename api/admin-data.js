// admin-data.js
import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    const url = new URL(req.url, `http://${req.headers.host}`);
    const type = url.searchParams.get('type');
    
    // Whitelist: শুধুমাত্র এই টেবিলগুলোই অ্যাক্সেস করা যাবে
    const tableMap = { 'product': 'products', 'banner': 'banners', 'category': 'categories' };
    const tableName = tableMap[type];

    if (!tableName) return res.status(400).json({ error: "Invalid request type" });

    try {
        if (req.method === 'GET') {
            const [rows] = await db.execute(`SELECT * FROM ${tableName} ORDER BY id DESC`);
            res.status(200).json(rows);
        } else if (req.method === 'POST' || req.method === 'PUT') {
            const b = req.body;
            if (type === 'product') {
                if (req.method === 'POST') 
                    await db.execute('INSERT INTO products (name, price, stock, image_url, description) VALUES (?, ?, ?, ?, ?)', [b.name, b.price, b.stock, b.image_url, b.description]);
                else 
                    await db.execute('UPDATE products SET name=?, price=?, image_url=?, description=? WHERE id=?', [b.name, b.price, b.image_url, b.description, b.id]);
            } else {
                if (req.method === 'POST')
                    await db.execute(`INSERT INTO ${tableName} (name, image_url, link_url) VALUES (?, ?, ?)`, [b.name, b.image_url, b.link_url]);
                else
                    await db.execute(`UPDATE ${tableName} SET name=?, image_url=?, link_url=? WHERE id=?`, [b.name, b.image_url, b.link_url, b.id]);
            }
            res.status(200).json({ status: "Success" });
        } else if (req.method === 'DELETE') {
            await db.execute(`DELETE FROM ${tableName} WHERE id = ?`, [req.body.id]);
            res.status(200).json({ status: "Deleted" });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
