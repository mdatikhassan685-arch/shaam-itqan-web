import { getDb } from './db.js';

export default async function handler(req, res) {
    const { action, email, password, name, token, pin } = req.body;
    const db = await getDb();

    // Admin Login Logic
    if (action === 'admin_login') {
        if (token === process.env.ADMIN_TOKEN && pin === process.env.ADMIN_PIN) {
            res.status(200).json({ status: "Success" });
        } else {
            res.status(401).json({ message: "Invalid Admin Credentials" });
        }
    } 
    // User Signup/Login Logic
    else if (action === 'signup') {
        await db.execute('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [name, email, password]);
        res.status(200).json({ message: "Success" });
    } else {
        const [users] = await db.execute('SELECT * FROM users WHERE email = ? AND password_hash = ?', [email, password]);
        if (users.length > 0) res.status(200).json({ user: users[0] });
        else res.status(401).json({ message: "Failed" });
    }
    await db.end();
}
