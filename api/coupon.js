import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    try {
        if (req.method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const code = url.searchParams.get('code');
            const subtotal = parseFloat(url.searchParams.get('subtotal')) || 0;

            if (!code) return res.status(400).json({ error: "Coupon code is required" });

            // ডাটাবেজ থেকে কুপন কোড খোঁজা হচ্ছে
            const [rows] = await db.execute('SELECT * FROM coupons WHERE code = ?', [code]);
            if (rows.length === 0) {
                return res.status(404).json({ error: "Invalid Coupon Code! Please try again." });
            }

            const cp = rows[0];
            
            // নূন্যতম অর্ডারের শর্ত পূরণ হয়েছে কি না চেক করা হচ্ছে
            if (subtotal < parseFloat(cp.min_order_amount)) {
                return res.status(400).json({ error: `Minimum order of ৳${parseFloat(cp.min_order_amount).toFixed(2)} is required to use this coupon!` });
            }

            // ডিসকাউন্টের ধরন অনুযায়ী এমাউন্ট হিসাব করা হচ্ছে (Percentage বনাম Flat)
            let discountAmount = 0;
            if (cp.discount_type === 'percentage') {
                discountAmount = (subtotal * parseFloat(cp.discount_value)) / 100;
            } else {
                discountAmount = parseFloat(cp.discount_value);
            }

            // ডিসকাউন্ট যাতে সাবটোটালের চেয়ে বেশি না হয়
            if (discountAmount > subtotal) discountAmount = subtotal;

            return res.status(200).json({ 
                status: "Success", 
                discount_type: cp.discount_type,
                discount_value: parseFloat(cp.discount_value),
                discount_amount: discountAmount
            });
        }
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
