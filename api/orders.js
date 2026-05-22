import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    try {
        if (req.method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const status = url.searchParams.get('status');
            
            let query = 'SELECT * FROM orders ORDER BY id DESC';
            let params = [];
            if (status) {
                query = 'SELECT * FROM orders WHERE status = ? ORDER BY id DESC';
                params = [status];
            }
            
            const [rows] = await db.execute(query, params);
            res.status(200).json(rows);
        } 
        else if (req.method === 'POST') {
            const b = req.body;
            
            // ডাটাবেসের ১১টি কলামের সাথে মিল রেখে INSERT কুয়েরি
            // কলাম: customer_name, phone, alt_phone, address, district, payment_method, email, products, total_price, status, image_url
            await db.execute(
                'INSERT INTO orders (customer_name, phone, alt_phone, address, district, payment_method, email, products, total_price, status, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    b.name || 'N/A', 
                    b.phone || 'N/A', 
                    b.alt_phone || '', 
                    b.address || 'N/A', 
                    b.district || 'Dhaka', 
                    b.payment_method || 'COD', 
                    b.email || 'guest', 
                    b.products || 'Unknown', 
                    b.total_price || 0, 
                    b.status || 'Checkout_Pending', 
                    b.image_url || ''
                ]
            );
            res.status(200).json({ status: "Success" });
        }
        else if (req.method === 'PUT') {
            const b = req.body;
            
            // যখন ইউজার চেকআউট ফর্ম পূরণ করে সাবমিট দেয় (Status: Pending)
            if(b.status === 'Pending') {
                await db.execute(
                    'UPDATE orders SET status=?, customer_name=?, phone=?, alt_phone=?, address=?, district=?, payment_method=? WHERE id=?', 
                    [b.status, b.name, b.phone, b.alt_phone, b.address, b.district, b.payment_method, b.id]
                );
            } else {
                // অ্যাডমিন যখন অর্ডার কনফার্ম বা অন্য স্ট্যাটাস পরিবর্তন করে
                await db.execute('UPDATE orders SET status=? WHERE id=?', [b.status, b.id]);
            }
            res.status(200).json({ status: "Updated" });
        }
        else if (req.method === 'DELETE') {
            await db.execute('DELETE FROM orders WHERE id = ?', [req.body.id]);
            res.status(200).json({ status: "Deleted" });
        }
    } catch (e) {
        console.error("Database Error:", e);
        res.status(500).json({ error: e.message });
    } finally {
        await db.end();
    }
}
