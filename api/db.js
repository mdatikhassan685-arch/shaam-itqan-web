import mysql from 'mysql2/promise';
export const getDb = async () => {
    return await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        port: 4000,
        ssl: { rejectUnauthorized: false }
    });
};
