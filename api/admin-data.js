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
            if (type === 'product') {
                await db.execute('INSERT INTO products (product_id, name, price, stock, image_url, description) VALUES (?, ?, ?, ?, ?, ?)', 
                [b.product_id, b.name, b.price, 10, b.image_url, b.description]);
            } else if (type === 'banner') {
                await db.execute('INSERT INTO banners (name, image_url, link_url) VALUES (?, ?, ?)', [b.name, b.image_url, b.link_url]);
            } else if (type === 'category') {
                await db.execute('INSERT INTO categories (name, image_url, link_url) VALUES (?, ?, ?)', [b.name, b.image_url, b.link_url]);
            }
            res.status(200).json({ status: "Success" });
        } else if (req.method === 'PUT') {
            const b = req.body;
            if (type === 'product') {
                await db.execute('UPDATE products SET product_id=?, name=?, price=?, image_url=?, description=? WHERE id=?', 
                [b.product_id, b.name, b.price, b.image_url, b.description, b.id]);
            } else {
                await db.execute(`UPDATE ${tableName} SET name=?, image_url=?, link_url=? WHERE id=?`, [b.name, b.image_url, b.link_url, b.id]);
            }
            res.status(200).json({ status: "Updated" });
        } else if (req.method === 'DELETE') {
            await db.execute(`DELETE FROM ${tableName} WHERE id = ?`, [req.body.id]);
            res.status(200).json({ status: "Deleted" });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
    finally { await db.end(); }
}
