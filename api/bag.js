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

            // LEFT JOIN ব্যবহার করে কার্ট আইটেম লোড করার সময় প্রোডাক্টের রিয়েল-টাইম সাইজ ভিত্তিক স্টকও রিট্রিভ করা হচ্ছে
            const [rows] = await db.execute(`
                SELECT b.*, p.stock_s, p.stock_m, p.stock_l, p.stock_xl, p.stock_xxl 
                FROM bag b 
                LEFT JOIN products p ON b.product_name = p.name 
                WHERE b.email = ? 
                ORDER BY b.id DESC
            `, [email]);
            
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
                return res.status(200).json({ status: "Success", id: existing[0].id });
            } else {
                const [result] = await db.execute(
                    'INSERT INTO bag (email, product_name, price, image_url, size, quantity) VALUES (?, ?, ?, ?, ?, ?)',
                    [b.email, b.products, b.total_price, b.image_url, size, qty]
                );
                return res.status(200).json({ status: "Success", id: result.insertId });
            }
        } 
        // PUT মেথড ডাইনামিক করা হলো যাতে কোয়ান্টিটি এবং সাইজ একই সাথে আপডেট করা যায়
        else if (req.method === 'PUT') {
            const { id, quantity, size } = req.body;
            
            if (!id) {
                return res.status(400).json({ error: "Invalid ID!" });
            }

            if (quantity !== undefined && size !== undefined) {
                const qty = parseInt(quantity);
                await db.execute('UPDATE bag SET quantity = ?, size = ? WHERE id = ?', [qty, size, id]);
            } else if (quantity !== undefined) {
                const qty = parseInt(quantity);
                await db.execute('UPDATE bag SET quantity = ? WHERE id = ?', [qty, id]);
            } else if (size !== undefined) {
                await db.execute('UPDATE bag SET size = ? WHERE id = ?', [size, id]);
            }

            return res.status(200).json({ status: "Updated" });
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
