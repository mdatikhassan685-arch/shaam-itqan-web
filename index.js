const express = require('express');
const path = require('path');
const db = require('./db');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- LOGIN API ---
app.post('/api/login', async (req, res) => {
    const { email, phone, password, type } = req.body;
    try {
        let query, params;
        
        if (type === 'admin') {
            // অ্যাডমিন লগইনের জন্য ইমেইল, ফোন এবং পাসওয়ার্ড ৩টিই মিলতে হবে
            query = 'SELECT * FROM users WHERE email_address = ? AND phone_number = ? AND password = ? AND role = "admin"';
            params = [email, phone, password];
        } else {
            // সাধারণ ইউজার লগইন শুধুমাত্র ইমেইল এবং পাসওয়ার্ড দিয়ে
            query = 'SELECT * FROM users WHERE email_address = ? AND password = ?';
            params = [email, password];
        }

        const [rows] = await db.execute(query, params);
        
        if (rows.length > 0) {
            res.json({ success: true, user: rows[0] });
        } else {
            res.status(401).json({ 
                message: type === 'admin' 
                    ? "অ্যাডমিন তথ্য (ইমেইল/ফোন/পাসওয়ার্ড) ভুল!" 
                    : "ইমেইল বা পাসওয়ার্ড সঠিক নয়" 
            });
        }
    } catch (err) {
        res.status(500).json({ error: "সার্ভারে সমস্যা হচ্ছে" });
    }
});

// অন্যান্য প্রয়োজনীয় রাউট (Products, Signup) আগের মতোই থাকবে...
module.exports = app;
