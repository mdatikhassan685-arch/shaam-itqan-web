import { getDb } from './db.js';

export default async function handler(req, res) {
    // এখানে আপনি চাইলে একটি simple secret key চেক করতে পারেন যাতে বাইরের কেউ অর্ডার এডিট না করতে পারে
    if (req.method === 'POST') {
        const { orderId, status } = req.body;
        const db = await getDb();
        await db.execute('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
        await db.end();
        res.status(200).json({ message: "Order Updated" });
    }
}
