// orders.js
import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    try {
        if (req.method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const email = url.searchParams.get('email');
            const query = email 
                ? ['SELECT * FROM orders WHERE email = ? ORDER BY id DESC', [email]]
                : ['SELECT * FROM orders ORDER BY id DESC', []];
            
            const [rows] = await db.execute(query[0], query[1]);
            res.status(200).json(rows);
        } 
        else if (req.method === 'POST') {
            const b = req.body;
            if (b.action === 'add_to_cart') {
                await db.execute('INSERT INTO orders (customer_name, phone, address, email, products, total_price, status, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    ['N/A', 'N/A', 'N/A', b.email, b.products, b.total_price, 'Cart', b.image_url]);
            } else {
                // চেকআউট বা কনফার্ম অর্ডার
                await db.execute('UPDATE orders SET customer_name=?, phone=?, address=?, status=? WHERE email=? AND status=?', 
                    [b.name, b.phone, b.address, 'Pending', b.email, 'Cart']);
            }
            res.status(200).json({ status: "Success" });
        }
        else if (req.method === 'DELETE') {
            await db.execute('DELETE FROM orders WHERE id = ?', [req.body.id]);
            res.status(200).json({ status: "Deleted" });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
