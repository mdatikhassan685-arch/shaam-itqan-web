const express = require('express');
const mysql = require('mysql2/promise');
const app = express();

app.use(express.json());

// TiDB Cloud Connection Pool
const pool = mysql.createPool({
    host: process.env.TIDB_HOST,
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: process.env.TIDB_DB,
    port: 4000,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
});

// --- ১. প্রোডাক্ট লোড করার API ---
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products ORDER BY id DESC');
        res.status(200).json(rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to load products" });
    }
});

// --- ২. সাইনআপ API ---
app.post('/api/signup', async (req, res) => {
    const { fullName, email, phone, password } = req.body;
    try {
        const [existing] = await pool.query('SELECT * FROM users WHERE email_address = ? OR phone_number = ?', [email, phone]);
        if (existing.length > 0) return res.status(400).json({ message: "ইমেইল বা ফোন আগে থেকেই আছে!" });

        await pool.query('INSERT INTO users (full_name, email_address, phone_number, password, role) VALUES (?, ?, ?, ?, "user")', [fullName, email, phone, password]);
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "সার্ভার এরর!" });
    }
});

// --- ৩. লগইন API ---
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE email_address = ? AND password = ?', [email, password]);
        if (rows.length > 0) res.status(200).json({ success: true, user: rows[0] });
        else res.status(401).json({ message: "তথ্য ভুল!" });
    } catch (err) {
        res.status(500).json({ message: "লগইন এরর!" });
    }
});

module.exports = app;
