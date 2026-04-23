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
            // এডমিনের জন্য ফোন নম্বর ও পাসওয়ার্ড চেক
            query = 'SELECT * FROM users WHERE phone_number = ? AND password = ? AND role = "admin"';
            params = [phone, password];
        } else {
            // সাধারণ ইউজারের জন্য ইমেইল ও পাসওয়ার্ড চেক
            query = 'SELECT * FROM users WHERE email_address = ? AND password = ?';
            params = [email, password];
        }

        const [rows] = await db.execute(query, params);
        if (rows.length > 0) {
            res.json({ success: true, user: rows[0] });
        } else {
            res.status(401).json({ message: "তথ্য সঠিক নয় অথবা আপনি নিবন্ধিত নন" });
        }
    } catch (err) {
        res.status(500).json({ error: "সার্ভার এরর" });
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
        res.status(500).json({ error: "এই ইমেইল বা ফোন নম্বরটি ইতিমধ্যে ব্যবহৃত হয়েছে" }); 
    }
});

// --- PRODUCT API ---
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM products ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "প্রোডাক্ট লোড করা যাচ্ছে না" });
    }
});

module.exports = app;
