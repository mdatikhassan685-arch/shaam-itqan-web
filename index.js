const express = require('express');
const path = require('path');
const db = require('./db');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- LOGIN API ---
app.post('/api/login', async (req, res) => {
    const { email, token, password, type } = req.body;
    
    try {
        let query, params;
        
        if (type === 'admin') {
            // শুধুমাত্র টোকেন এবং পাসওয়ার্ড দিয়ে অ্যাডমিন লগইন
            query = 'SELECT * FROM users WHERE admin_token = ? AND password = ?';
            params = [token, password];
        } else {
            // সাধারণ ইউজারের জন্য ইমেইল এবং পাসওয়ার্ড
            query = 'SELECT * FROM users WHERE email_address = ? AND password = ?';
            params = [email, password];
        }

        const [rows] = await db.execute(query, params);
        
        if (rows.length > 0) {
            res.json({ success: true, user: rows[0] });
        } else {
            res.status(401).json({ message: "তথ্য সঠিক নয়!" });
        }
    } catch (err) {
        res.status(500).json({ error: "সার্ভারে সমস্যা হচ্ছে" });
    }
});

// --- GET PRODUCTS ---
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM products ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = app;
