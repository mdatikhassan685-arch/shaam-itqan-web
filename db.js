const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: '3soUMcYGhcAS9eK.root',
  password: 'j5gdb3r3rZnmPJo8',
  database: 'test',
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  }
});

module.exports = pool;
