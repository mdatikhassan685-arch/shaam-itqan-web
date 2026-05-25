import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    try {
        // ১. ডাটাবেজের bag টেবিল থেকে কাস্টমারের ইমেইল অনুযায়ী কার্ট ডাটা তুলে আনার লজিক
        if (req.method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const email = url.searchParams.get('email');
            if (!email) {
                return res.status(400).json({ error: "Email is required" });
            }

            const [rows] = await db.execute('SELECT * FROM bag WHERE email = ? ORDER BY id DESC', [email]);
            return res.status(200).json(rows);
        } 
        
        // ২. কাস্টমার যখন Add to Bag করবে, তখন ডাটাবেজের bag টেবিলে তথ্য সেভ করার লজিক
        else if (req.method === 'POST') {
            const b = req.body;
            await db.execute(
                'INSERT INTO bag (email, product_name, price, image_url) VALUES (?, ?, ?, ?)',
                [b.email, b.products, b.total_price, b.image_url]
            );
            return res.status(200).json({ status: "Success" });
        } 
        
        // ৩. কাস্টমার যখন কার্ট থেকে কোনো আইটেম ডিলিট করবে, তখন ডাটাবেজের bag টেবিল থেকে মুছে ফেলার লজিক
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
