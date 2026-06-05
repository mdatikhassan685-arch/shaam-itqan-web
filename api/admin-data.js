import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    const url = new URL(req.url, `http://${req.headers.host}`);
    const type = url.searchParams.get('type');
    const tableMap = { 'product': 'products', 'banner': 'banners', 'category': 'categories', 'coupon': 'coupons', 'notification': 'notifications' };
    const tableName = tableMap[type];

    try {
        if (req.method === 'GET') {
            // প্রোডাক্টের ক্ষেত্রে উইশলিস্টের পাশাপাশি কাস্টমারদের এভারেজ রেটিং ও রিভিউ সংখ্যা ডাইনামিকালি হিসাব করা হচ্ছে
            if (type === 'product') {
                const [rows] = await db.execute(
                    `SELECT p.*, 
                            (SELECT COUNT(*) FROM wishlist WHERE product_id = p.id) as wishlist_count,
                            (SELECT IFNULL(AVG(rating), 0) FROM product_reviews WHERE product_id = p.id) as avg_rating,
                            (SELECT COUNT(*) FROM product_reviews WHERE product_id = p.id) as review_count
                     FROM products p 
                     ORDER BY p.id DESC`
                );
                return res.status(200).json(rows);
            } else {
                const [rows] = await db.execute(`SELECT * FROM ${tableName} ORDER BY id DESC`);
                return res.status(200).json(rows);
            }
        } else if (req.method === 'POST') {
            const b = req.body;
            if (type === 'product') {
                await db.execute(
                    'INSERT INTO products (name, price, original_price, tag, category, stock_s, stock_m, stock_l, stock_xl, stock_xxl, image_url, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
                    [b.name, b.price, b.original_price, b.tag, b.category, b.stock_s, b.stock_m, b.stock_l, b.stock_xl, b.stock_xxl, b.image_url, b.description]
                );
            }
            else if (type === 'banner') await db.execute('INSERT INTO banners (name, image_url, link_url) VALUES (?, ?, ?)', [b.name, b.image_url, b.link_url]);
            else if (type === 'category') await db.execute('INSERT INTO categories (name, image_url) VALUES (?, ?)', [b.name, b.image_url]);
            else if (type === 'coupon') {
                await db.execute(
                    'INSERT INTO coupons (code, discount_type, discount_value, min_order_amount) VALUES (?, ?, ?, ?)', 
                    [b.name, b.discount_type, b.discount_value, b.min_order_amount]
                );
            }
            res.status(200).json({ status: "Success" });
        } else if (req.method === 'PUT') {
            const b = req.body;
            if (type === 'product') {
                await db.execute(
                    'UPDATE products SET name=?, price=?, original_price=?, tag=?, category=?, stock_s=?, stock_m=?, stock_l=?, stock_xl=?, stock_xxl=?, image_url=?, description=? WHERE id=?', 
                    [b.name, b.price, b.original_price, b.tag, b.category, b.stock_s, b.stock_m, b.stock_l, b.stock_xl, b.stock_xxl, b.image_url, b.description, b.id]
                );
            }
            else if (type === 'banner') await db.execute('UPDATE banners SET name=?, image_url=?, link_url=? WHERE id=?', [b.name, b.image_url, b.link_url, b.id]);
            else if (type === 'category') await db.execute('UPDATE categories SET name=?, image_url=? WHERE id=?', [b.name, b.image_url, b.id]);
            else if (type === 'coupon') {
                await db.execute(
                    'UPDATE coupons SET code=?, discount_type=?, discount_value=?, min_order_amount=? WHERE id=?', 
                    [b.name, b.discount_type, b.discount_value, b.min_order_amount, b.id]
                );
            }
            else if (type === 'notification') {
                await db.execute(
                    'UPDATE notifications SET title=?, message=?, image_url=?, link_url=? WHERE id=?', 
                    [b.title, b.message, b.image_url, b.link_url, b.id]
                );
            }
            res.status(200).json({ status: "Updated" });
        } else if (req.method === 'DELETE') {
            await db.execute(`DELETE FROM ${tableName} WHERE id = ?`, [req.body.id]);
            res.status(200).json({ status: "Deleted" });
        }
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
}
