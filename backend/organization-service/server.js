// backend/organization-service/server.js
//the main application file
require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.SERVICE_PORT || 3001;
const jwtSecret = process.env.JWT_SECRET; // Get JWT secret from env

// Middleware
app.use(express.json());

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
  const token = authHeader && authHeader.split(' ')[1];
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
    });
  } catch (error) {
    console.error('Error adding organization:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'An organization with this account number already exists.' });
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
    // Extract parameters from request
    const userId = req.user.id;
    const search = req.query.search || '';
    const pageNum = parseInt(req.query.page, 10) || 1;
    const limitNum = parseInt(req.query.limit, 10) || 20;

    const offset = (pageNum - 1) * limitNum;
    const searchTerm = `%${search}%`;

    const connection = await pool.getConnection();
    try {

        // Build base query and parameters
        let whereClause = 'WHERE o.user_id = ?';
        let searchParams = [userId];

        if (search) {
          whereClause += ' AND (o.name LIKE ? OR o.account_number LIKE ? OR o.website LIKE ?)';
          const searchTerm = `%${search}%`;
          searchParams.push(searchTerm, searchTerm, searchTerm);
        }
        
        // Count query
        const countQuery = `
          SELECT COUNT(DISTINCT o.id) as total
          FROM organizations o
          ${whereClause}
        `;
        const countParams = [...searchParams];
        
        // Data query
        const dataQuery = `
          SELECT o.*, MAX(p.date_paid) as lastPaid
          FROM organizations o
          LEFT JOIN payments p ON p.organization_id = o.id
          WHERE o.user_id = ?
          GROUP BY o.id
          ORDER BY lastPaid DESC, o.name ASC
          LIMIT ${limitNum} OFFSET ${offset}
        `;
        const dataParams = [userId];

        //queryParams.push(limitNum, offset);
        
        // --- DEBUGGING LOGS ---
        console.log('\n--- DEBUGGING SQL EXECUTION ---');
        const placeholderCount = (dataQuery.match(/\?/g) || []).length;
        console.log('Final SQL Query:', dataQuery.trim().replace(/\s+/g, ' '));
        console.log('Parameters Array:', dataParams);
        console.log('SQL Placeholder (?) Count:', placeholderCount);
        console.log('Parameters Array Length:', dataParams.length);
        if (placeholderCount !== dataParams.length) {
            console.error('!!! MISMATCH DETECTED: Placeholder count does not match parameter count.');
        }
        console.log('-----------------------------\n');
        // --- END DEBUGGING LOGS ---

        const [countRows] = await connection.execute(countQuery, countParams);
        const totalOrganizations = countRows[0].total;
        const totalPages = Math.ceil(totalOrganizations / limitNum);

        const [orgRows] = await connection.execute(dataQuery, dataParams);
        
        res.status(200).json({
            organizations: orgRows,
            totalPages,
            currentPage: pageNum,
            totalOrganizations
        });

    } catch (error) {
        console.error('Error fetching organizations:', error);
        res.status(500).json({ message: 'Server error fetching organizations.' });
    } finally {
        connection.release();
    }
});

/**
 * @route GET /organizations/export
 * @desc Export all organizations for the authenticated user as a JSON file.
 * @access Private (requires JWT)
 */
app.get('/organizations/export', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const [organizations] = await pool.execute(
            'SELECT name, account_number, website, typical_due_day FROM organizations WHERE user_id = ?',
            [userId]
        );
        res.status(200).json(organizations);
    } catch (error) {
        console.error('Error exporting organizations:', error);
        res.status(500).json({ message: 'Server error during export.' });
    }
});

/**
 * @route POST /organizations/import
 * @desc Import a list of organizations from a JSON upload for the authenticated user, skipping any duplicates by name.
 * @access Private (requires JWT)
 */
app.post('/organizations/import', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const organizationsToImport = req.body;

    if (!Array.isArray(organizationsToImport) || organizationsToImport.length === 0) {
        return res.status(400).json({ message: 'Request body must be a non-empty array of organizations.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        let importedCount = 0;
        let skippedNames = [];

        // First, get all existing organization names for this user in one query for efficiency.
        const [existingRows] = await connection.execute(
            'SELECT name FROM organizations WHERE user_id = ?',
            [userId]
        );
        const existingNames = new Set(existingRows.map(org => org.name.toLowerCase()));

        for (const org of organizationsToImport) {
            // Basic validation for each object
            if (!org.name) {
                throw new Error(`Invalid organization object found without a 'name' property.`);
            }

            // Check for duplicates (case-insensitive)
            if (existingNames.has(org.name.toLowerCase())) {
                skippedNames.push(org.name);
                continue; // Skip to the next organization
            }

            // If not a duplicate, insert it
            await connection.execute(
                'INSERT INTO organizations (user_id, name, account_number, website, typical_due_day) VALUES (?, ?, ?, ?, ?)',
                [
                    userId,
                    org.name,
                    org.account_number || null,
                    org.website || null,
                    org.typical_due_day || null
                ]
            );
            importedCount++;
            // Add the newly imported name to our set to prevent duplicates within the same file
            existingNames.add(org.name.toLowerCase());
        }

        await connection.commit();

        // Build the final success message for the user
        let finalMessage = `Successfully imported ${importedCount} new organizations.`;
        if (skippedNames.length > 0) {
            finalMessage += ` Skipped ${skippedNames.length} duplicates: ${skippedNames.join(', ')}.`;
        }

        res.status(201).json({ message: finalMessage });

    } catch (error) {
        await connection.rollback();
        console.error('Error importing organizations:', error);
        res.status(500).json({ message: 'Failed to import organizations. The entire operation was rolled back.', error: error.message });
    } finally {
        connection.release();
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