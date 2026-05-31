import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    try {
        // ১. GET মেথড: কাস্টমারের পছন্দের সব প্রোডাক্টের ডিটেইলস SQL JOIN দিয়ে নিয়ে আসা হচ্ছে
        if (req.method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const email = url.searchParams.get('email');
            if (!email) return res.status(400).json({ error: "Email is required" });

            const [rows] = await db.execute(
                'SELECT p.* FROM wishlist w JOIN products p ON w.product_id = p.id WHERE w.email = ? ORDER BY w.id DESC',
                [email]
            );
            return res.status(200).json(rows);
        } 
        
        // ২. POST মেথড: এক ক্লিকে টগল লজিক (কার্টে থাকলে রিমুভ হবে, না থাকলে অ্যাড হবে)
        else if (req.method === 'POST') {
            const { email, product_id } = req.body;
            if (!email || !product_id) {
                return res.status(400).json({ error: "Email and Product ID are required!" });
            }

            // ইতিমধ্যে উইশলিস্টে আছে কি না চেক করা হচ্ছে
            const [existing] = await db.execute('SELECT * FROM wishlist WHERE email = ? AND product_id = ?', [email, product_id]);
            
            if (existing.length > 0) {
                // থাকলে ডিলিট (রিমুভ) হবে
                await db.execute('DELETE FROM wishlist WHERE email = ? AND product_id = ?', [email, product_id]);
                return res.status(200).json({ status: "Removed" });
            } else {
                // না থাকলে ইনসার্ট (যোগ) হবে
                await db.execute('INSERT INTO wishlist (email, product_id) VALUES (?, ?)', [email, product_id]);
                return res.status(200).json({ status: "Added" });
            }
        }
    } catch (e) {
        console.error("Wishlist API Error:", e);
        return res.status(500).json({ error: e.message });
    }
}
