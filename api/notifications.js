import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    try {
        if (req.method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const email = url.searchParams.get('email');
            if (!email) return res.status(400).json({ error: "Email is required" });

            // কাস্টমারের ইমেইল অনুযায়ী সব নোটিফিকেশন নিয়ে আসা হচ্ছে
            const [rows] = await db.execute('SELECT * FROM notifications WHERE email = ? ORDER BY id DESC', [email]);
            return res.status(200).json(rows);
        } 
        else if (req.method === 'PUT') {
            const b = req.body;
            // নোটিফিকেশন পেজ ওপেন করলে সবগুলো 'Read' মার্ক করে দেওয়া হবে
            if (b.action === 'read_all') {
                await db.execute('UPDATE notifications SET is_read = TRUE WHERE email = ?', [b.email]);
                return res.status(200).json({ status: "Success" });
            }
        } 
        else if (req.method === 'DELETE') {
            const b = req.body;
            // ১. সব নোটিফিকেশন একসাথে ডিলিট করা (Clear All)
            if (b.action === 'clear_all') {
                await db.execute('DELETE FROM notifications WHERE email = ?', [b.email]);
                return res.status(200).json({ status: "Success" });
            } 
            // ২. নির্দিষ্ট নোটিফিকেশন ডিলিট করা
            else {
                await db.execute('DELETE FROM notifications WHERE id = ?', [b.id]);
                return res.status(200).json({ status: "Success" });
            }
        }
    } catch (e) {
        console.error("Notifications API Error:", e);
        return res.status(500).json({ error: e.message });
    }
}
