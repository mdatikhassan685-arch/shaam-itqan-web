import { getDb } from './db.js';

// ওয়ানসিগন্যাল এপিআই-এর মাধ্যমে রিয়েল-টাইম পুশ নোটিফিকেশন পাঠানোর কোর হেল্পার ফাংশন
async function sendPushNotification(emails, title, message, url = '') {
    const appId = process.env.ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;
    if (!appId || !apiKey) return;

    const payload = {
        app_id: appId,
        headings: { en: title },
        contents: { en: message },
        target_channel: "push"
    };

    if (url) {
        payload.web_url = url;
    }

    // নির্দিষ্ট কাস্টমারকে টার্গেট করার জন্য (ইমেল আইডি সিঙ্ক করে)
    if (emails && emails.length > 0) {
        payload.include_aliases = {
            external_id: emails.map(e => e.trim().toLowerCase())
        };
    } else {
        // যদি ইমেল না থাকে তবে সাইটের সকল সাবস্ক্রাইবড ইউজারকে ব্রডকাস্ট পাঠানো হবে
        payload.included_segments = ["Subscribed Users"];
    }

    try {
        await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Authorization': `Key ${apiKey}`
            },
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.error("OneSignal push error:", e);
    }
}

export default async function handler(req, res) {
    const db = await getDb();
    try {
        // ১. GET মেথড: নোটিফিকেশন, ইউজার স্ট্যাটস এবং কাস্টমার রিভিউ লোড করা
        if (req.method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const action = url.searchParams.get('action');
            const email = url.searchParams.get('email');

            // ক) কাস্টমার রিভিউ লোড করার কুয়েরি
            if (action === 'get_reviews') {
                const productId = url.searchParams.get('product_id');
                if (!productId) {
                    return res.status(400).json({ error: "Product ID is required" });
                }
                const [rows] = await db.execute(
                    'SELECT * FROM product_reviews WHERE product_id = ? ORDER BY id DESC',
                    [productId]
                );
                return res.status(200).json(rows);
            }

            // খ) অ্যাডমিনের জন্য সব কাস্টমার রিভিউ একসাথে লোড করার ডাইনামিক কুয়েরি
            if (action === 'get_all_reviews') {
                const token = url.searchParams.get('token');
                const pin = url.searchParams.get('pin');
                
                if (token !== process.env.ADMIN_TOKEN || pin !== process.env.ADMIN_PIN) {
                    return res.status(401).json({ error: "Unauthorized access! Admin Verification failed." });
                }

                const [rows] = await db.execute(`
                    SELECT r.*, p.name as product_name 
                    FROM product_reviews r 
                    JOIN products p ON r.product_id = p.id 
                    ORDER BY r.id DESC
                `);
                return res.status(200).json(rows);
            }

            if (!email) {
                return res.status(400).json({ error: "Email is required" });
            }

            // গ) নোটিফিকেশন লিস্ট লোড করা
            if (action === 'get_notifications') {
                const [rows] = await db.execute('SELECT * FROM notifications WHERE email = ? ORDER BY id DESC', [email]);
                return res.status(200).json(rows);
            } 
            
            // ঘ) গ্রাহক ও অ্যাডমিনের জন্য ডাইনামিক স্ট্যাটস/ট্রাস্ট-ইনডেক্স ক্যালকুলেট করা
            else if (action === 'get_stats') {
                const [orderRows] = await db.execute(
                    'SELECT status, COUNT(*) as count FROM orders WHERE email = ? GROUP BY status', 
                    [email]
                );

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

                const [bagRows] = await db.execute('SELECT COUNT(*) as count FROM bag WHERE email = ?', [email]);
                stats.cart_count = bagRows[0]?.count || 0;

                const [wishRows] = await db.execute('SELECT COUNT(*) as count FROM wishlist WHERE email = ?', [email]);
                stats.wishlist_count = wishRows[0]?.count || 0;

                const token = url.searchParams.get('token');
                const pin = url.searchParams.get('pin');
                const isAdmin = token === process.env.ADMIN_TOKEN && pin === process.env.ADMIN_PIN;

                if (isAdmin) {
                    const total = stats.total_orders;
                    const del = stats.delivered;
                    const ret = stats.returned;
                    
                    const successRate = total > 0 ? ((del / total) * 100).toFixed(2) : "0.00";
                    const returnRate = total > 0 ? ((ret / total) * 100).toFixed(2) : "0.00";
                    
                    let trustBadge = "New Customer";
                    if (total > 0) {
                        if (del >= 5 && ret === 0) trustBadge = "VIP Customer 🌟";
                        else if (ret > del) trustBadge = "High Return Risk ⚠️";
                        else if (del >= 1) trustBadge = "Trusted Buyer ✅";
                        else if (stats.cancelled > 2 && del === 0) trustBadge = "Spam Suspicion ⚠️";
                    }

                    // হারিয়ে যাওয়া সিকিউরিটি রিকভারি কোড সিঙ্ক করা হচ্ছে অ্যাডমিনের ট্রাস্ট প্যানেলে দেখানোর জন্য
                    const [userRows] = await db.execute('SELECT recovery_code FROM users WHERE email = ?', [email]);
                    const recoveryCode = userRows[0]?.recovery_code || 'N/A';

                    const [abandonedCart] = await db.execute(
                        'SELECT product_name, size, quantity FROM bag WHERE email = ?', 
                        [email]
                    );

                    const [abandonedWishlist] = await db.execute(
                        'SELECT p.name, p.price FROM wishlist w JOIN products p ON w.product_id = p.id WHERE w.email = ?', 
                        [email]
                    );

                    stats.admin_metrics = {
                        success_rate: successRate + "%",
                        return_rate: returnRate + "%",
                        trust_badge: trustBadge,
                        recovery_code: recoveryCode, // অ্যাডমিন ট্রাস্ট ড্যাশবোর্ডে ওয়ান-ক্লিক কোড প্রদর্শন
                        abandoned_cart: abandonedCart,
                        abandoned_wishlist: abandonedWishlist
                    };
                }

                return res.status(200).json(stats);
            }
            
            return res.status(400).json({ error: "Invalid GET action specified." });
        } 
        
        // ২. POST মেথড: নোটিফিকেশন ব্রডকাস্ট এবং নতুন রিভিউ সাবমিট করা
        else if (req.method === 'POST') {
            const b = req.body;
            
            if (b.action === 'add_review') {
                const { product_id, email, username, rating, comment } = b;
                
                if (!product_id || !email || !username || !rating || !comment) {
                    return res.status(400).json({ error: "All review fields are required!" });
                }

                const ratingNum = parseInt(rating);
                if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
                    return res.status(400).json({ error: "Rating must be between 1 and 5 stars!" });
                }

                await db.execute(
                    'INSERT INTO product_reviews (product_id, email, username, rating, comment) VALUES (?, ?, ?, ?, ?)',
                    [product_id, email, username, ratingNum, comment]
                );
                
                return res.status(200).json({ status: "Success" });
            }
            
            else if (b.action === 'send_admin_notif') {
                if (b.token !== process.env.ADMIN_TOKEN || b.pin !== process.env.ADMIN_PIN) {
                    return res.status(401).json({ error: "Unauthorized access! Admin Verification failed." });
                }

                const { target_type, email, title, message, link_url, image_url } = b;
                
                if (!title || !message) {
                    return res.status(400).json({ error: "Title and Message are required!" });
                }

                // নির্দিষ্ট ইউজারকে নোটিফিকেশন এবং ওয়ানসিগন্যাল লাইভ পুশ নোটিফিকেশন পাঠানো
                if (target_type === 'single') {
                    if (!email) return res.status(400).json({ error: "Target email is required!" });
                    await db.execute(
                        'INSERT INTO notifications (email, title, message, link_url, image_url) VALUES (?, ?, ?, ?, ?)', 
                        [email, title, message, link_url || '', image_url || '']
                    );
                    
                    // লাইভ কাস্টমার পুশ নোটিফিকেশন সেন্ডার ট্রিগার (ডিপ-লিংক সহ)
                    await sendPushNotification([email], title, message, link_url || `https://${req.headers.host}/notifications.html`);
                    
                    return res.status(200).json({ status: "Success" });
                } 
                // সব রেজিস্টার্ড ইউজারকে নোটিফিকেশন ব্রডকাস্ট এবং ওয়ানসিগন্যাল পুশ নোটিফিকেশন ব্রডকাস্ট করা
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
                    
                    // ওয়ানসিগন্যালের মাধ্যমে অল সাবস্ক্রাইবড গ্রাহকদের ফোনে ব্রডকাস্ট পুশ সেন্ড ট্রিগার
                    await sendPushNotification([], title, message, link_url || `https://${req.headers.host}/notifications.html`);
                    
                    return res.status(200).json({ status: "Success" });
                }
                
                return res.status(400).json({ error: "Invalid target type specified." });
            }
            return res.status(400).json({ error: "Invalid POST action specified." });
        }
        
        // ৩. PUT মেথড: নোটিফিকেশন পঠিত মার্ক করা
        else if (req.method === 'PUT') {
            const b = req.body;
            if (b.action === 'read_all') {
                await db.execute('UPDATE notifications SET is_read = TRUE WHERE email = ?', [b.email]);
                return res.status(200).json({ status: "Success" });
            }
            return res.status(400).json({ error: "Invalid PUT action specified." });
        } 
        
        // ৪. DELETE মেথড: নোটিফিকেশন এবং কাস্টমার রিভিউ মুছে ফেলা
        else if (req.method === 'DELETE') {
            const b = req.body;
            
            if (b.action === 'delete_review') {
                if (b.token !== process.env.ADMIN_TOKEN || b.pin !== process.env.ADMIN_PIN) {
                    return res.status(401).json({ error: "Unauthorized access! Admin Verification failed." });
                }
                if (!b.id) {
                    return res.status(400).json({ error: "Review ID is required" });
                }
                await db.execute('DELETE FROM product_reviews WHERE id = ?', [b.id]);
                return res.status(200).json({ status: "Success" });
            }
            
            else if (b.action === 'clear_all') {
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
