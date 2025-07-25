// --- backend/notififcation-service/db.js --
// This file handles the database connection for the notification service using MySQL.
const mysql = require('mysql2/promise'); // Use promise-based API for async/await

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10, // Adjust as needed
    queueLimit: 0
});

module.exports = {
    /**
     * Executes a SQL query with parameters.
     * @param {string} sql - The SQL query string.
     * @param {Array<any>} [params] - An array of parameters for the query.
     * @returns {Promise<{rows: Array<Object>}>} - A promise that resolves to an object with a 'rows' array.
     */
    query: async (sql, params) => {
        try {
            const [rows, fields] = await pool.execute(sql, params);
            // Wrap in { rows } to maintain consistency with pg.query result structure
            // for easier integration with existing code that might expect 'rows'.
            return { rows };
        } catch (error) {
            console.error('MySQL Query Error:', error.message);
            throw error; // Re-throw the error to be caught by calling functions
        }
    },
    // Optional: If you need to manage transactions or specific connections
    getConnection: () => pool.getConnection()
};
