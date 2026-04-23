const express = require('express');
const path = require('path');
const db = require('./db');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/login', async (req, res) => {
    const { email, phone, password, type } = req.body;
    try {
        let query, params;
        if (type === 'admin') {
            query = 'SELECT * FROM users WHERE phone_number = ? AND password = ? AND role = "admin"';
            params = [phone, password];
        } else {
            query = 'SELECT * FROM users WHERE email_address = ? AND password = ?';
            params = [email, password];
        }

        const [rows] = await db.execute(query, params);
        if (rows.length > 0) {
            res.json({ success: true, user: rows[0] });
        } else {
            res.status(401).json({ message: "Credential mismatch!" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// অন্যান্য এপিআই (Signup, Products) আগের মতোই থাকবে...
module.exports = app;
