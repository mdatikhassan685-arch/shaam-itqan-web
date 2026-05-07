const pool = require('./db');
const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
    const cookies = req.headers.cookie;
    const token = cookies?.split('token=')[1]?.split(';')[0];

    // যদি কেউ লগইন না থাকে তবে অর্ডার দিতে পারবে না
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key');
        
        if (req.method === 'POST') {
            const { action, products, total_price, image_url, name, phone, address } = req.body;
            
            if (action === 'add_to_cart') {
                await pool.query(
                    'INSERT INTO orders (email, products, total_price, image_url, status) VALUES (?, ?, ?, ?, "Cart")',
                    [decoded.email, products, total_price, image_url]
                );
            } else {
                // ফাইনাল অর্ডার কনফার্মেশন
                await pool.query(
                    'UPDATE orders SET customer_name=?, phone=?, address=?, status="Pending" WHERE email=? AND status="Cart"',
                    [name, phone, address, decoded.email]
                );
            }
            return res.status(200).json({ message: 'Success' });
        }

        if (req.method === 'GET') {
            const [rows] = await pool.query('SELECT * FROM orders WHERE email = ?', [decoded.email]);
            return res.status(200).json(rows);
        }
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
