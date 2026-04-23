const express = require('express');
const mysql = require('mysql2/promise');
const app = express();

app.use(express.json());

const dbConfig = {
    host: process.env.TIDB_HOST,
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: process.env.TIDB_DB,
    port: 4000,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
};

// ১. প্রোডাক্ট লোড (এটা আপনার ঠিক হয়ে গেছে)
app.get('/api/products', async (req, res) => {
    let conn;
    try {
        conn = await mysql.createConnection(dbConfig);
        const [rows] = await conn.execute('SELECT * FROM products ORDER BY id DESC');
        res.status(200).json(rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to load products" });
    } finally { if(conn) await conn.end(); }
});

// ২. সাইনআপ API ফিক্স
app.post('/api/signup', async (req, res) => {
    let conn;
    const { fullName, email, phone, password } = req.body;
    try {
        conn = await mysql.createConnection(dbConfig);
        // কলামের নাম আপনার টেবিল অনুযায়ী চেক করে নিন
        await conn.execute(
            'INSERT INTO users (full_name, email_address, phone_number, password) VALUES (?, ?, ?, ?)',
            [fullName, email, phone, password]
        );
        res.status(200).json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Sign up failed! কলামের নাম চেক করুন।" });
    } finally { if(conn) await conn.end(); }
});

// ৩. লগইন API ফিক্স
app.post('/api/login', async (req, res) => {
    let conn;
    const { email, password } = req.body;
    try {
        conn = await mysql.createConnection(dbConfig);
        const [rows] = await conn.execute(
            'SELECT * FROM users WHERE email_address = ? AND password = ?',
            [email, password]
        );
        if (rows.length > 0) {
            res.status(200).json({ success: true, user: rows[0] });
        } else {
            res.status(401).json({ message: "ইমেইল বা পাসওয়ার্ড ভুল!" });
        }
    } catch (err) {
        res.status(500).json({ message: "Login failed!" });
    } finally { if(conn) await conn.end(); }
});

module.exports = app;
