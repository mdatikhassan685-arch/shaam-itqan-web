const pool = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    const { action, email, password, name } = req.body;

    try {
        if (action === 'signup') {
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [name, email, hashedPassword]);
            return res.status(201).json({ message: 'Signup Successful' });
        } 
        
        if (action === 'login') {
            const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
            if (rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });

            const user = rows[0];
            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

            // JWT তৈরি করা
            const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

            // HTTP-Only Cookie সেট করা
            res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Strict; Secure`);
            return res.status(200).json({ user: { name: user.username, email: user.email } });
        }
    } catch (error) {
        return res.status(500).json({ message: 'Database error', error: error.message });
    }
}
