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

    if (emails && emails.length > 0) {
        payload.include_aliases = {
            external_id: emails.map(e => e.trim().toLowerCase())
        };
    } else {
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

                // ক্যাশ অন ডেলিভারি (COD) সিকিউরিটি চেক
                if (b.payment_method === 'cod') {
                    const [deliveredRows] = await db.execute(
                        "SELECT COUNT(*) as count FROM orders WHERE email = ? AND status = 'Delivered'",
                        [b.email]
                    );
                    const deliveredCount = deliveredRows[0]?.count || 0;
                    
                    const COD_THRESHOLD = 3; 
                    
                    if (deliveredCount < COD_THRESHOLD) {
                        return res.status(400).json({ 
                            error: `Cash on Delivery (COD) is restricted! You must have at least ${COD_THRESHOLD} successful deliveries. (Your current count: ${deliveredCount}). Please pay the delivery charge in advance to confirm your order.` 
                        });
                    }
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
                
                const combinedProducts = productDetailsArray.join('<br>');

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

                // কাস্টমারদের জন্য স্বয়ংক্রিয় প্রমোশনাল কম-স্টক নোটিফিকেশন ট্রিগার লজিক
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
                            
                            await db.execute(`UPDATE products SET ${colName} = ? WHERE name = ?`, [newStock, item.product_name]);

                            if (newStock > 0 && newStock <= 5) {
                                const [wishlistUsers] = await db.execute('SELECT email FROM wishlist WHERE product_id = ?', [prodId]);
                                for (const u of wishlistUsers) {
                                    if (u.email !== b.email) { 
                                        
                                        const [alreadyNotified] = await db.execute(
                                            'SELECT id FROM notifications WHERE email = ? AND title = ?',
                                             [u.email, "তাড়াতাড়ি করুন! আপনার পছন্দের তালিকার আইটেমটি ফুরিয়ে যাচ্ছে! ⏳"]
                                        );

                                        if (alreadyNotified.length === 0) {
                                            const notifTitle = "তাড়াতাড়ি করুন! আপনার পছন্দের তালিকার আইটেমটি ফুরিয়ে যাচ্ছে! ⏳";
                                            const notifMsg = `আপনার পছন্দের তালিকায় থাকা "${item.product_name}" (Size: ${item.size})-এর স্টক ফুরিয়ে আসছে! স্টকে মাত্র ${newStock}টি আইটেম বাকি আছে। ফুরিয়ে যাওয়ার আগেই নিয়ে নিন!`;
                                            
                                            await db.execute(
                                                'INSERT INTO notifications (email, title, message) VALUES (?, ?, ?)',
                                                [u.email, notifTitle, notifMsg]
                                            );

                                            // উইশলিস্ট কম-স্টক ওয়ানসিগন্যাল পুশ নোটিফিকেশন ট্রিগার
                                            await sendPushNotification([u.email], notifTitle, notifMsg, `https://${req.headers.host}/notifications.html`);
                                        }
                                    }
                                }

                                const [bagUsers] = await db.execute('SELECT DISTINCT email FROM bag WHERE product_name = ? AND size = ?', [item.product_name, item.size]);
                                for (const u of bagUsers) {
                                    if (u.email !== b.email) { 
                                        
                                        const [alreadyNotifiedBag] = await db.execute(
                                            'SELECT id FROM notifications WHERE email = ? AND title = ?',
                                            [u.email, "তাড়াতাড়ি করুন! আপনার ব্যাগে থাকা আইটেমটি ফুরিয়ে যাচ্ছে! ⚠️"]
                                        );
                                        if (alreadyNotifiedBag.length === 0) {
                                            const notifTitle = "তাড়াতাড়ি করুন! আপনার ব্যাগে থাকা আইটেমটি ফুরিয়ে যাচ্ছে! ⚠️";
                                            const notifMsg = `আপনার ব্যাগে (কার্টে) থাকা "${item.product_name}" (Size: ${item.size})-এর স্টক ফুরিয়ে আসছে! স্টকে মাত্র ${newStock}টি আইটেম বাকি আছে। অন্য কেউ কেনার আগেই নিয়ে নিন!`;
                                            
                                            await db.execute(
                                                'INSERT INTO notifications (email, title, message) VALUES (?, ?, ?)',
                                                [u.email, notifTitle, notifMsg]
                                            );

                                            // কার্ট কম-স্টক ওয়ানসিগন্যাল পুশ নোটিফিকেশন ট্রিগার
                                            await sendPushNotification([u.email], notifTitle, notifMsg, `https://${req.headers.host}/notifications.html`);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                const [maxRow] = await db.execute('SELECT MAX(id) as max_id FROM orders');
                let newOrderId = 1001; 
                if (maxRow.length > 0 && maxRow[0].max_id) {
                    newOrderId = parseInt(maxRow[0].max_id) + 1; 
                }

                await db.execute(
                    'INSERT INTO orders (id, customer_name, phone, address, email, products, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [newOrderId, b.name, combinedPhones, detailedAddress, b.email, combinedProducts, grandTotal, 'Pending']
                );

                await db.execute(
                    `DELETE FROM bag WHERE email = ? AND id IN (${placeholders})`,
                    [b.email, ...checkedIds]
                );

                const clientNotifTitle = "Order Placed successfully! 🛍️";
                const clientNotifMsg = `Your order #${newOrderId} has been received and is currently Pending confirmation. (Total: ৳${grandTotal.toFixed(2)})`;

                await db.execute(
                    'INSERT INTO notifications (email, title, message) VALUES (?, ?, ?)',
                    [b.email, clientNotifTitle, clientNotifMsg]
                );

                // সফল অর্ডার চেকআউট ওয়ানসিগন্যাল লাইভ পুশ নোটিফিকেশন ট্রিগার (কাস্টমার ইনবক্স লিংকে ডিপ-লিঙ্ক সহ)
                await sendPushNotification([b.email], clientNotifTitle, clientNotifMsg, `https://${req.headers.host}/notifications.html`);

                return res.status(200).json({ status: "Success" });
            } 
            
            else if (b.action === 'confirm' || b.action === 'ship' || b.action === 'deliver') {
                if (b.token !== process.env.ADMIN_TOKEN || b.pin !== process.env.ADMIN_PIN) {
                    return res.status(401).json({ error: "Unauthorized access! Admin Verification failed." });
                }

                if (b.action === 'confirm') {
                    await db.execute('UPDATE orders SET status = "Confirmed" WHERE id = ?', [b.id]);
                    const [ord] = await db.execute('SELECT email FROM orders WHERE id = ?', [b.id]);
                    if (ord.length > 0) {
                        const customerEmail = ord[0].email;
                        const clientNotifTitle = "Order Confirmed! 🚚";
                        const clientNotifMsg = `Great news! Your order #${b.id} has been confirmed by the admin and is being packed.`;

                        await db.execute(
                            'INSERT INTO notifications (email, title, message) VALUES (?, ?, ?)',
                            [customerEmail, clientNotifTitle, clientNotifMsg]
                        );

                        // অর্ডার কনফার্ম ওয়ানসিগন্যাল লাইভ পুশ নোটিফিকেশন ট্রিগার
                        await sendPushNotification([customerEmail], clientNotifTitle, clientNotifMsg, `https://${req.headers.host}/notifications.html`);
                    }
                    return res.status(200).json({ status: "Success" });
                }
                else if (b.action === 'ship') {
                    await db.execute('UPDATE orders SET status = "Shipped" WHERE id = ?', [b.id]);
                    const [ord] = await db.execute('SELECT email FROM orders WHERE id = ?', [b.id]);
                    if (ord.length > 0) {
                        const customerEmail = ord[0].email;
                        const clientNotifTitle = "Order Shipped! 📦";
                        const clientNotifMsg = `Your order #${b.id} has been handed over to the courier. Please keep your phone active!`;

                        await db.execute(
                            'INSERT INTO notifications (email, title, message) VALUES (?, ?, ?)',
                            [customerEmail, clientNotifTitle, clientNotifMsg]
                        );

                        // অর্ডার শিফট ওয়ানসিগন্যাল লাইভ পুশ নোটিফিকেশন ট্রিগার
                        await sendPushNotification([customerEmail], clientNotifTitle, clientNotifMsg, `https://${req.headers.host}/notifications.html`);
                    }
                    return res.status(200).json({ status: "Success" });
                }
                else if (b.action === 'deliver') {
                    await db.execute('UPDATE orders SET status = "Delivered" WHERE id = ?', [b.id]);
                    const [ord] = await db.execute('SELECT email FROM orders WHERE id = ?', [b.id]);
                    if (ord.length > 0) {
                        const customerEmail = ord[0].email;
                        const clientNotifTitle = "Order Delivered! 🎉";
                        const clientNotifMsg = `Your order #${b.id} has been delivered. Thank you so much for shopping with SHAAM ITQAN!`;

                        await db.execute(
                            'INSERT INTO notifications (email, title, message) VALUES (?, ?, ?)',
                            [customerEmail, clientNotifTitle, clientNotifMsg]
                        );

                        // অর্ডার ডেলিভারড ওয়ানসিগন্যাল লাইভ পুশ নোটিফিকেশন ট্রিগার
                        await sendPushNotification([customerEmail], clientNotifTitle, clientNotifMsg, `https://${req.headers.host}/notifications.html`);
                    }
                    return res.status(200).json({ status: "Success" });
                }
            }
            
            else if (b.action === 'cancel') {
                const [orderRows] = await db.execute('SELECT * FROM orders WHERE id = ?', [b.id]);
                
                if (orderRows.length === 0) {
                    return res.status(404).json({ error: "Order not found" });
                }

                const order = orderRows[0];
                const isAdmin = b.token === process.env.ADMIN_TOKEN && b.pin === process.env.ADMIN_PIN;
                const isOwner = b.email && order.email === b.email;

                if (!isAdmin && !isOwner) {
                    return res.status(401).json({ error: "Unauthorized! You do not have permission to cancel this order." });
                }

                if (order.status === 'Pending' || order.status === 'Confirmed') {
                    
                    const productParts = order.products.includes('<br>') 
                        ? order.products.split('<br>') 
                        : order.products.split(', ');

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
                    
                    const clientNotifTitle = "Order Cancelled! ❌";
                    const clientNotifMsg = `Your order #${b.id} has been cancelled. Your cart stock has been successfully restored.`;

                    await db.execute(
                        'INSERT INTO notifications (email, title, message) VALUES (?, ?, ?)',
                        [order.email, clientNotifTitle, clientNotifMsg]
                    );

                    // অর্ডার ক্যানসেল ওয়ানসিগন্যাল লাইভ পুশ নোটিফিকেশন ট্রিগার
                    await sendPushNotification([order.email], clientNotifTitle, clientNotifMsg, `https://${req.headers.host}/notifications.html`);

                    return res.status(200).json({ status: "Success" });
                } else {
                    return res.status(400).json({ error: "Cannot cancel order. It has already shipped!" });
                }
            }
        }
    } catch (e) {
        console.error("Orders API Error:", e);
        return res.status(500).json({ error: e.message });
    }
}
