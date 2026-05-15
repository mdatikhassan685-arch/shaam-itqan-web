import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    try {
        if (req.method === 'GET') {
            const status = new URL(req.url, `http://${req.headers.host}`).searchParams.get('status');
            const query = status ? 'SELECT * FROM orders WHERE status = ? ORDER BY id DESC' : 'SELECT * FROM orders ORDER BY id DESC';
            const [rows] = await db.execute(query, status ? [status] : []);
            res.status(200).json(rows);
        } 
        else if (req.method === 'POST') {
            const b = req.body;
            // এখানে products ফিল্ডে আইডি, নাম, সাইজ সব থাকবে
            await db.execute(
                'INSERT INTO orders (customer_name, phone, address, email, products, total_price, status, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [b.name || 'N/A', b.phone || 'N/A', b.address || 'N/A', b.email || 'guest', b.products, b.total_price, b.status, b.image_url]
            );
            res.status(200).json({ status: "Success" });
        }
        else if (req.method === 'PUT') {
            const { id, status, name, phone, address } = req.body;
            if(status === 'Pending') {
                await db.execute('UPDATE orders SET status=?, customer_name=?, phone=?, address=? WHERE id=?', [status, name, phone, address, id]);
            } else {
                await db.execute('UPDATE orders SET status=? WHERE id=?', [status, id]);
            }
            res.status(200).json({ status: "Updated" });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
    finally { await db.end(); }
}
