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
                const checkedIds = b.checked_item_ids;
                if (!checkedIds || !Array.isArray(checkedIds) || checkedIds.length === 0) {
                    return res.status(400).json({ error: "No items selected for checkout" });
                }

                // এসকিউএল ডাইনামিক কুয়েরি প্লেসহোল্ডার তৈরি (যেমন: ?, ?, ?)
                const placeholders = checkedIds.map(() => '?').join(',');

                // ১. শুধুমাত্র সিলেক্টেড কার্ট আইটেমগুলো ডাটাবেজ থেকে রিড করা হচ্ছে
                const [cartItems] = await db.execute(
                    `SELECT * FROM bag WHERE email = ? AND id IN (${placeholders})`,
                    [b.email, ...checkedIds]
                );

                if (cartItems.length === 0) {
                    return res.status(400).json({ error: "Selected items not found in bag" });
                }

                // ২. প্রোডাক্টের নাম, সাইজ এবং কোয়ান্টিটি মিলিয়ে ডেসক্রিপশন ও সাবটোটাল হিসাব করা
                let subtotal = 0;
                const productDetailsArray = cartItems.map(item => {
                    const itemQty = parseInt(item.quantity) || 1;
                    subtotal += parseFloat(item.price) * itemQty;
                    return `${item.product_name} (Size: ${item.size}, Qty: ${itemQty})`;
                });
                const combinedProducts = productDetailsArray.join(', ');

                // ৩. ডেলিভারি চার্জ এবং গ্র্যান্ড টোটাল ভেরিফাই করা
                const shippingFee = b.delivery_area === 'inside_dhaka' ? 80 : 150;
                const grandTotal = subtotal + shippingFee; 

                const combinedPhones = `Primary: ${b.phone} | Alt: ${b.phone_backup} (${b.phone_backup_relation})`;
                
                const paymentInfo = b.payment_method === 'advance_charge' 
                    ? `Advance Paid (TrxID: ${b.trxid || 'N/A'})` 
                    : 'Full Cash on Delivery (COD)';
                
                const detailedAddress = `${b.address} | Landmark: ${b.landmark} | Area: ${b.delivery_area === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'} | Method: ${paymentInfo}`;

                // ৪. ডাটাবেজে ফাইনাল গ্র্যান্ড টোটালসহ অর্ডার সেভ করা
                await db.execute(
                    'INSERT INTO orders (customer_name, phone, address, email, products, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [b.name, combinedPhones, detailedAddress, b.email, combinedProducts, grandTotal, 'Pending']
                );

                // ৫. সফলভাবে সেভ করার পর কেবল সিলেক্ট করা আইটেমগুলো কার্ট থেকে ডিলিট করা হচ্ছে (বাকিগুলো ব্যাগে সুরক্ষিত থাকবে!)
                await db.execute(
                    `DELETE FROM bag WHERE email = ? AND id IN (${placeholders})`,
                    [b.email, ...checkedIds]
                );

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
