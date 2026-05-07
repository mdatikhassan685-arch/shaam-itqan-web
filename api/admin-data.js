const pool = require('./db');

// তোমার সিক্রেট কি এটি (ভের্সেল Environment Variable এ সেট করা ভালো)
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'your_secret_admin_token';

export default async function handler(req, res) {
    // নিরাপত্তা চেক
    const authHeader = req.headers['authorization'];
    if (authHeader !== ADMIN_SECRET) {
        return res.status(403).json({ message: 'Forbidden: Access Denied' });
    }

    const { type } = req.query; // product, banner, category
    const method = req.method;

    // টাইপ ভ্যালিডেশন (নিরাপত্তার জন্য)
    const allowedTypes = ['products', 'banners', 'categories']; 
    if (!allowedTypes.includes(type)) {
        return res.status(400).json({ message: 'Invalid table type' });
    }

    try {
        if (method === 'GET') {
            const [rows] = await pool.query('SELECT * FROM ??', [type]);
            return res.status(200).json(rows);
        }

        if (method === 'POST') {
            const { name, price, description, image_url, link_url, stock } = req.body;
            // এখানে stock এর ডিফল্ট ভ্যালু হ্যান্ডেল করা হয়েছে
            await pool.query(
                'INSERT INTO ?? (name, price, description, image_url, link_url, stock) VALUES (?, ?, ?, ?, ?, ?)',
                [type, name, price || 0, description || '', image_url, link_url || '', stock || 0]
            );
            return res.status(201).json({ message: 'Added Successfully' });
        }

        if (method === 'PUT') {
            const { id, name, price, description, image_url, link_url } = req.body;
            await pool.query(
                'UPDATE ?? SET name=?, price=?, description=?, image_url=?, link_url=? WHERE id=?',
                [type, name, price, description, image_url, link_url, id]
            );
            return res.status(200).json({ message: 'Updated Successfully' });
        }

        if (method === 'DELETE') {
            const { id } = req.body;
            await pool.query('DELETE FROM ?? WHERE id=?', [type, id]);
            return res.status(200).json({ message: 'Deleted Successfully' });
        }

    } catch (error) {
        console.error("Database Error:", error);
        return res.status(500).json({ message: 'Database Error', error: error.message });
    }
}
