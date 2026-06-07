import crypto from 'crypto';
import { getDb } from './db.js';

// পাসওয়ার্ড হ্যাশ করার হেল্পার ফাংশন
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`; 
}

// পাসওয়ার্ড ভেরিফাই করার হেল্পার ফাংশন
function verifyPassword(password, storedPassword) {
    try {
        const [salt, originalHash] = storedPassword.split(':');
        const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        return hash === originalHash;
    } catch (e) {
        return false;
    }
}

// ৬ ডিজিটের সিকিউর রিকভারি কোড জেনারেটর ফাংশন
function generateRecoveryCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req, res) {
    const { action, email, password, name, token, pin, old_password, new_password, recovery_code } = req.body;
    const db = await getDb();

    try {
        // ১. Admin Login Logic
        if (action === 'admin_login') {
            if (token === process.env.ADMIN_TOKEN && pin === process.env.ADMIN_PIN) {
                return res.status(200).json({ status: "Success" });
            } else {
                return res.status(401).json({ message: "Invalid Admin Credentials" });
            }
        } 
        
        // ২. User Signup Logic (স্বয়ংক্রিয় রিকভারি কোড জেনারেশন সহ)
        else if (action === 'signup') {
            if (!email || !password || !name) {
                return res.status(400).json({ message: "All fields are required" });
            }

            const passwordHash = hashPassword(password);
            const recoveryCode = generateRecoveryCode(); // ৬ ডিজিটের রিকভারি কোড জেনারেট করা হলো
            
            await db.execute(
                'INSERT INTO users (username, email, password_hash, recovery_code) VALUES (?, ?, ?, ?)', 
                [name, email, passwordHash, recoveryCode]
            );
            return res.status(200).json({ message: "Success", recovery_code: recoveryCode });
        } 
        
        // ৩. কাস্টমার ওয়ান-ক্লিক প্রোফাইল সংশোধন এবং পাসওয়ার্ড চেঞ্জার লজিক
        else if (action === 'update_profile') {
            if (!email || !name) {
                return res.status(400).json({ message: "Email and Name are required" });
            }

            const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
            if (users.length === 0) {
                return res.status(404).json({ message: "User not found" });
            }

            const user = users[0];

            // গ্রাহক যদি পাসওয়ার্ড পরিবর্তন করতে চান
            if (new_password) {
                if (!old_password) {
                    return res.status(400).json({ message: "Old password is required to set a new password!" });
                }
                // পুরাতন পাসওয়ার্ড সঠিক আছে কি না তা যাচাই করা
                if (!verifyPassword(old_password, user.password_hash)) {
                    return res.status(401).json({ message: "Incorrect old password!" });
                }
                
                const newHash = hashPassword(new_password);
                await db.execute(
                    'UPDATE users SET username = ?, password_hash = ? WHERE email = ?',
                    [name, newHash, email]
                );
            } else {
                // শুধুমাত্র নাম আপডেট করা
                await db.execute('UPDATE users SET username = ? WHERE email = ?', [name, email]);
            }

            // আপডেটেড ইউজার সেশন রিমোটলি রিটার্ন করা
            const [updatedUsers] = await db.execute('SELECT id, username, email, created_at FROM users WHERE email = ?', [email]);
            return res.status(200).json({ message: "Success", user: updatedUsers[0] });
        }

        // ৪. কাস্টমার পাসওয়ার্ড রিকভারি লজিক (ফরগট পাসওয়ার্ড)
        else if (action === 'forgot_password') {
            if (!email || !recovery_code || !new_password) {
                return res.status(400).json({ message: "Email, Recovery Code and New Password are required!" });
            }

            const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
            if (users.length === 0) {
                return res.status(404).json({ message: "No registered account found with this email!" });
            }

            const user = users[0];

            // ইনপুট দেওয়া কোডের সাথে ডাটাবেজের রিকভারি কোড মেলানো
            if (user.recovery_code !== recovery_code) {
                return res.status(401).json({ message: "Incorrect Recovery Code! Please check your code." });
            }

            const newHash = hashPassword(new_password);
            await db.execute('UPDATE users SET password_hash = ? WHERE email = ?', [newHash, email]);
            return res.status(200).json({ message: "Success" });
        }
        
        // ৫. User Login Logic
        else {
            if (!email || !password) {
                return res.status(400).json({ message: "Email and Password are required" });
            }

            const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
            
            if (users.length > 0) {
                const user = users[0];
                
                if (verifyPassword(password, user.password_hash)) {
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
