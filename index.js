const express = require('express');
const cors = require('cors');
const pool = require('./db');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ফ্রন্টএন্ড ফাইল দেখানোর জন্য
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ডাটাবেস থেকে প্রোডাক্ট লিস্ট আনার API
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM products');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
