import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    try {
        // ১. GET মেথড: নোটিফিকেশন লিস্ট এবং ইউজার/অ্যাডমিন স্ট্যাটস লোড করার লজিক
        if (req.method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const action = url.searchParams.get('action');
            const email = url.searchParams.get('email');

            if (!email) {
                return res.status(400).json({ error: "Email is required" });
            }

            // ক) নোটিফিকেশন লিস্ট লোড করা
            if (action === 'get_notifications') {
                const [rows] = await db.execute('SELECT * FROM notifications WHERE email = ? ORDER BY id DESC', [email]);
                return res.status(200).json(rows);
            } 
            
            // খ) গ্রাহক ও অ্যাডমিনের জন্য ডাইনামিক স্ট্যাটস/ট্রাস্ট-ইনডেক্স ক্যালকুলেট করা
            else if (action === 'get_stats') {
                // গ্রাহকের অর্ডার হিস্টোরি গুনে ফেচ করা হচ্ছে
                const [orderRows] = await db.execute(
                    'SELECT status, COUNT(*) as count FROM orders WHERE email = ? GROUP BY status', 
                    [email]
                );

                // ডিফল্ট ড্যাশবোর্ড ডাটা স্ট্রাকচার
                let stats = { 
                    total_orders: 0, 
                    pending: 0, 
                    confirmed: 0, 
                    shipped: 0, 
                    delivered: 0, 
                    returned: 0, 
                    cancelled: 0,
                    cart_count: 0,
                    wishlist_count: 0
                };

                orderRows.forEach(row => {
                    const count = parseInt(row.count) || 0;
                    stats.total_orders += count;
                    const status = row.status.toLowerCase();
                    
                    if (status === 'pending') stats.pending = count;
                    else if (status === 'confirmed') stats.confirmed = count;
                    else if (status === 'shipped') stats.shipped = count;
                    else if (status === 'delivered') stats.delivered = count;
                    else if (status === 'returned') stats.returned = count;
                    else if (status === 'cancelled') stats.cancelled = count;
                });

                // গ্রাহকের কার্টে থাকা আইটেম সংখ্যা গণনা
                const [bagRows] = await db.execute('SELECT COUNT(*) as count FROM bag WHERE email = ?', [email]);
                stats.cart_count = bagRows[0]?.count || 0;

                // গ্রাহকের উইশলিস্টে থাকা আইটেম সংখ্যা গণনা
                const [wishRows] = await db.execute('SELECT COUNT(*) as count FROM wishlist WHERE email = ?', [email]);
                stats.wishlist_count = wishRows[0]?.count || 0;

                // অ্যাডমিন কুয়েরি করছে কি না সিকিউরিটি ভেরিফিকেশন চেক
                const token = url.searchParams.get('token');
                const pin = url.searchParams.get('pin');
                const isAdmin = token === process.env.ADMIN_TOKEN && pin === process.env.ADMIN_PIN;

                if (isAdmin) {
                    const total = stats.total_orders;
                    const del = stats.delivered;
                    const ret = stats.returned;
                    
                    // সফল ডেলিভারি এবং রিটার্নের অনুপাত গাণিতিকভাবে হিসাব করা
                    const successRate = total > 0 ? ((del / total) * 100).toFixed(2) : "0.00";
                    const returnRate = total > 0 ? ((ret / total) * 100).toFixed(2) : "0.00";
                    
                    // কাস্টমারের বিশ্বস্ততার ওপর ভিত্তি করে অটোমেটিক ব্যাজ নির্ধারণ
                    let trustBadge = "New Customer";
                    if (total > 0) {
                        if (del >= 5 && ret === 0) trustBadge = "VIP Customer 🌟";
                        else if (ret > del) trustBadge = "High Return Risk ⚠️";
                        else if (del >= 1) trustBadge = "Trusted Buyer ✅";
                        else if (stats.cancelled > 2 && del === 0) trustBadge = "Spam Suspicion ⚠️";
                    }

                    // কার্ট রিকভারি ডাটা: গ্রাহক বর্তমানে কার্টে কী ফেলে রেখেছেন
                    const [abandonedCart] = await db.execute(
                        'SELECT product_name, size, quantity FROM bag WHERE email = ?', 
                        [email]
                    );

                    // উইশলিস্ট রিকভারি ডাটা: গ্রাহক বর্তমানে উইশলিস্টে কী রেখেছেন
                    const [abandonedWishlist] = await db.execute(
                        'SELECT p.name, p.price FROM wishlist w JOIN products p ON w.product_id = p.id WHERE w.email = ?', 
                        [email]
                    );

                    // অ্যাডমিন ড্যাশবোর্ডে শো করার জন্য অতিরিক্ত ডাটা যুক্ত করা হলো
                    stats.admin_metrics = {
                        success_rate: successRate + "%",
                        return_rate: returnRate + "%",
                        trust_badge: trustBadge,
                        abandoned_cart: abandonedCart,
                        abandoned_wishlist: abandonedWishlist
                    };
                }

                return res.status(200).json(stats);
            }
            
            return res.status(400).json({ error: "Invalid GET action specified." });
        } 
        
        // ২. POST মেথড: নোটিফিকেশন সিঙ্গেল বা ব্রডকাস্ট পাঠানোর লজিক
        else if (req.method === 'POST') {
            const b = req.body;
            
            if (b.action === 'send_admin_notif') {
                // অ্যাডমিন ভেরিফিকেশন চেক
                if (b.token !== process.env.ADMIN_TOKEN || b.pin !== process.env.ADMIN_PIN) {
                    return res.status(401).json({ error: "Unauthorized access! Admin Verification failed." });
                }

                const { target_type, email, title, message, link_url, image_url } = b;
                
                if (!title || !message) {
                    return res.status(400).json({ error: "Title and Message are required!" });
                }

                // নির্দিষ্ট ইউজারকে নোটিফিকেশন পাঠানো
                if (target_type === 'single') {
                    if (!email) return res.status(400).json({ error: "Target email is required!" });
                    await db.execute(
                        'INSERT INTO notifications (email, title, message, link_url, image_url) VALUES (?, ?, ?, ?, ?)', 
                        [email, title, message, link_url || '', image_url || '']
                    );
                    return res.status(200).json({ status: "Success" });
                } 
                // সব রেজিস্টার্ড ইউজারকে নোটিফিকেশন ব্রডকাস্ট করা
                else if (target_type === 'all') {
                    const [users] = await db.execute('SELECT email FROM users');
                    if (users.length === 0) {
                        return res.status(200).json({ status: "Success", message: "No registered users found." });
                    }

                    const values = [];
                    const placeholders = users.map(u => {
                        values.push(u.email, title, message, link_url || '', image_url || '');
                        return '(?, ?, ?, ?, ?)';
                    }).join(',');

                    await db.execute(`INSERT INTO notifications (email, title, message, link_url, image_url) VALUES ${placeholders}`, values);
                    return res.status(200).json({ status: "Success" });
                }
                
                return res.status(400).json({ error: "Invalid target type specified." });
            }
            return res.status(400).json({ error: "Invalid POST action specified." });
        }
        
        // ৩. PUT মেথড: গ্রাহকের নোটিফিকেশন পঠিত (Read) মার্ক করা
        else if (req.method === 'PUT') {
            const b = req.body;
            if (b.action === 'read_all') {
                await db.execute('UPDATE notifications SET is_read = TRUE WHERE email = ?', [b.email]);
                return res.status(200).json({ status: "Success" });
            }
            return res.status(400).json({ error: "Invalid PUT action specified." });
        } 
        
        // ৪. DELETE মেথড: নোটিফিকেশন ডিলিট বা ক্লিয়ার অল করা
        else if (req.method === 'DELETE') {
            const b = req.body;
            if (b.action === 'clear_all') {
                await db.execute('DELETE FROM notifications WHERE email = ?', [b.email]);
                return res.status(200).json({ status: "Success" });
            } else if (b.id) {
                await db.execute('DELETE FROM notifications WHERE id = ?', [b.id]);
                return res.status(200).json({ status: "Success" });
            }
            return res.status(400).json({ error: "Invalid DELETE action or missing ID." });
        }

        return res.status(405).json({ error: "Method Not Allowed" });

    } catch (e) {
        console.error("User Hub API Error:", e);
        return res.status(500).json({ error: e.message });
    }
}
