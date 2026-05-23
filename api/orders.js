import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    try {
        if (req.method === 'GET') {
            const status = new URL(req.url, `http://${req.headers.host}`).searchParams.get('status');
            const query = status ? 'SELECT * FROM orders WHERE status = ? ORDER BY id DESC' : 'SELECT * FROM orders ORDER BY id DESC';
            const [rows] = await db.execute(query, status ? [status] : []);
            res.status(200).json(rows);
        } else if (req.method === 'POST') {
            const b = req.body;
            // নতুন কলামগুলোসহ ডাটাবেসে ইনসার্ট
            await db.execute(
                'INSERT INTO orders (customer_name, phone, alt_phone, district, address, email, products, total_price, status, image_url, payment_method, order_note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [b.name, b.phone, b.alt_phone, b.district, b.address, b.email, b.products, b.total_price, b.status, b.image_url, b.payment_method, b.order_note]
            );
            res.status(200).json({ status: "Success" });
        } else if (req.method === 'PUT') {
            const { id, status } = req.body;
            await db.execute('UPDATE orders SET status=? WHERE id=?', [status, id]);
            res.status(200).json({ status: "Updated" });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
    finally { await db.end(); }
}
