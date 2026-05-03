import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    const { method } = req;
    
    // GET: ইউজারের কার্ট ডাটা নিয়ে আসবে
    if (method === 'GET') {
        const { user_email } = req.query;
        const [rows] = await db.execute('SELECT * FROM orders WHERE status = "Cart" AND customer_name = ?', [user_email]);
        await db.end();
        res.status(200).json(rows);
    } 
    // POST: কার্ট বা অর্ডার সেভ করবে
    else if (method === 'POST') {
        const { user_email, products, total_price, status } = req.body;
        await db.execute('INSERT INTO orders (customer_name, products, total_price, status) VALUES (?, ?, ?, ?)', 
        [user_email, JSON.stringify(products), total_price, status || 'Pending']);
        await db.end();
        res.status(200).json({ message: "Success" });
    }
}
