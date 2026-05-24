import { getDb } from './db.js';

export default async function handler(req, res) {
    const { action, email, password, name } = req.body;
    const db = await getDb();

    try {
        if (action === 'signup') {
            await db.execute('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [name, email, password]);
            return res.status(200).json({ message: "Success" });
        } else {
            const [users] = await db.execute('SELECT * FROM users WHERE email = ? AND password_hash = ?', [email, password]);
            if (users.length > 0) {
                return res.status(200).json({ user: users[0] });
            } else {
                return res.status(401).json({ message: "Failed" });
            }
        }
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
