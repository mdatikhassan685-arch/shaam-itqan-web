import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    try {
        if (req.method === 'GET') {
            // ইউজারের ইমেইল বা গেস্ট আইডি দিয়ে তার ব্যাগ আইটেমগুলো লোড করা
            const email = new URL(req.url, `http://${req.headers.host}`).searchParams.get('email');
            const [rows] = await db.execute('SELECT * FROM bag WHERE email = ?', [email]);
            res.status(200).json(rows);
        } 
        else if (req.method === 'POST') {
            const { email, name, price, image_url, size, quantity } = req.body;
            
            // নতুন আইটেম ব্যাগে যোগ করা
            await db.execute(
                'INSERT INTO bag (email, product_name, price, image_url, size, quantity) VALUES (?, ?, ?, ?, ?, ?)', 
                [email, name, price, image_url, size, quantity]
            );
            res.status(200).json({ status: "Success" });
        } 
        else if (req.method === 'DELETE') {
            const { id } = req.body;
            // ব্যাগ থেকে নির্দিষ্ট আইটেম রিমুভ করা
            await db.execute('DELETE FROM bag WHERE id = ?', [id]);
            res.status(200).json({ status: "Deleted" });
        }
    } catch (e) {
        console.error("Bag API Error:", e);
        res.status(500).json({ error: e.message });
    } finally {
        await db.end();
    }
}
