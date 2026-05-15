import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    try {
        if (req.method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const status = url.searchParams.get('status');
            
            let query = 'SELECT * FROM orders ORDER BY id DESC';
            let params = [];
            
            if (status === 'Checkout_Pending') {
                query = 'SELECT * FROM orders WHERE status = "Checkout_Pending" ORDER BY id DESC LIMIT 1';
            } else if (status) {
                query = 'SELECT * FROM orders WHERE status = ? ORDER BY id DESC';
                params = [status];
            }
            
            const [rows] = await db.execute(query, params);
            res.status(200).json(rows);
        } 
        else if (req.method === 'POST') {
            const b = req.body;
            
            // ব্যাগ বা Buy Now থেকে আসা প্রোডাক্টের লিস্ট এখন সম্পূর্ণ টেক্সট হিসেবে আসবে
            const customer_name = b.name || 'N/A';
            const phone = b.phone || 'N/A';
            const address = b.address || 'N/A';
            const email = b.email || 'guest';
            const products = b.products || 'Unknown Products';
            const total_price = parseFloat(b.total_price) || 0;
            const status = b.status || 'Checkout_Pending'; 
            const image_url = b.image_url || '';

            const [result] = await db.execute(
                'INSERT INTO orders (customer_name, phone, address, email, products, total_price, status, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [customer_name, phone, address, email, products, total_price, status, image_url]
            );
            res.status(200).json({ status: "Success", id: result.insertId });
        }
        else if (req.method === 'PUT') {
            const { id, status, name, phone, address } = req.body;
            
            if(status === 'Pending') {
                // ইউজার যখন চেকআউট ফর্ম পূরণ করে সাবমিট দেয়
                await db.execute('UPDATE orders SET status=?, customer_name=?, phone=?, address=? WHERE id=?', 
                [status, name, phone, address, id]);
            } else {
                // অ্যাডমিন যখন কনফার্ম করে
                await db.execute('UPDATE orders SET status=? WHERE id=?', [status, id]);
            }
            res.status(200).json({ status: "Updated" });
        }
        else if (req.method === 'DELETE') {
            await db.execute('DELETE FROM orders WHERE id = ?', [req.body.id]);
            res.status(200).json({ status: "Deleted" });
        }
    } catch (e) {
        console.error("Order API Error:", e);
        res.status(500).json({ error: e.message });
    } finally {
        await db.end();
    }
}
