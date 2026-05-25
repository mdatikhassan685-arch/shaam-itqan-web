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
            connectionLimit: 10,  // Max 10 active connections at once
            queueLimit: 0
        });
    }
    return pool;
};
