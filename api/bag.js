import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    try {
        if (req.method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const email = url.searchParams.get('email');
            if (!email) {
                return res.status(400).json({ error: "Email is required" });
            }

            const [rows] = await db.execute('SELECT * FROM bag WHERE email = ? ORDER BY id DESC', [email]);
            return res.status(200).json(rows);
        } 
        else if (req.method === 'POST') {
            const b = req.body;
            const size = b.size || 'M';
            const qty = parseInt(b.quantity) || 1;

            // ডাটাবেজে একই সাইজের এই প্রোডাক্টটি কাস্টমার আগেই ব্যাগে যুক্ত করেছে কি না চেক করা হচ্ছে
            const [existing] = await db.execute(
                'SELECT * FROM bag WHERE email = ? AND product_name = ? AND size = ?',
                [b.email, b.products, size]
            );

            if (existing.length > 0) {
                // প্রোডাক্ট অলরেডি থাকলে কোয়ান্টিটি আগেরটার সাথে যোগ হচ্ছে
                const newQty = existing[0].quantity + qty;
                await db.execute(
                    'UPDATE bag SET quantity = ? WHERE id = ?',
                    [newQty, existing[0].id]
                );
            } else {
                // নতুন আইটেম হলে ডাটাবেজে যুক্ত করা হচ্ছে
                await db.execute(
                    'INSERT INTO bag (email, product_name, price, image_url, size, quantity) VALUES (?, ?, ?, ?, ?, ?)',
                    [b.email, b.products, b.total_price, b.image_url, size, qty]
                );
            }
            
            return res.status(200).json({ status: "Success" });
        } 
        else if (req.method === 'DELETE') {
            const { id } = req.body;
            await db.execute('DELETE FROM bag WHERE id = ?', [id]);
            return res.status(200).json({ status: "Deleted" });
        }
    } catch (e) {
        console.error("Bag API Error:", e);
        return res.status(500).json({ error: e.message });
    }
}
