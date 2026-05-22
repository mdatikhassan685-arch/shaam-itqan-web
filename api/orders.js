import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    try {
        if (req.method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const status = url.searchParams.get('status');
            const query = status ? 'SELECT * FROM orders WHERE status = ? ORDER BY id DESC' : 'SELECT * FROM orders ORDER BY id DESC';
            const [rows] = await db.execute(query, status ? [status] : []);
            res.status(200).json(rows);
        } 
        else if (req.method === 'POST') {
            const b = req.body;
            // এখানে ১৪টি কলামের জন্য ১৪টি "?" দেওয়া হয়েছে
            // কলাম: customer_name, phone, address, products, total_price, status, created_at(বাদ), email, image_url, payment_method, alt_phone, district, order_note
            // Note: created_at ডাটাবেস অটোমেটিক হ্যান্ডেল করবে।
            await db.execute(
                'INSERT INTO orders (customer_name, phone, address, products, total_price, status, email, image_url, payment_method, alt_phone, district, order_note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    b.name || 'N/A', 
                    b.phone || 'N/A', 
                    b.address || 'N/A', 
                    b.products || 'Unknown', 
                    b.total_price || 0, 
                    b.status || 'Checkout_Pending', 
                    b.email || 'guest', 
                    b.image_url || '',
                    b.payment_method || 'COD',
                    b.alt_phone || '',
                    b.district || 'Dhaka',
                    b.order_note || ''
                ]
            );
            res.status(200).json({ status: "Success" });
        }
        else if (req.method === 'PUT') {
            const b = req.body;
            if(b.status === 'Pending') {
                await db.execute(
                    'UPDATE orders SET status=?, customer_name=?, phone=?, address=?, alt_phone=?, district=?, payment_method=?, order_note=? WHERE id=?', 
                    [b.status, b.name, b.phone, b.alt_phone, b.address, b.district, b.payment_method, b.order_note, b.id]
                );
            } else {
                await db.execute('UPDATE orders SET status=? WHERE id=?', [b.status, b.id]);
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
