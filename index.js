const express = require('express');
const path = require('path');
const db = require('./db');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- LOGIN API ---
app.post('/api/login', async (req, res) => {
    const { email, password, type, phone } = req.body;
    try {
        let query, params;
        if (type === 'admin') {
            // এডমিনের জন্য ফোন এবং পাসওয়ার্ড
            query = 'SELECT * FROM users WHERE phone_number = ? AND password = ? AND role = "admin"';
            params = [phone, password];
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
        res.status(500).json({ error: err.message });
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
        res.status(500).json({ error: "Email already exists or DB error" }); 
    }
});

// --- PRODUCT API (Fixing the grid issue) ---
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM products ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = app;
