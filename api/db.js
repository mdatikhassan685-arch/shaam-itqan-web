const mysql = require('mysql2/promise');

// তোমার TiDB Cloud এর কানেকশন ডিটেইলস এখানে বসাও
const pool = mysql.createPool({
    host: 'YOUR_TIDB_HOST',
    user: 'YOUR_TIDB_USER',
    password: 'YOUR_TIDB_PASSWORD',
    database: 'YOUR_DATABASE_NAME',
    port: 4000, // TiDB এর ডিফল্ট পোর্ট
    ssl: { rejectUnauthorized: true }, // TiDB এর জন্য এটি জরুরি
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
