import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    try {
        if (req.method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const email = url.searchParams.get('email');
            const [rows] = email ? await db.execute('SELECT * FROM orders WHERE email = ?', [email]) : await db.execute('SELECT * FROM orders ORDER BY id DESC');
            await db.end();
            return res.status(200).json(rows);
        } else if (req.method === 'POST') {
            const b = req.body;
            // কার্ডে যোগ করার সময় 'Cart', অর্ডারের সময় 'Pending'
            const status = b.action === 'add_to_cart' ? 'Cart' : 'Pending';
            
            await db.execute(
                'INSERT INTO orders (customer_name, phone, address, email, products, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [b.name || 'N/A', b.phone || 'N/A', b.address || 'N/A', b.email, b.products, b.total_price || 0, status]
            );
            await db.end();
            return res.status(200).json({ status: "Success" });
        }
    } catch (e) {
        await db.end();
        res.status(500).json({ error: e.message });
    }
}
