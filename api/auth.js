import mysql from 'mysql2/promise';

export default async function handler(req, res) {
    const { type, email, password, name } = req.body;
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST, user: process.env.DB_USER,
        password: process.env.DB_PASS, database: process.env.DB_NAME,
        port: 4000, ssl: { rejectUnauthorized: false }
    });

    try {
        if (type === 'signup') {
            await connection.execute('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [name, email, password]);
            res.status(200).json({ message: "Signup Success" });
        } else if (type === 'login') {
            const [rows] = await connection.execute('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
            if (rows.length > 0) res.status(200).json({ user: rows[0] });
            else res.status(401).json({ error: "Invalid Credentials" });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
    await connection.end();
}
