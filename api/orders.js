import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    
    if (req.method === 'POST') {
        const { name, phone, address, products, total } = req.body;
        try {
            await db.execute(
                'INSERT INTO orders (customer_name, phone, address, products, total_price) VALUES (?, ?, ?, ?, ?)',
                [name, phone, address, JSON.stringify(products), total]
            );
            res.status(200).json({ message: 'Success' });
        } catch (e) {
            res.status(500).json({ error: e.message }); // এখন এররটি ব্রাউজারে দেখতে পাবেন
        }
    }
    await db.end();
}
