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
            res.status(200).json(rows);
        } 
        else if (req.method === 'POST') {
            const b = req.body;
            // Cart বা Pending সেট করার লজিক
            const status = b.action === 'add_to_cart' ? 'Cart' : 'Pending';
            
            // সব ফিল্ড ঠিকমতো আছে কি না চেক করে ইনসার্ট
            await db.execute(
                'INSERT INTO orders (customer_name, phone, address, email, products, total_price, status, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [b.name || 'N/A', b.phone || 'N/A', b.address || 'N/A', b.email, b.products, b.total_price || 0, status, b.image_url || '']
            );
            res.status(200).json({ status: "Success" });
        }
        else if (req.method === 'PUT') {
            const { id, status } = req.body;
            await db.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
            res.status(200).json({ status: "Updated" });
        }
        else if (req.method === 'DELETE') {
            const { id } = req.body;
            await db.execute('DELETE FROM orders WHERE id = ?', [id]);
            res.status(200).json({ status: "Deleted" });
        }
    } catch (e) {
        console.error("DB Error:", e); // এই এররটি ভেরসেল লগ এ দেখা যাবে
        res.status(500).json({ error: e.message });
    } finally {
        await db.end(); // সংযোগ বন্ধ করা নিশ্চিত করা
    }
}
