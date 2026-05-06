// api/orders.js
import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    
    try {
        const method = req.method;

        // GET: অর্ডার লিস্ট বা কার্ট দেখার জন্য
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

        // POST: কার্টে পণ্য যোগ অথবা অর্ডার কনফার্ম (চেকআউট)
        else if (method === 'POST') {
            const b = req.body;

            // যদি এটি কার্টে পণ্য যোগ করা হয় (add_to_cart)
            if (b.action === 'add_to_cart') {
                if (!b.email || !b.products || !b.total_price) {
                    return res.status(400).json({ error: "Missing required cart fields" });
                }
                
                await db.execute(
                    'INSERT INTO orders (email, products, total_price, status, image_url) VALUES (?, ?, ?, ?, ?)',
                    [b.email, b.products, b.total_price, 'Cart', b.image_url]
                );
            } 
            // যদি এটি ফাইনাল চেকআউট বা অর্ডার কনফার্মেশন হয়
            else {
                if (!b.name || !b.phone || !b.address || !b.email) {
                    return res.status(400).json({ error: "Missing delivery details" });
                }

                // ইমেইল এবং স্ট্যাটাস 'Cart' চেক করে আপডেট করছি
                const [result] = await db.execute(
                    'UPDATE orders SET customer_name = ?, phone = ?, address = ?, status = ? WHERE email = ? AND status = ?',
                    [b.name, b.phone, b.address, 'Pending', b.email, 'Cart']
                );

                if (result.affectedRows === 0) {
                    return res.status(404).json({ error: "No cart items found for this user" });
                }
            }
            return res.status(200).json({ message: "Success" });
        }

        // DELETE: কার্ট থেকে কোনো নির্দিষ্ট পণ্য রিমুভ করা
        else if (method === 'DELETE') {
            const { id } = req.body;
            if (!id) return res.status(400).json({ error: "Order ID required" });

            await db.execute('DELETE FROM orders WHERE id = ?', [id]);
            return res.status(200).json({ message: "Deleted" });
        }

    } catch (e) {
        console.error("Orders API Error:", e);
        res.status(500).json({ error: "Internal Server Error", details: e.message });
    }
}
