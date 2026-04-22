const express = require('express');
const path = require('path');
const db = require('./db');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- HOME ROUTE FIX ---
// এই অংশটি নিশ্চিত করবে যে হোমপেজে গেলে index.html দেখা যাবে
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- USER SYSTEM ---
app.post('/api/signup', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        await db.execute('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, password]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
        if (rows.length > 0) res.json({ success: true, user: rows[0] });
        else res.status(401).json({ message: "Invalid credentials" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- PRODUCT SYSTEM ---
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM products');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/add-product', async (req, res) => {
    const { name, price, description, image_url } = req.body;
    try {
        await db.execute('INSERT INTO products (name, price, description, image_url) VALUES (?, ?, ?, ?)', 
        [name, price, description, image_url]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Vercel এর জন্য পোর্ট লিসেনিং (লোকাল টেস্টের সুবিধার্থে)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
