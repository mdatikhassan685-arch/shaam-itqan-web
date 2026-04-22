const express = require('express');
const cors = require('cors');
const pool = require('./db');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// ১. পেজ রাউটস
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'signup.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// ২. সাইনআপ ফাংশন (Signup)
app.post('/api/signup', async (req, res) => {
    const { name, phone, password } = req.body;
    try {
        await pool.execute('INSERT INTO users (full_name, phone_number, password) VALUES (?, ?, ?)', [name, phone, password]);
        res.status(200).json({ message: 'Account created!' });
    } catch (err) {
        res.status(500).json({ error: 'Phone number already exists!' });
    }
});

// ৩. লগইন ফাংশন (Login)
app.post('/api/login', async (req, res) => {
    const { phone, password } = req.body;
    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE phone_number = ? AND password = ?', [phone, password]);
        if (rows.length > 0) {
            res.status(200).json({ message: 'Login successful', user: rows[0] });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ৪. প্রোডাক্ট লিস্ট
app.get('/api/products', async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM products ORDER BY id DESC');
    res.json(rows);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on ${PORT}`));
