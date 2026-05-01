import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    const url = new URL(req.url, `http://${req.headers.host}`);
    const type = url.searchParams.get('type');
    const tableMap = { 'product': 'products', 'banner': 'banners', 'category': 'categories' };
    const tableName = tableMap[type];

    try {
        if (req.method === 'GET') {
            const [rows] = await db.execute(`SELECT * FROM ${tableName} ORDER BY id DESC`);
            res.status(200).json(rows);
        } else if (req.method === 'POST') {
            const b = req.body;
            if (type === 'product') await db.execute('INSERT INTO products (name, price, stock, image_url, description) VALUES (?, ?, ?, ?, ?)', [b.name, b.price, b.stock, b.image_url, b.description]);
            else if (type === 'banner') await db.execute('INSERT INTO banners (image_url, link_url) VALUES (?, ?)', [b.image_url, b.link_url]);
            else if (type === 'category') await db.execute('INSERT INTO categories (name, image_url, link_url) VALUES (?, ?, ?)', [b.name, b.image_url, b.link_url]);
            res.status(200).json({ status: "Success" });
        } else if (req.method === 'PUT') { // আপডেট করার জন্য
            const b = req.body;
            await db.execute(`UPDATE ${tableName} SET name=?, price=?, image_url=?, description=? WHERE id=?`, [b.name, b.price, b.image_url, b.description, b.id]);
            res.status(200).json({ status: "Updated" });
        } else if (req.method === 'DELETE') { // ডিলিট করার জন্য
            const { id } = req.body;
            await db.execute(`DELETE FROM ${tableName} WHERE id=?`, [id]);
            res.status(200).json({ status: "Deleted" });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
    finally { await db.end(); }
}
