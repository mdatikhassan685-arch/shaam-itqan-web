import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    try {
        // ১. GET মেথড হ্যান্ডলার (কাস্টমার নোটিফিকেশন লোড করার জন্য)
        if (req.method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const email = url.searchParams.get('email');
            if (!email) {
                return res.status(400).json({ error: "Email is required" });
            }

            const [rows] = await db.execute('SELECT * FROM notifications WHERE email = ? ORDER BY id DESC', [email]);
            return res.status(200).json(rows);
        } 
        
        // ২. POST মেথড হ্যান্ডলার (অ্যাডমিন থেকে নোটিফিকেশন পাঠানোর জন্য)
        else if (req.method === 'POST') {
            const b = req.body;
            
            // সিকিউরিটি ভেরিফিকেশন চেক
            if (b.token !== process.env.ADMIN_TOKEN || b.pin !== process.env.ADMIN_PIN) {
                return res.status(401).json({ error: "Unauthorized access! Admin Verification failed." });
            }

            if (b.action === 'send_admin_notif') {
                const { target_type, email, title, message } = b;
                
                if (!title || !message) {
                    return res.status(400).json({ error: "Title and Message are required!" });
                }

                // নির্দিষ্ট কাস্টমারকে নোটিফিকেশন পাঠানো
                if (target_type === 'single') {
                    if (!email) return res.status(400).json({ error: "Target email is required!" });
                    await db.execute('INSERT INTO notifications (email, title, message) VALUES (?, ?, ?)', [email, title, message]);
                    return res.status(200).json({ status: "Success" });
                } 
                // সব কাস্টমারকে একসাথে নোটিফিকেশন পাঠানো
                else if (target_type === 'all') {
                    const [users] = await db.execute('SELECT email FROM users');
                    if (users.length === 0) {
                        return res.status(200).json({ status: "Success", message: "No registered users found." });
                    }

                    const values = [];
                    const placeholders = users.map(u => {
                        values.push(u.email, title, message);
                        return '(?, ?, ?)';
                    }).join(',');

                    await db.execute(`INSERT INTO notifications (email, title, message) VALUES ${placeholders}`, values);
                    return res.status(200).json({ status: "Success" });
                }
                
                return res.status(400).json({ error: "Invalid target type specified." });
            }
            
            return res.status(400).json({ error: "Invalid POST action specified." });
        }
        
        // ৩. PUT মেথড হ্যান্ডলার (সব নোটিফিকেশন 'Read' করার জন্য)
        else if (req.method === 'PUT') {
            const b = req.body;
            if (b.action === 'read_all') {
                await db.execute('UPDATE notifications SET is_read = TRUE WHERE email = ?', [b.email]);
                return res.status(200).json({ status: "Success" });
            }
            return res.status(400).json({ error: "Invalid PUT action specified." });
        } 
        
        // ৪. DELETE মেথড হ্যান্ডলার (সিঙ্গেল বা অল নোটিফিকেশন ডিলিট করার জন্য)
        else if (req.method === 'DELETE') {
            const b = req.body;
            // সব নোটিফিকেশন ডিলিট করা
            if (b.action === 'clear_all') {
                await db.execute('DELETE FROM notifications WHERE email = ?', [b.email]);
                return res.status(200).json({ status: "Success" });
            } 
            // নির্দিষ্ট নোটিফিকেশন ডিলিট করা
            else if (b.id) {
                await db.execute('DELETE FROM notifications WHERE id = ?', [b.id]);
                return res.status(200).json({ status: "Success" });
            }
            return res.status(400).json({ error: "Invalid DELETE action or missing ID." });
        }

        // অন্য কোনো মেথড আসলে Method Not Allowed রেসপন্স যাবে
        return res.status(405).json({ error: "Method Not Allowed" });

    } catch (e) {
        console.error("Notifications API Error:", e);
        return res.status(500).json({ error: e.message });
    }
}
