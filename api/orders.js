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

                // স্টক ভেরিফিকেশন লক
                const sizeColumnMap = { 'S': 'stock_s', 'M': 'stock_m', 'L': 'stock_l', 'XL': 'stock_xl', 'XXL': 'stock_xxl' };
                for (const item of cartItems) {
                    const buyQty = parseInt(item.quantity) || 1;
                    const colName = sizeColumnMap[item.size.toUpperCase()];

                    if (colName) {
                        const [prodRow] = await db.execute(`SELECT ${colName} FROM products WHERE name = ?`, [item.product_name]);
                        if (prodRow.length > 0) {
                            const currentStock = prodRow[0][colName] || 0;
                            if (currentStock < buyQty) {
                                return res.status(400).json({ 
                                    error: `Sorry, "${item.product_name}" (Size: ${item.size}) has insufficient stock in database! Available Stock: ${currentStock}` 
                                });
                            }
                        } else {
                            return res.status(404).json({ error: `Product "${item.product_name}" was not found in our database.` });
                        }
                    }
                }

                let subtotal = 0;
                const productDetailsArray = cartItems.map(item => {
                    const itemQty = parseInt(item.quantity) || 1;
                    subtotal += parseFloat(item.price) * itemQty;
                    return `${item.product_name} (Size: ${item.size}, Qty: ${itemQty})`;
                });
                const combinedProducts = productDetailsArray.join(', ');

                const shippingFee = b.delivery_area === 'inside_dhaka' ? 80 : 150;
                
                let discountAmount = 0;
                let couponNotice = '';
                if (b.coupon_code) {
                    const [cpRows] = await db.execute('SELECT * FROM coupons WHERE code = ?', [b.coupon_code]);
                    if (cpRows.length > 0) {
                        const cp = cpRows[0];
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

                const grandTotal = subtotal - discountAmount + shippingFee; 

                const combinedPhones = `Primary: ${b.phone} | Alt: ${b.phone_backup} (${b.phone_backup_relation})`;
                const paymentInfo = b.payment_method === 'advance_charge' 
                    ? `Advance Paid (TrxID: ${b.trxid || 'N/A'})` 
                    : 'Full Cash on Delivery (COD)';
                const detailedAddress = `${b.address} | Landmark: ${b.landmark} | Area: ${b.delivery_area === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'} | Method: ${paymentInfo}${couponNotice}`;

                // কাস্টমারদের জন্য স্বয়ংক্রিয় প্রমোশনাল কম-স্টক নোটিফিকেশন ট্রিগার লজিক (ক্লান্তিহীন ফিল্টার ও বায়ার এক্সক্লুশন সহ)
                for (const item of cartItems) {
                    const buyQty = parseInt(item.quantity) || 1;
                    const colName = sizeColumnMap[item.size.toUpperCase()];

                    if (colName) {
                        const [prodRow] = await db.execute(`SELECT id, ${colName} FROM products WHERE name = ?`, [item.product_name]);
                        if (prodRow.length > 0) {
                            const prodId = prodRow[0].id;
                            const currentStock = prodRow[0][colName] || 0;
                            let newStock = currentStock - buyQty;
                            if (newStock < 0) newStock = 0;
                            
                            // নতুন স্টক মাইনাস আপডেট করা হচ্ছে
                            await db.execute(`UPDATE products SET ${colName} = ? WHERE name = ?`, [newStock, item.product_name]);

                            // স্টক যদি ৫ পিস বা তার নিচে নেমে আসে (কিন্তু ০ এর বেশি থাকে)
                            if (newStock > 0 && newStock <= 5) {
                                
                                // ১. উইশলিস্টে থাকা কাস্টমারদের নোটিফিকেশন পাঠানো (বায়ার নিজে নোটিফিকেশন পাবে না)
                                const [wishlistUsers] = await db.execute('SELECT email FROM wishlist WHERE product_id = ?', [prodId]);
                                for (const u of wishlistUsers) {
                                    if (u.email !== b.email) { // বায়ার এক্সক্লুশন চেক
                                        
                                        // নোটিফিকেশন ক্লান্তি বা স্প্যাম প্রতিরোধ করতে পূর্বে পাঠানো হয়েছে কি না চেক করা হচ্ছে
                                        const [alreadyNotified] = await db.execute(
                                            'SELECT id FROM notifications WHERE email = ? AND title = ?',
                                            [u.email, "Hurry! Item in your Wishlist is running out! ⏳"]
                                        );

                                        if (alreadyNotified.length === 0) {
                                            await db.execute(
                                                'INSERT INTO notifications (email, title, message) VALUES (?, ?, ?)',
                                                [u.email, "Hurry! Item in your Wishlist is running out! ⏳", `The "${item.product_name}" (Size: ${item.size}) in your Wishlist is running low! Only ${newStock} items left in stock. Grab it before it's gone!`]
                                            );
                                        }
                                    }
                                }

                                // ২. ব্যাগে (কার্টে) রেখে দেওয়া কাস্টমারদের নোটিফিকেশন পাঠানো (বায়ার নিজে নোটিফিকেশন পাবে না)
                                const [bagUsers] = await db.execute('SELECT DISTINCT email FROM bag WHERE product_name = ? AND size = ?', [item.product_name, item.size]);
                                for (const u of bagUsers) {
                                    if (u.email !== b.email) { // বায়ার এক্সক্লুশন চেক
                                        
                                        // স্প্যাম প্রতিরোধক চেক
                                        const [alreadyNotifiedBag] = await db.execute(
                                            'SELECT id FROM notifications WHERE email = ? AND title = ?',
                                            [u.email, "Hurry! Item in your Bag is almost sold out! ⚠️"]
                                        );

                                        if (alreadyNotifiedBag.length === 0) {
                                            await db.execute(
                                                'INSERT INTO notifications (email, title, message) VALUES (?, ?, ?)',
                                                [u.email, "Hurry! Item in your Bag is almost sold out! ⚠️", `The "${item.product_name}" (Size: ${item.size}) in your Bag is almost sold out! Only ${newStock} items left in stock. Checkout now before someone else buys it!`]
                                            );
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // ৬. ডাটাবেজ থেকে সিকিউরড ম্যানুয়াল অর্ডার আইডি ক্যালকুলেট করা
                const [maxRow] = await db.execute('SELECT MAX(id) as max_id FROM orders');
                let newOrderId = 1001; 
                if (maxRow.length > 0 && maxRow[0].max_id) {
                    newOrderId = parseInt(maxRow[0].max_id) + 1; 
                }

                // ৭. ডাটাবেজে সফল অর্ডার সেভ করা
                await db.execute(
                    'INSERT INTO orders (id, customer_name, phone, address, email, products, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [newOrderId, b.name, combinedPhones, detailedAddress, b.email, combinedProducts, grandTotal, 'Pending']
                );

                await db.execute(
                    `DELETE FROM bag WHERE email = ? AND id IN (${placeholders})`,
                    [b.email, ...checkedIds]
                );

                // ৮. অর্ডারের সফল নোটিফিকেশন কাস্টমার প্রোফাইলে পাঠানো হচ্ছে
                await db.execute(
                    'INSERT INTO notifications (email, title, message) VALUES (?, ?, ?)',
                    [b.email, "Order Placed successfully! 🛍️", `Your order #${newOrderId} has been received and is currently Pending confirmation. (Total: ৳${grandTotal.toFixed(2)})`]
                );

                return res.status(200).json({ status: "Success" });
            } 
            else if (b.action === 'confirm') {
                await db.execute('UPDATE orders SET status = "Confirmed" WHERE id = ?', [b.id]);
                const [ord] = await db.execute('SELECT email FROM orders WHERE id = ?', [b.id]);
                if (ord.length > 0) {
                    await db.execute(
                        'INSERT INTO notifications (email, title, message) VALUES (?, ?, ?)',
                        [ord[0].email, "Order Confirmed! 🚚", `Great news! Your order #${b.id} has been confirmed by the admin and is being packed.`]
                    );
                }
                return res.status(200).json({ status: "Success" });
            }
            else if (b.action === 'ship') {
                await db.execute('UPDATE orders SET status = "Shipped" WHERE id = ?', [b.id]);
                const [ord] = await db.execute('SELECT email FROM orders WHERE id = ?', [b.id]);
                if (ord.length > 0) {
                    await db.execute(
                        'INSERT INTO notifications (email, title, message) VALUES (?, ?, ?)',
                        [ord[0].email, "Order Shipped! 📦", `Your order #${b.id} has been handed over to the courier. Please keep your phone active!`]
                    );
                }
                return res.status(200).json({ status: "Success" });
            }
            else if (b.action === 'deliver') {
                await db.execute('UPDATE orders SET status = "Delivered" WHERE id = ?', [b.id]);
                const [ord] = await db.execute('SELECT email FROM orders WHERE id = ?', [b.id]);
                if (ord.length > 0) {
                    await db.execute(
                        'INSERT INTO notifications (email, title, message) VALUES (?, ?, ?)',
                        [ord[0].email, "Order Delivered! 🎉", `Your order #${b.id} has been delivered. Thank you so much for shopping with SHAAM ITQAN!`]
                    );
                }
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
                        await db.execute(
                            'INSERT INTO notifications (email, title, message) VALUES (?, ?, ?)',
                            [order.email, "Order Cancelled! ❌", `Your order #${b.id} has been cancelled. Your cart stock has been successfully restored.`]
                        );
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
