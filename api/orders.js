const pool = require('./db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

export default async function handler(req, res) {
    // কুকি থেকে টোকেন যাচাই
    const cookie = req.headers.cookie;
    const token = cookie?.split('token=')[1]?.split(';')[0];

    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return res.status(401).json({ message: 'Invalid Token' });
    }

    const { action } = req.body;

    // GET: অর্ডার লিস্ট আনা
    if (req.method === 'GET') {
        const [orders] = await pool.query('SELECT * FROM orders WHERE email = ?', [decoded.email]);
        return res.status(200).json(orders);
    }

    // POST: নতুন অর্ডার বা কার্ট আইটেম যোগ করা
    if (req.method === 'POST') {
        if (req.body.action === 'add_to_cart') {
            const { products, image_url, total_price } = req.body;
            await pool.query(
                'INSERT INTO orders (email, products, image_url, total_price, status) VALUES (?, ?, ?, ?, ?)',
                [decoded.email, products, image_url, total_price, 'Cart']
            );
            return res.status(200).json({ message: 'Added to Cart' });
        } else {
            // কনফার্ম অর্ডার (চেকআউট)
            const { name, phone, address, total_price } = req.body;
            await pool.query(
                'UPDATE orders SET customer_name = ?, phone = ?, address = ?, status = ? WHERE email = ? AND status = ?',
                [name, phone, address, total_price, 'Pending', decoded.email, 'Cart']
            );
            return res.status(200).json({ message: 'Order Placed' });
        }
    }

    // DELETE: কার্ট আইটেম রিমুভ
    if (req.method === 'DELETE') {
        const { id } = req.body;
        await pool.query('DELETE FROM orders WHERE id = ? AND email = ?', [id, decoded.email]);
        return res.status(200).json({ message: 'Removed' });
    }
}
