//the main application file
require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
// const cors = require('cors');
const jwt = require('jsonwebtoken'); // Import jsonwebtoken

const app = express();
const port = process.env.SERVICE_PORT || 3001;
const jwtSecret = process.env.JWT_SECRET; // Get JWT secret from env

// Middleware
// app.use(cors());
app.use(express.json());

// Database connection pool (same as before)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test DB connection (same as before)
pool.getConnection()
  .then(connection => {
    console.log('Organization Service: Connected to MySQL database!');
    connection.release();
  })
  .catch(err => {
    console.error('Organization Service: Error connecting to database:', err.stack);
    process.exit(1);
  });

// --- JWT Authentication Middleware for Organization Service ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) return res.status(401).json({ message: 'Authentication token required.' });

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      console.error("Organization Service JWT verification error:", err);
      // For a production app, differentiate between malformed and expired tokens
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }
    req.user = user; // Attach user payload (e.g., { id: 1, username: 'testuser' }) to request
    next();
  });
};

// --- Apply authentication middleware to all organization routes ---
// All routes below this line will require a valid JWT token
app.use('/organizations', authenticateToken);

// --- API Endpoints for Billing Organizations ---

/**
 * @route POST /organizations
 * @desc Add a new billing organization
 * @access Private (requires JWT)
 */
app.post('/organizations', async (req, res) => {
  const { name, accountNumber, typicalDueDay, website, contactInfo } = req.body;
  const user_id = req.user.id; // Get user_id from the authenticated token!

  if (!name || !accountNumber) {
    return res.status(400).json({ message: 'Name and Account Number are required.' });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO organizations (user_id, name, account_number, typical_due_day, website, contact_info)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, name, accountNumber, typicalDueDay, website, contactInfo]
    );
    res.status(201).json({
      message: 'Organization added successfully',
      organizationId: result.insertId,
      organization: { id: result.insertId, name, accountNumber, typicalDueDay, website, contactInfo, user_id }
    });
  } catch (error) {
    console.error('Error adding organization:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'An organization with this account number already exists for this user.' });
    }
    res.status(500).json({ message: 'Server error adding organization.' });
  }
});

/**
 * @route GET /organizations
 * @desc Get all billing organizations for a user
 * @access Private (requires JWT)
 */
app.get('/organizations', async (req, res) => {
  const user_id = req.user.id; // Get user_id from the authenticated token!

  try {
    const [rows] = await pool.execute(
      'SELECT id, name, account_number AS accountNumber, typical_due_day AS typicalDueDay, website, contact_info AS contactInfo FROM organizations WHERE user_id = ?',
      [user_id]
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ message: 'Server error fetching organizations.' });
  }
});

/**
 * @route GET /organizations/:id
 * @desc Get a single billing organization by ID
 * @access Private (requires JWT)
 */
app.get('/organizations/:id', async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id; // Get user_id from the authenticated token!

  try {
    const [rows] = await pool.execute(
      'SELECT id, name, account_number AS accountNumber, typical_due_day AS typicalDueDay, website, contact_info AS contactInfo FROM organizations WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Organization not found or not authorized.' });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error fetching organization by ID:', error);
    res.status(500).json({ message: 'Server error fetching organization.' });
  }
});

/**
 * @route PUT /organizations/:id
 * @desc Update a billing organization
 * @access Private (requires JWT)
 */
app.put('/organizations/:id', async (req, res) => {
  const { id } = req.params;
  const { name, accountNumber, typicalDueDay, website, contactInfo } = req.body;
  const user_id = req.user.id; // Get user_id from the authenticated token!

  if (!name || !accountNumber) {
    return res.status(400).json({ message: 'Name and Account Number are required.' });
  }

  try {
    const [result] = await pool.execute(
      `UPDATE organizations
       SET name = ?, account_number = ?, typical_due_day = ?, website = ?, contact_info = ?
       WHERE id = ? AND user_id = ?`,
      [name, accountNumber, typicalDueDay, website, contactInfo, id, user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Organization not found or not authorized to update.' });
    }
    res.status(200).json({ message: 'Organization updated successfully.' });
  } catch (error) {
    console.error('Error updating organization:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'An organization with this account number already exists for this user.' });
    }
    res.status(500).json({ message: 'Server error updating organization.' });
  }
});

/**
 * @route DELETE /organizations/:id
 * @desc Delete a billing organization
 * @access Private (requires JWT)
 */
app.delete('/organizations/:id', async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id; // Get user_id from the authenticated token!

  try {
    const [result] = await pool.execute(
      'DELETE FROM organizations WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Organization not found or not authorized to delete.' });
    }
    res.status(200).json({ message: 'Organization deleted successfully.' });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({ message: 'Server error deleting organization.' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Organization Service running on port ${port}`);
});