import { getDb } from './db.js';

export default async function handler(req, res) {
    const db = await getDb();
    
    // URL থেকে টাইপ বের করার নিশ্চিত উপায়
    const url = new URL(req.url, `http://${req.headers.host}`);
    const type = url.searchParams.get('type'); 

    // টেবিল ম্যাপ (এখানে ভুল হওয়ার সুযোগ নেই)
    const tableMap = {
        'product': 'products',
        'banner': 'banners',
        'category': 'categories'
    };

    const tableName = tableMap[type];

    if (!tableName) {
        await db.end();
        return res.status(400).json({ error: "Invalid type provided" });
    }

    try {
        if (req.method === 'GET') {
            const [rows] = await db.execute(`SELECT * FROM ${tableName}`);
            await db.end();
            return res.status(200).json(rows);
        } else {
            await db.end();
            return res.status(405).json({ error: "Method not allowed" });
        }
    } catch (e) {
        await db.end();
        return res.status(500).json({ error: e.message });
    }
}
