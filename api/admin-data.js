const pool = require('./db');

// একটি কনস্ট্যান্ট সিক্রেট কি যা শুধুমাত্র তুমি জানবে
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'your_secret_admin_token';

export default async function handler(req, res) {
    // নিরাপত্তা: রিকোয়েস্ট হেডারে সিক্রেট কি চেক করা
    const authHeader = req.headers['authorization'];
    if (authHeader !== ADMIN_SECRET) {
        return res.status(403).json({ message: 'Forbidden: Access Denied' });
    }

    const { type } = req.query; // product, banner, category
    const method = req.method;

    try {
        if (method === 'GET') {
            const [rows] = await pool.query(`SELECT * FROM ??`, [type]);
            return res.status(200).json(rows);
        }

        if (method === 'POST') {
            const { name, price, description, image_url, link_url, stock } = req.body;
            await pool.query(
                `INSERT INTO ?? (name, price, description, image_url, link_url, stock) VALUES (?, ?, ?, ?, ?, ?)`,
                [type, name, price, description, image_url, link_url, stock || 0]
            );
            return res.status(201).json({ message: 'Added Successfully' });
        }

        if (method === 'PUT') {
            const { id, name, price, description, image_url, link_url } = req.body;
            await pool.query(
                `UPDATE ?? SET name=?, price=?, description=?, image_url=?, link_url=? WHERE id=?`,
                [type, name, price, description, image_url, link_url, id]
            );
            return res.status(200).json({ message: 'Updated Successfully' });
        }

        if (method === 'DELETE') {
            const { id } = req.body;
            await pool.query(`DELETE FROM ?? WHERE id=?`, [type, id]);
            return res.status(200).json({ message: 'Deleted Successfully' });
        }

    } catch (error) {
        return res.status(500).json({ message: 'Database Error', error: error.message });
    }
}
