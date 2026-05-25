import crypto from 'crypto';
import { getDb } from './db.js';

// পাসওয়ার্ড হ্যাশ করার জন্য হেল্পার ফাংশন (PBKDF2 অ্যালগরিদম)
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`; // ডাটাবেজে সল্ট এবং হ্যাশ একসাথে সেভ করা হবে
}

// ইনপুট দেওয়া পাসওয়ার্ডের সাথে ডাটাবেজের হ্যাশ মেলানোর ফাংশন
function verifyPassword(password, storedPassword) {
    try {
        const [salt, originalHash] = storedPassword.split(':');
        const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        return hash === originalHash;
    } catch (e) {
        return false;
    }
}

export default async function handler(req, res) {
    const { action, email, password, name, token, pin } = req.body;
    const db = await getDb();

    try {
        // Admin Login Logic
        if (action === 'admin_login') {
            if (token === process.env.ADMIN_TOKEN && pin === process.env.ADMIN_PIN) {
                return res.status(200).json({ status: "Success" });
            } else {
                return res.status(401).json({ message: "Invalid Admin Credentials" });
            }
        } 
        
        // User Signup Logic
        else if (action === 'signup') {
            if (!email || !password || !name) {
                return res.status(400).json({ message: "All fields are required" });
            }

            // পাসওয়ার্ডটি ডাটাবেজে ইনসার্ট করার আগে হ্যাশ করা হচ্ছে
            const passwordHash = hashPassword(password);
            
            await db.execute(
                'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', 
                [name, email, passwordHash]
            );
            return res.status(200).json({ message: "Success" });
        } 
        
        // User Login Logic
        else {
            if (!email || !password) {
                return res.status(400).json({ message: "Email and Password are required" });
            }

            // প্রথমে ইমেইল দিয়ে ইউজারকে ডাটাবেজে খোঁজা হচ্ছে
            const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
            
            if (users.length > 0) {
                const user = users[0];
                
                // ডাটাবেজের হ্যাশ করা পাসওয়ার্ডের সাথে ইনপুট ম্যাচ করানো হচ্ছে
                if (verifyPassword(password, user.password_hash)) {
                    // পাসওয়ার্ড মিললে সিকিউরিটির স্বার্থে রেসপন্স থেকে পাসওয়ার্ডের কলামটি বাদ দেওয়া হচ্ছে
                    delete user.password_hash;
                    return res.status(200).json({ user: user });
                }
            }
            
            return res.status(401).json({ message: "Invalid email or password" });
        }
    } catch (e) {
        console.error("Auth API Error:", e);
        return res.status(500).json({ error: e.message });
    }
}
