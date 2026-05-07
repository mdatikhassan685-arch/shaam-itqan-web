import pool from './db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

export default async function handler(req, res) {
    const token = req.cookies?.token; // Vercel-এ কুকি রিড করার জন্য
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (req.method === 'POST') {
            const { action, products, total_price, image_url, name, phone, address } = req.body;
            if (action === 'add_to_cart') {
                await pool.query('INSERT INTO orders (email, products, total_price, image_url, status) VALUES (?, ?, ?, ?, "Cart")', [decoded.email, products, total_price, image_url]);
            } else {
                await pool.query('UPDATE orders SET customer_name=?, phone=?, address=?, status="Pending" WHERE email=? AND status="Cart"', [name, phone, address, decoded.email]);
            }
            return res.status(200).json({ message: 'Success' });
        }
        
        if (req.method === 'GET') {
            const [rows] = await pool.query('SELECT * FROM orders WHERE email = ?', [decoded.email]);
            return res.status(200).json(rows);
        }
    } catch (e) {
        return res.status(401).json({ message: 'Invalid Token' });
    }
}
