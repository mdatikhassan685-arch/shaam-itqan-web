// db.js (Professional Pool Connection)
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: 4000,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10, // একসাথে ১০টি কানেকশন হ্যান্ডেল করবে
    queueLimit: 0
});

export const getDb = async () => {
    return pool; 
};
