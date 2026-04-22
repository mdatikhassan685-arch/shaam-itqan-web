const express = require('express');
const cors = require('cors');
const pool = require('./db');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ১. ফ্রন্টএন্ড হোমপেজ দেখানোর জন্য
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ২. অ্যাডমিন প্যানেল পেজ দেখানোর জন্য
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// ৩. ডাটাবেস থেকে প্রোডাক্ট লিস্ট আনার API (হোমপেজে দেখানোর জন্য)
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM products ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "ডাটাবেস কানেকশনে সমস্যা হয়েছে।" });
    }
});

// ৪. অ্যাডমিন প্যানেল থেকে নতুন প্রোডাক্ট যোগ করার API
app.post('/api/add-product', async (req, res) => {
    const { name, price, description } = req.body;
    try {
        const query = 'INSERT INTO products (name, price, description) VALUES (?, ?, ?)';
        await pool.execute(query, [name, price, description]);
        res.status(200).json({ message: 'Product added successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "প্রোডাক্ট আপলোড করতে সমস্যা হয়েছে।" });
    }
});

// সার্ভার পোর্ট সেটআপ
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
