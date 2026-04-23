const express = require('express');
const mysql = require('mysql2/promise');
const app = express();

app.use(express.json());

// ডাটাবেস কানেকশন পুল (TiDB Cloud)
const pool = mysql.createPool({
    host: process.env.TIDB_HOST,
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: process.env.TIDB_DB,
    port: 4000,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
});

// SIGNUP API
app.post('/api/signup', async (req, res) => {
    const { fullName, email, phone, password } = req.body;
    try {
        const [existing] = await pool.execute('SELECT * FROM users WHERE email_address = ? OR phone_number = ?', [email, phone]);
        if (existing.length > 0) return res.status(400).json({ message: "ইমেইল বা ফোন আগে থেকেই আছে!" });

        await pool.execute('INSERT INTO users (full_name, email_address, phone_number, password, role) VALUES (?, ?, ?, ?, "user")', [fullName, email, phone, password]);
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "সার্ভার এরর!" });
    }
});

// LOGIN API
app.post('/api/login', async (req, res) => {
    const { email, token, password, type } = req.body;
    try {
        let query, params;
        if (type === 'admin') {
            query = 'SELECT * FROM users WHERE admin_token = ? AND password = ? AND role = "admin"';
            params = [token, password];
        } else {
            query = 'SELECT * FROM users WHERE email_address = ? AND password = ?';
            params = [email, password];
        }
        const [rows] = await pool.execute(query, params);
        if (rows.length > 0) res.json({ success: true, user: rows[0] });
        else res.status(401).json({ message: "তথ্য ভুল!" });
    } catch (err) {
        res.status(500).json({ error: "সার্ভার সমস্যা" });
    }
});

// GET PRODUCTS
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM products ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "লোড করা যাচ্ছে না" });
    }
});

module.exports = app;
