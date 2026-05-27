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

            const [existing] = await db.execute(
                'SELECT * FROM bag WHERE email = ? AND product_name = ? AND size = ?',
                [b.email, b.products, size]
            );

            if (existing.length > 0) {
                const newQty = existing[0].quantity + qty;
                await db.execute(
                    'UPDATE bag SET quantity = ? WHERE id = ?',
                    [newQty, existing[0].id]
                );
                // সফলভাবে আপডেট হলে আইডি ফেরত পাঠানো হচ্ছে
                return res.status(200).json({ status: "Success", id: existing[0].id });
            } else {
                const [result] = await db.execute(
                    'INSERT INTO bag (email, product_name, price, image_url, size, quantity) VALUES (?, ?, ?, ?, ?, ?)',
                    [b.email, b.products, b.total_price, b.image_url, size, qty]
                );
                // নতুন আইটেম তৈরি হলে ডাটাবেজ থেকে পাওয়া insertId ফেরত পাঠানো হচ্ছে
                return res.status(200).json({ status: "Success", id: result.insertId });
            }
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
