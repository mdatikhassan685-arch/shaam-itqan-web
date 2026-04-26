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
            await db.end();
            res.status(200).json({ message: 'Success' });
        } catch (error) {
            await db.end();
            res.status(500).json({ error: error.message });
        }
    } else {
        // GET Request এর জন্য
        const [rows] = await db.execute('SELECT * FROM orders ORDER BY created_at DESC');
        await db.end();
        res.status(200).json(rows);
    }
}
