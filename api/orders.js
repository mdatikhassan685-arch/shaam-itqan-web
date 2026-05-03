import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    const { method } = req;
    const body = req.body;
    const email = req.query.email;

    try {
        if (method === 'GET') {
            // ইউজারের শুধুমাত্র 'Cart' স্ট্যাটাসের ডাটা আনবে
            const [rows] = await db.execute('SELECT * FROM orders WHERE customer_name = ? AND status = "Cart"', [email]);
            res.status(200).json(rows);
        } else if (method === 'POST') {
            // কার্ট আপডেট বা অর্ডার কনফার্ম
            if (body.action === 'add_to_cart') {
                await db.execute('INSERT INTO orders (customer_name, products, total_price, status) VALUES (?, ?, ?, "Cart")', 
                [body.email, JSON.stringify(body.products), body.total]);
            } else {
                await db.execute('UPDATE orders SET status="Pending", address=?, phone=? WHERE status="Cart" AND customer_name=?', 
                [body.address, body.phone, body.email]);
            }
            res.status(200).json({ message: "Success" });
        }
        await db.end();
    } catch (e) { res.status(500).json({ error: e.message }); }
}
