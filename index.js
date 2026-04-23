const express = require('express');
const path = require('path');
const db = require('./db'); // TiDB Cloud Connection
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- ১. LOGIN API (User & Admin) ---
app.post('/api/login', async (req, res) => {
    const { email, token, password, type } = req.body;
    
    try {
        let query, params;
        
        if (type === 'admin') {
            // অ্যাডমিন শুধুমাত্র টোকেন এবং পাসওয়ার্ড দিয়ে ঢুকবে
            query = 'SELECT * FROM users WHERE admin_token = ? AND password = ? AND role = "admin"';
            params = [token, password];
        } else {
            // সাধারণ ইউজার ইমেইল এবং পাসওয়ার্ড দিয়ে
            query = 'SELECT * FROM users WHERE email_address = ? AND password = ?';
            params = [email, password];
        }

        const [rows] = await db.execute(query, params);
        
        if (rows.length > 0) {
            res.json({ success: true, user: rows[0] });
        } else {
            res.status(401).json({ message: "Login failed! Please check your credentials." });
        }
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

// --- ২. SIGNUP API ---
app.post('/api/signup', async (req, res) => {
    const { fullName, email, phone, password } = req.body;
    try {
        await db.execute(
            'INSERT INTO users (full_name, email_address, phone_number, password, role) VALUES (?, ?, ?, ?, "user")',
            [fullName, email, phone, password]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Email or Phone already exists!" });
    }
});

// --- ৩. GET ALL PRODUCTS ---
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM products ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Cannot load products" });
    }
});

module.exports = app;
