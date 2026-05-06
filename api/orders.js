import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    
    try {
        const method = req.method;

        if (method === 'GET') {
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
        else if (method === 'POST') {
            const b = req.body;
            
            if (b.action === 'add_to_cart') {
                // products কে JSON এ রূপান্তর করার জন্য JSON.stringify ব্যবহার করতে হবে
                const productData = JSON.stringify(b.products); 
                
                await db.execute(
                    'INSERT INTO orders (email, products, total_price, status, image_url, customer_name, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [b.email, productData, b.total_price, 'Cart', b.image_url, 'N/A', 'N/A', 'N/A']
                );
            } else {
                await db.execute(
                    'UPDATE orders SET customer_name = ?, phone = ?, address = ?, status = ? WHERE email = ? AND status = ?',
                    [b.name, b.phone, b.address, 'Pending', b.email, 'Cart']
                );
            }
            return res.status(200).json({ message: "Success" });
        }
        else if (method === 'DELETE') {
            await db.execute('DELETE FROM orders WHERE id = ?', [req.body.id]);
            return res.status(200).json({ message: "Deleted" });
        }
    } catch (e) {
        console.error("Orders API Error:", e);
        res.status(500).json({ error: e.message });
    }
}
