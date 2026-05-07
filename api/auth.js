import pool from './db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const { action, email, password, name } = req.body;

    try {
        if (action === 'signup') {
            const hash = await bcrypt.hash(password, 10);
            await pool.query('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [name, email, hash]);
            return res.status(201).json({ message: 'Success' });
        }
        if (action === 'login') {
            const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
            if (users.length === 0 || !(await bcrypt.compare(password, users[0].password_hash))) 
                return res.status(401).json({ message: 'Invalid credentials' });

            const token = jwt.sign({ email: users[0].email }, JWT_SECRET, { expiresIn: '7d' });
            res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Strict; Secure`);
            return res.status(200).json({ user: { name: users[0].username, email: users[0].email } });
        }
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
