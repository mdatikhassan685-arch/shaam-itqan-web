import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    try {
        if (req.method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const email = url.searchParams.get('email');
            let query = 'SELECT * FROM orders ORDER BY id DESC';
            let params = [];
            if (email) {
                query = 'SELECT * FROM orders WHERE email = ? ORDER BY id DESC';
                params = [email];
            }
            const [rows] = await db.execute(query, params);
            return res.status(200).json(rows);
        } 
        else if (req.method === 'DELETE') {
            const { id } = req.body;
            await db.execute('DELETE FROM orders WHERE id = ?', [id]);
            return res.status(200).json({ status: "Deleted" });
        }
        else if (req.method === 'POST') {
            const b = req.body;
            const status = b.action === 'add_to_cart' ? 'Cart' : 'Pending';
            
            await db.execute(
                'INSERT INTO orders (customer_name, phone, address, email, products, total_price, status, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [b.name || 'N/A', b.phone || 'N/A', b.address || 'N/A', b.email, b.products, b.total_price, status, b.image_url]
            );
            return res.status(200).json({ status: "Success" });
        }
    } catch (e) {
        console.error("Orders API Error:", e);
        return res.status(500).json({ error: e.message });
    }
}
