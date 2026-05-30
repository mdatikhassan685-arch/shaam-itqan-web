import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    const url = new URL(req.url, `http://${req.headers.host}`);
    const type = url.searchParams.get('type');
    
    // কুপন টেবিল ম্যাপিং যুক্ত করা হলো
    const tableMap = { 'product': 'products', 'banner': 'banners', 'category': 'categories', 'coupon': 'coupons' };
    const tableName = tableMap[type];

    try {
        if (req.method === 'GET') {
            const [rows] = await db.execute(`SELECT * FROM ${tableName} ORDER BY id DESC`);
            res.status(200).json(rows);
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
            // নতুন কুপন তৈরি করার কুয়েরি
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
            // কুপন এডিট বা আপডেট করার কুয়েরি
            else if (type === 'coupon') {
                await db.execute(
                    'UPDATE coupons SET code=?, discount_type=?, discount_value=?, min_order_amount=? WHERE id=?', 
                    [b.name, b.discount_type, b.discount_value, b.min_order_amount, b.id]
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
