import crypto from 'crypto';
import { getDb } from './db.js';

// পাসওয়ার্ড হ্যাশ করার জন্য হেল্পার ফাংশন (PBKDF2)
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

// ইনপুট দেওয়া পাসওয়ার্ডের সাথে ডাটাবেজের হ্যাশ মেলানোর ফাংশন
function verifyPassword(password, storedPassword) {
    try {
        const [salt, originalHash] = storedPassword.split(':');
        const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        return hash === originalHash;
    } catch (e) {
        return false;
    }
}

export default async function handler(req, res) {
    const db = await getDb();

    try {
        // ১. GET মেথড: ইউজার অ্যানালিটিক্স পরিসংখ্যান (Vercel-এর ১২টি এপিআই লিমিট এড়াতে এখানে যুক্ত করা হলো)
        if (req.method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const email = url.searchParams.get('email');
            const action = url.searchParams.get('action');

            if (action === 'stats') {
                if (!email) return res.status(400).json({ error: "Email is required" });

                // অর্ডারের পরিসংখ্যান (Total, Pending, Confirmed, Shipped, Delivered, Cancelled)
                const [orderRows] = await db.execute(
                    'SELECT status, COUNT(*) as count FROM orders WHERE email = ? GROUP BY status',
                    [email]
                );

                let stats = {
                    total: 0,
                    pending: 0,
                    confirmed: 0,
                    shipped: 0,
                    delivered: 0,
                    cancelled: 0,
                    bag_count: 0,
                    wishlist_count: 0
                };

                orderRows.forEach(row => {
                    const status = row.status.toLowerCase();
                    const count = parseInt(row.count) || 0;
                    stats.total += count;
                    if (status === 'pending') stats.pending = count;
                    else if (status === 'confirmed') stats.confirmed = count;
                    else if (status === 'shipped') stats.shipped = count;
                    else if (status === 'delivered') stats.delivered = count;
                    else if (status === 'cancelled') stats.cancelled = count;
                });

                // কার্ট আইটেমের মোট পরিমাণ
                const [bagRows] = await db.execute(
                    'SELECT SUM(quantity) as bag_qty FROM bag WHERE email = ?',
                    [email]
                );
                stats.bag_count = parseInt(bagRows[0]?.bag_qty) || 0;

                // উইশলিস্টের আইটেম সংখ্যা
                const [wishlistRows] = await db.execute(
                    'SELECT COUNT(*) as wish_qty FROM wishlist WHERE email = ?',
                    [email]
                );
                stats.wishlist_count = parseInt(wishlistRows[0]?.wish_qty) || 0;

                return res.status(200).json(stats);
            }

            return res.status(400).json({ error: "Invalid GET action specified" });
        } 
        
        // ২. POST মেথড: ইউজার লগইন, সাইনআপ ও অ্যাডমিন ভেরিফিকেশন
        else if (req.method === 'POST') {
            const { action, email, password, name, token, pin } = req.body;

            // Admin Login Logic
            if (action === 'admin_login') {
                if (token === process.env.ADMIN_TOKEN && pin === process.env.ADMIN_PIN) {
                    return res.status(200).json({ status: "Success" });
                } else {
                    return res.status(401).json({ message: "Invalid Admin Credentials" });
                }
            } 
            
            // User Signup Logic
            else if (action === 'signup') {
                if (!email || !password || !name) {
                    return res.status(400).json({ message: "All fields are required" });
                }

                const passwordHash = hashPassword(password);
                
                await db.execute(
                    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', 
                    [name, email, passwordHash]
                );
                return res.status(200).json({ message: "Success" });
            } 
            
            // User Login Logic
            else {
                if (!email || !password) {
                    return res.status(400).json({ message: "Email and Password are required" });
                }

                const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
                
                if (users.length > 0) {
                    const user = users[0];
                    
                    if (verifyPassword(password, user.password_hash)) {
                        delete user.password_hash;
                        return res.status(200).json({ user: user });
                    }
                }
                
                return res.status(401).json({ message: "Invalid email or password" });
            }
        }
    } catch (e) {
        console.error("Auth API Error:", e);
        return res.status(500).json({ error: e.message });
    }
}
