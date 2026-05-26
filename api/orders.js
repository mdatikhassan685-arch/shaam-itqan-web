import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    try {
        if (req.method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const email = url.searchParams.get('email');
            
            let query = "SELECT * FROM orders ORDER BY id DESC";
            let params = [];
            
            if (email) {
                query = 'SELECT * FROM orders WHERE email = ? ORDER BY id DESC';
                params = [email];
            }
            
            const [rows] = await db.execute(query, params);
            return res.status(200).json(rows);
        } 
        else if (req.method === 'POST') {
            const b = req.body;
            
            // কাস্টমার চেকআউট করছে
            if (b.action === 'checkout') {
                // ১. কাস্টমারের ব্যাগের আইটেমগুলো ডাটাবেজ থেকে নিয়ে আসা
                const [cartItems] = await db.execute('SELECT * FROM bag WHERE email = ?', [b.email]);
                if (cartItems.length === 0) {
                    return res.status(400).json({ error: "Bag is empty" });
                }

                // ২. প্রোডাক্টের নাম, সাইজ এবং কোয়ান্টিটি মিলিয়ে ডিটেইল্ড ডেসক্রিপশন ও মোট মূল্য হিসাব করা
                let total = 0;
                const productDetailsArray = cartItems.map(item => {
                    const itemQty = parseInt(item.quantity) || 1;
                    total += parseFloat(item.price) * itemQty;
                    // অ্যাডমিন প্যানেলে দেখার সুবিধার্থে নাম, সাইজ ও কোয়ান্টিটি একসাথে জোড়া দেওয়া হলো
                    return `${item.product_name} (Size: ${item.size}, Qty: ${itemQty})`;
                });
                const combinedProducts = productDetailsArray.join(', ');

                // ৩. একটি নতুন অর্ডার ইনসার্ট করা
                await db.execute(
                    'INSERT INTO orders (customer_name, phone, address, email, products, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [b.name, b.phone, b.address, b.email, combinedProducts, total, 'Pending']
                );

                // ৪. অর্ডার সফল হওয়ার পর ব্যাগ থেকে কাস্টমারের আইটেমগুলো মুছে ফেলা (কার্ট ক্লিয়ার)
                await db.execute('DELETE FROM bag WHERE email = ?', [b.email]);

                return res.status(200).json({ status: "Success" });
            } 
            // অ্যাডমিন প্যানেল থেকে অর্ডার কনফার্ম করার জন্য
            else if (b.action === 'confirm') {
                await db.execute(
                    'UPDATE orders SET status = "Confirmed" WHERE id = ?',
                    [b.id]
                );
                return res.status(200).json({ status: "Success" });
            }
        }
    } catch (e) {
        console.error("Orders API Error:", e);
        return res.status(500).json({ error: e.message });
    }
}
