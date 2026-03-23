const mysql = require('mysql2/promise');

let pool;

function createPool() {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            charset: 'utf8mb4'
        });

        console.log('✅ Database pool created');
    }

    return pool;
}

async function query(sql, params) {
    const connection = await getPool().getConnection();
    try {
        const [rows] = await connection.query(sql, params);
        return rows;
    } finally {
        connection.release();
    }
}

function getPool() {
    if (!pool) {
        return createPool();
    }
    return pool;
}

module.exports = {
    getPool,
    query,
    createPool
};