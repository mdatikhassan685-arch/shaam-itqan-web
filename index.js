const express = require('express');
const path = require('path');
const db = require('./db');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- HOME ROUTE ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- LOGIN API (সাধারণ ইউজার এবং লুকানো এডমিন লগইন) ---
app.post('/api/login', async (req, res) => {
    const { email, phone, password, type } = req.body;
    
    try {
        let query, params;
        
        if (type === 'admin') {
            // শুধুমাত্র নির্দিষ্ট ফোন এবং পাসওয়ার্ড দিয়ে এডমিন লগইন
            query = 'SELECT * FROM users WHERE phone_number = ? AND password = ? AND role = "admin"';
            params = [phone, password];
        } else {
            // সাধারণ ইউজারের জন্য ইমেইল লগইন
            query = 'SELECT * FROM users WHERE email_address = ? AND password = ?';
            params = [email, password];
        }

        const [rows] = await db.execute(query, params);

        if (rows.length > 0) {
            // লগইন সফল হলে ইউজারের পুরো ডাটা পাঠানো হচ্ছে
            res.json({ success: true, user: rows[0] });
        } else {
            res.status(401).json({ message: "তথ্য সঠিক নয় অথবা আপনি অ্যাডমিন নন" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "সার্ভারে সমস্যা হচ্ছে, আবার চেষ্টা করুন" });
    }
});

// --- SIGNUP API ---
app.post('/api/signup', async (req, res) => {
    const { fullName, email, phone, password } = req.body;
    try {
        await db.execute(
            'INSERT INTO users (full_name, email_address, phone_number, password, role) VALUES (?, ?, ?, ?, "user")', 
            [fullName, email, phone, password]
        );
        res.json({ success: true });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: "ইমেইলটি ইতিমধ্যে ব্যবহার করা হয়েছে অথবা ডাটাবেস এরর" }); 
    }
});
