import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    
    try {
        if (req.method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const email = url.searchParams.get('email');
            
            let query = 'SELECT * FROM orders';
            let params = [];
            if (email) {
                query += ' WHERE email = ?';
                params = [email];
            }
            
            const [rows] = await db.execute(query, params);
            await db.end();
            return res.status(200).json(rows);
        } 
        else if (req.method === 'POST') {
            const b = req.body;
            // যদি action থাকে 'add_to_cart', তবে status হবে 'Cart'
            const status = b.action === 'add_to_cart' ? 'Cart' : 'Pending';
            
            await db.execute(
                'INSERT INTO orders (customer_name, phone, address, email, products, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [b.name || 'N/A', b.phone || 'N/A', b.address || 'N/A', b.email, b.products || 'Item', b.total_price || 0, status]
            );
            await db.end();
            return res.status(200).json({ status: "Success" });
        }
    } catch (e) {
        await db.end();
        res.status(500).json({ error: e.message });
    }
}
