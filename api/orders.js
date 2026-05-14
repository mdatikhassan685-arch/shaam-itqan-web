import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    try {
        if (req.method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const email = url.searchParams.get('email');
            const status = url.searchParams.get('status');
            
            let query = 'SELECT * FROM orders ORDER BY id DESC';
            let params = [];
            
            if (status === 'last_pending') {
                query = 'SELECT * FROM orders WHERE status = "Checkout_Pending" ORDER BY id DESC LIMIT 1';
            } else if (email) {
                query = 'SELECT * FROM orders WHERE email = ? ORDER BY id DESC';
                params = [email];
            }
            
            const [rows] = await db.execute(query, params);
            res.status(200).json(rows);
        } 
        else if (req.method === 'POST') {
            const b = req.body;
            // স্ট্যাটাস লজিক: action 'add_to_cart' হলে 'Cart', অন্যথায় 'Checkout_Pending'
            const status = (b.action === 'add_to_cart') ? 'Cart' : 'Checkout_Pending';
            
            await db.execute(
                'INSERT INTO orders (customer_name, phone, address, email, products, total_price, status, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [b.name || 'N/A', b.phone || 'N/A', b.address || 'N/A', b.email || 'guest', b.products, b.total_price, status, b.image_url]
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
        else if (req.method === 'DELETE') {
            await db.execute('DELETE FROM orders WHERE id = ?', [req.body.id]);
            res.status(200).json({ status: "Deleted" });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    } finally {
        await db.end();
    }
}
