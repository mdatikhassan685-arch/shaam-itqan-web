// auth.js (Secure Authentication)
import { getDb } from './db.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
    const { action, email, password, name } = req.body;
    const db = await getDb();

    try {
        if (action === 'signup') {
            // পাসওয়ার্ড হ্যাশিং
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.execute(
                'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', 
                [name, email, hashedPassword]
            );
            res.status(200).json({ message: "Account created successfully" });
        } 
        else if (action === 'login') {
            const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
            
            if (users.length === 0) {
                return res.status(401).json({ message: "Invalid email or password" });
            }

            const user = users[0];
            // পাসওয়ার্ড ভেরিফিকেশন
            const isMatch = await bcrypt.compare(password, user.password_hash);
            
            if (isMatch) {
                // নিরাপত্তার জন্য পাসওয়ার্ড হ্যাসটি ফ্রন্টএন্ডে পাঠাবো না
                const { password_hash, ...userWithoutPass } = user;
                res.status(200).json({ user: userWithoutPass });
            } else {
                res.status(401).json({ message: "Invalid email or password" });
            }
        }
    } catch (e) {
        res.status(500).json({ message: "Server error", error: e.message });
    }
}
