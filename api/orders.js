import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    try {
        if (req.method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const status = url.searchParams.get('status');
            let query = 'SELECT * FROM orders ORDER BY id DESC';
            let params = [];
            if (status) { query = 'SELECT * FROM orders WHERE status = ? ORDER BY id DESC'; params = [status]; }
            const [rows] = await db.execute(query, params);
            res.status(200).json(rows);
        } else if (req.method === 'POST') {
            const b = req.body;
            // সব ফিল্ড যেন ডাটাবেসে যায়
            const [result] = await db.execute(
                'INSERT INTO orders (customer_name, phone, address, email, products, total_price, status, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [b.name || 'N/A', b.phone || 'N/A', b.address || 'N/A', b.email || 'guest', b.products, b.total_price || 0, b.status || 'Cart', b.image_url || '']
            );
            res.status(200).json({ status: "Success", id: result.insertId });
        } else if (req.method === 'PUT') {
            const { id, status, name, phone, address } = req.body;
            await db.execute('UPDATE orders SET status=?, customer_name=?, phone=?, address=? WHERE id=?', [status, name, phone, address, id]);
            res.status(200).json({ status: "Updated" });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
    finally { await db.end(); }
}
