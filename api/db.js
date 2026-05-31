import mysql from 'mysql2/promise';

let pool;

export const getDb = async () => {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            port: 4000,
            ssl: { rejectUnauthorized: false },
            waitForConnections: true,
            connectionLimit: 10,
            maxIdle: 10,             // অলস কানেকশন সর্বোচ্চ ১০টি জমা থাকতে পারবে
            idleTimeout: 5000,       // ৫ সেকেন্ড অলস থাকলে কানেকশন স্বয়ংক্রিয়ভাবে বন্ধ হয়ে যাবে (সার্ভারলেস হোস্টিংয়ের জন্য অত্যন্ত জরুরী!)
            queueLimit: 0
        });
    }
    return pool;
};
