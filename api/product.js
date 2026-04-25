import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();

    // যদি কেউ প্রোডাক্ট দেখতে চায় (GET)
    if (req.method === 'GET') {
        const [rows] = await db.execute('SELECT * FROM products');
        await db.end();
        res.status(200).json(rows);
    } 
    // যদি অ্যাডমিন নতুন প্রোডাক্ট যোগ করতে চায় (POST)
    else if (req.method === 'POST') {
        const { name, price, stock, image_url } = req.body;
        try {
            await db.execute(
                'INSERT INTO products (name, price, stock, image_url) VALUES (?, ?, ?, ?)', 
                [name, price, stock, image_url]
            );
            await db.end();
            res.status(200).json({ message: "Product Added Successfully" });
        } catch (e) {
            await db.end();
            res.status(500).json({ error: e.message });
        }
    }
}
