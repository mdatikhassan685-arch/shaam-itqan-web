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

                const placeholders = checkedIds.map(() => '?').join(',');

                const [cartItems] = await db.execute(
                    `SELECT * FROM bag WHERE email = ? AND id IN (${placeholders})`,
                    [b.email, ...checkedIds]
                );

                if (cartItems.length === 0) {
                    return res.status(400).json({ error: "Selected items not found in bag" });
                }

                let subtotal = 0;
                const productDetailsArray = cartItems.map(item => {
                    const itemQty = parseInt(item.quantity) || 1;
                    subtotal += parseFloat(item.price) * itemQty;
                    return `${item.product_name} (Size: ${item.size}, Qty: ${itemQty})`;
                });
                const combinedProducts = productDetailsArray.join(', ');

                // কুপন ভ্যালিডেশন এবং ডিসকাউন্ট ক্যালকুলেশন (ব্যাকএন্ড সিকিউরিটি চেক)
                let discountAmount = 0;
                let couponNotice = '';
                
                if (b.coupon_code) {
                    const [cpRows] = await db.execute('SELECT * FROM coupons WHERE code = ?', [b.coupon_code]);
                    if (cpRows.length > 0) {
                        const cp = cpRows[0];
                        // চেকআউট এমাউন্ট কুপনের নূন্যতম অর্ডারের সমান বা বেশি কি না চেক
                        if (subtotal >= parseFloat(cp.min_order_amount)) {
                            if (cp.discount_type === 'percentage') {
                                discountAmount = (subtotal * parseFloat(cp.discount_value)) / 100;
                            } else {
                                discountAmount = parseFloat(cp.discount_value);
                            }
                            if (discountAmount > subtotal) discountAmount = subtotal;
                            couponNotice = ` [Coupon Used: ${b.coupon_code} -৳${discountAmount.toFixed(2)}]`;
                        }
                    }
                }

                const shippingFee = b.delivery_area === 'inside_dhaka' ? 80 : 150;
                
                // গ্র্যান্ড টোটাল = সাবটোটাল - কুপন ডিসকাউন্ট + শিপিং চার্জ
                const grandTotal = subtotal - discountAmount + shippingFee; 

                const combinedPhones = `Primary: ${b.phone} | Alt: ${b.phone_backup} (${b.phone_backup_relation})`;
                const paymentInfo = b.payment_method === 'advance_charge' 
                    ? `Advance Paid (TrxID: ${b.trxid || 'N/A'})` 
                    : 'Full Cash on Delivery (COD)';
                const detailedAddress = `${b.address} | Landmark: ${b.landmark} | Area: ${b.delivery_area === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'} | Method: ${paymentInfo}${couponNotice}`;

                // সাইজ-ভিত্তিক স্টক বিয়োগ করার ডাইনামিক ম্যাপিং
                const sizeColumnMap = { 'S': 'stock_s', 'M': 'stock_m', 'L': 'stock_l', 'XL': 'stock_xl', 'XXL': 'stock_xxl' };
                for (const item of cartItems) {
                    const buyQty = parseInt(item.quantity) || 1;
                    const colName = sizeColumnMap[item.size.toUpperCase()];

                    if (colName) {
                        const [prodRow] = await db.execute(`SELECT ${colName} FROM products WHERE name = ?`, [item.product_name]);
                        if (prodRow.length > 0) {
                            const currentStock = prodRow[0][colName] || 0;
                            let newStock = currentStock - buyQty;
                            if (newStock < 0) newStock = 0;
                            await db.execute(`UPDATE products SET ${colName} = ? WHERE name = ?`, [newStock, item.product_name]);
                        }
                    }
                }

                await db.execute(
                    'INSERT INTO orders (customer_name, phone, address, email, products, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [b.name, combinedPhones, detailedAddress, b.email, combinedProducts, grandTotal, 'Pending']
                );

                await db.execute(
                    `DELETE FROM bag WHERE email = ? AND id IN (${placeholders})`,
                    [b.email, ...checkedIds]
                );

                return res.status(200).json({ status: "Success" });
            } 
            else if (b.action === 'confirm') {
                await db.execute('UPDATE orders SET status = "Confirmed" WHERE id = ?', [b.id]);
                return res.status(200).json({ status: "Success" });
            }
            else if (b.action === 'ship') {
                await db.execute('UPDATE orders SET status = "Shipped" WHERE id = ?', [b.id]);
                return res.status(200).json({ status: "Success" });
            }
            else if (b.action === 'deliver') {
                await db.execute('UPDATE orders SET status = "Delivered" WHERE id = ?', [b.id]);
                return res.status(200).json({ status: "Success" });
            }
            else if (b.action === 'cancel') {
                const [orderRows] = await db.execute('SELECT * FROM orders WHERE id = ?', [b.id]);
                
                if (orderRows.length > 0) {
                    const order = orderRows[0];
                    if (order.status === 'Pending' || order.status === 'Confirmed') {
                        const productParts = order.products.split(', ');
                        const sizeColumnMap = { 'S': 'stock_s', 'M': 'stock_m', 'L': 'stock_l', 'XL': 'stock_xl', 'XXL': 'stock_xxl' };
                        
                        for (const part of productParts) {
                            const match = part.match(/^(.+)\s\(Size:\s(S|M|L|XL|XXL),\sQty:\s(\d+)\)$/i);
                            if (match) {
                                const productName = match[1].trim();
                                const size = match[2].toUpperCase();
                                const qty = parseInt(match[3]) || 0;
                                const colName = sizeColumnMap[size];

                                if (colName) {
                                    await db.execute(`UPDATE products SET ${colName} = ${colName} + ? WHERE name = ?`, [qty, productName]);
                                }
                            }
                        }

                        await db.execute('UPDATE orders SET status = "Cancelled" WHERE id = ?', [b.id]);
                        return res.status(200).json({ status: "Success" });
                    } else {
                        return res.status(400).json({ error: "Cannot cancel order. It has already shipped!" });
                    }
                } else {
                    return res.status(404).json({ error: "Order not found" });
                }
            }
        }
    } catch (e) {
        console.error("Orders API Error:", e);
        return res.status(500).json({ error: e.message });
    }
}
