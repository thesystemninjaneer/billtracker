// backend/bill-payment-service/server.js
require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();
const port = process.env.SERVICE_PORT || 3002;
const jwtSecret = process.env.JWT_SECRET;

app.use(express.json());

// Database connection pool
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

// Test DB connection
pool.getConnection()
  .then(connection => {
    console.log('Bill Payment Service: Connected to MySQL database!');
    connection.release();
  })
  .catch(err => {
    console.error('Bill Payment Service: Error connecting to database:', err.stack);
    process.exit(1);
  });

// --- JWT Authentication Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.status(401).json({ message: 'Authentication token required.' });

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      console.error("Bill Payment Service JWT verification error:", err);
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }
    req.user = user; // { id: userId, username: 'user' }
    next();
  });
};

// Apply authentication middleware to all bill payment routes
app.use('/bills', authenticateToken);
app.use('/payments', authenticateToken);
// Apply authentication to the notification test endpoint
app.use('/api/notifications/test-slack', authenticateToken);


// --- API Endpoints for Bills (Recurring Entries) ---

/**
 * Helper function to calculate the next due date for a recurring bill
 * @param {number} dueDay - The day of the month the bill is typically due (1-31)
 * @param {string} frequency - 'monthly', 'quarterly', 'annually'
 * @returns {Date} The next upcoming due date
 */
const calculateNextDueDate = (dueDay, frequency) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to the start of the day
    let nextDueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);

    if (nextDueDate < today) {
        switch (frequency) {
            case 'monthly':
                nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                break;
            case 'quarterly':
                nextDueDate.setMonth(nextDueDate.getMonth() + 3);
                break;
            case 'annually':
                nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
                break;
            default:
                nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                break;
        }
    }
    return nextDueDate;
};


/**
 * @route GET /bills/export
 * @desc Export all recurring bills for the authenticated user as a JSON file.
 * @access Private (requires JWT)
 */
app.get('/bills/export', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const [bills] = await pool.execute(
            `SELECT 
                o.name as organizationName,
                b.bill_name as billName,
                b.due_day as dueDay,
                b.typical_amount as typicalAmount,
                b.frequency,
                b.notes,
                b.is_active as isActive
             FROM bills b
             JOIN organizations o ON b.organization_id = o.id
             WHERE b.user_id = ?
             ORDER BY o.name, b.bill_name`,
            [userId]
        );

        const exportData = bills.map(b => ({
            organizationName: b.organizationName,
            billName: b.billName,
            dueDay: b.dueDay,
            typicalAmount: b.typicalAmount,
            frequency: b.frequency,
            notes: b.notes || null,
            isActive: !!b.isActive // Convert to boolean
        }));

        res.status(200).json(exportData);
    } catch (error) {
        console.error('Error exporting recurring bills:', error);
        res.status(500).json({ message: 'Server error during recurring bill export.' });
    }
});

/**
 * @route POST /bills/import
 * @desc Import a list of recurring bills, skipping duplicates.
 * @access Private (requires JWT)
 */
app.post('/bills/import', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const billsToImport = req.body;

    if (!Array.isArray(billsToImport) || billsToImport.length === 0) {
        return res.status(400).json({ message: 'Request body must be a non-empty array of bills.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        let importedCount = 0;
        let skippedCount = 0;

        for (const bill of billsToImport) {
            if (!bill.organizationName || !bill.billName) {
                throw new Error(`An item in the import file is missing a required 'organizationName' or 'billName'.`);
            }

            const [orgRows] = await connection.execute('SELECT id FROM organizations WHERE user_id = ? AND name = ?', [userId, bill.organizationName]);
            if (orgRows.length === 0) {
                throw new Error(`Organization '${bill.organizationName}' not found. Please add it before importing its bills.`);
            }
            const organizationId = orgRows[0].id;

            const [existingBills] = await connection.execute(
                'SELECT id FROM bills WHERE user_id = ? AND organization_id = ? AND bill_name = ?',
                [userId, organizationId, bill.billName]
            );

            if (existingBills.length > 0) {
                skippedCount++;
                continue; // Skip duplicate
            }

            await connection.execute(
                `INSERT INTO bills (user_id, organization_id, bill_name, due_day, typical_amount, frequency, notes, is_active) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId, organizationId, bill.billName,
                    bill.dueDay || null, bill.typicalAmount || null, bill.frequency || 'monthly',
                    bill.notes || null, bill.isActive === false ? 0 : 1
                ]
            );
            importedCount++;
        }

        await connection.commit();
        
        let finalMessage = `Import complete. Successfully imported ${importedCount} new recurring bills.`;
        if (skippedCount > 0) {
            finalMessage += ` Skipped ${skippedCount} duplicates that already existed.`;
        }
        res.status(201).json({ message: finalMessage });

    } catch (error) {
        await connection.rollback();
        console.error('Error importing recurring bills:', error);
        res.status(500).json({ message: 'Failed to import recurring bills. The entire operation was rolled back.', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route GET /payments/export
 * @desc Export payment history, excluding records that have not been paid.
 * @access Private (requires JWT)
 */
app.get('/payments/export', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { organizationId } = req.query;

    try {
        let query = `
            SELECT 
                o.name as organizationName, 
                b.bill_name as billName, 
                p.amount_paid, 
                p.date_paid, 
                p.confirmation_code, 
                p.notes, 
                p.due_date, 
                p.amount_due,
                p.payment_status
            FROM payments p
            JOIN organizations o ON p.organization_id = o.id
            LEFT JOIN bills b ON p.bill_id = b.id
            WHERE p.user_id = ? AND p.amount_paid IS NOT NULL
        `;
        const queryParams = [userId];

        if (organizationId && organizationId !== 'all') {
            query += ' AND p.organization_id = ?';
            queryParams.push(organizationId);
        }
        
        query += ' ORDER BY o.name, p.date_paid DESC';

        const [payments] = await pool.execute(query, queryParams);
        
        const exportData = payments.map(p => ({
            organizationName: p.organizationName,
            billName: p.billName || null,
            amountPaid: p.amount_paid,
            datePaid: p.date_paid,
            dueDate: p.due_date,
            amountDue: p.amount_due,
            paymentStatus: p.payment_status,
            confirmationCode: p.confirmation_code || null,
            notes: p.notes || null
        }));

        res.status(200).json(exportData);
    } catch (error) {
        console.error('Error exporting payment records:', error);
        res.status(500).json({ message: 'Server error during export.' });
    }
});

/**
 * @route POST /payments/import
 * @desc Import payment history, skipping records that already exist.
 * @access Private (requires JWT)
 */
app.post('/payments/import', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const paymentsToImport = req.body;

    if (!Array.isArray(paymentsToImport) || paymentsToImport.length === 0) {
        return res.status(400).json({ message: 'Request body must be a non-empty array of payment records.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        let importedCount = 0;
        let skippedIndexes = [];

        for (const [index, p] of paymentsToImport.entries()) {
            // Detailed validation for each required field.
            if (!p.organizationName) throw new Error(`Record at index ${index} is missing 'organizationName'.`);
            if (p.amountPaid == null) throw new Error(`Record for "${p.organizationName}" (index ${index}) is missing 'amountPaid'.`);
            if (!p.datePaid) throw new Error(`Record for "${p.organizationName}" (index ${index}) is missing 'datePaid'.`);
            if (p.amountDue == null) throw new Error(`Record for "${p.organizationName}" (index ${index}) is missing 'amountDue'.`);

            const [orgRows] = await connection.execute('SELECT id FROM organizations WHERE user_id = ? AND name = ?', [userId, p.organizationName]);
            if (orgRows.length === 0) {
                throw new Error(`Organization not found for name: "${p.organizationName}". Please add it first or correct the name.`);
            }
            const organizationId = orgRows[0].id;

            const formattedDatePaid = new Date(p.datePaid).toISOString().split('T')[0];
            const dueDateToInsert = p.dueDate ? new Date(p.dueDate).toISOString().split('T')[0] : formattedDatePaid;

            // Check for a duplicate payment in the database.
            // A duplicate is the same org, due date, and amount due.
            const [existingPayments] = await connection.execute(
                'SELECT id FROM payments WHERE user_id = ? AND organization_id = ? AND due_date = ? AND amount_due = ?',
                [userId, organizationId, dueDateToInsert, p.amountDue]
            );

            if (existingPayments.length > 0) {
                skippedIndexes.push(index);
                continue; // Skip this record
            }

            let billId = null;
            if (p.billName) {
                const [billRows] = await connection.execute('SELECT id FROM bills WHERE user_id = ? AND organization_id = ? AND bill_name = ?', [userId, organizationId, p.billName]);
                if (billRows.length > 0) billId = billRows[0].id;
            }
            
            const paymentStatusToInsert = p.paymentStatus || 'paid';

            await connection.execute(
                'INSERT INTO payments (user_id, organization_id, bill_id, amount_paid, date_paid, due_date, amount_due, payment_status, confirmation_code, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [userId, organizationId, billId, p.amountPaid, formattedDatePaid, dueDateToInsert, p.amountDue, paymentStatusToInsert, p.confirmationCode || null, p.notes || null]
            );
            importedCount++;
        }

        await connection.commit();

        let finalMessage = `Import complete. Imported ${importedCount} of ${paymentsToImport.length} records.`;
        if (skippedIndexes.length > 0) {
            finalMessage += ` Skipped ${skippedIndexes.length} duplicate records found at the following index numbers in the import file: ${skippedIndexes.join(', ')}.`;
        }

        res.status(201).json({ message: finalMessage });

    } catch (error) {
        await connection.rollback();
        console.error('Error importing payment records:', error);
        res.status(500).json({ message: 'Failed to import payment records. The entire operation was rolled back.', error: error.message });
    } finally {
        connection.release();
    }
});

// --- Bill CRUD Routes ---

/**
 * @route POST /bills
 * @desc Add a new recurring bill entry AND create its first upcoming payment record
 * @access Private
 */
app.post('/bills', async (req, res) => {
  const { organizationId, billName, dueDay, typicalAmount, frequency, notes } = req.body;
  const user_id = req.user.id;

  if (!organizationId || !billName || !dueDay || typicalAmount === undefined) {
    return res.status(400).json({ message: 'Organization ID, Bill Name, Due Day, and Typical Amount are required.' });
  }

  try {
    // Optional: Verify organization_id belongs to user
    const [orgs] = await pool.execute('SELECT id FROM organizations WHERE id = ? AND user_id = ?', [organizationId, user_id]);
    if (orgs.length === 0) {
      return res.status(404).json({ message: 'Organization not found or not authorized.' });
    }

    // Start a transaction for atomicity
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    let billId;
    try {
        // Insert new bill entry
        const [billResult] = await connection.execute(
            `INSERT INTO bills (user_id, organization_id, bill_name, due_day, typical_amount, frequency, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [user_id, organizationId, billName, dueDay, typicalAmount, frequency, notes]
        );
        billId = billResult.insertId;

        // Calculate the first upcoming due date for this bill
        const nextDueDate = calculateNextDueDate(dueDay, frequency);
        const nextDueDateISO = nextDueDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD

        // Create the initial 'pending' payment record for this bill
        const [paymentResult] = await connection.execute(
            `INSERT INTO payments (user_id, bill_id, organization_id, due_date, amount_due, payment_status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [user_id, billId, organizationId, nextDueDateISO, typicalAmount, 'pending']
        );

        await connection.commit(); // Commit the transaction

        res.status(201).json({
            message: 'Bill entry and initial payment added successfully',
            billId: billId,
            paymentId: paymentResult.insertId,
            bill: { id: billId, organizationId, billName, dueDay, typicalAmount, frequency, notes },
            initialPayment: { id: paymentResult.insertId, billId, organizationId, dueDate: nextDueDateISO, amountDue: typicalAmount, paymentStatus: 'pending' }
        });

    } catch (transactionError) {
        await connection.rollback(); // Rollback on error
        throw transactionError; // Re-throw to be caught by outer catch
    } finally {
        connection.release(); // Release the connection back to the pool
    }

  } catch (error) {
    console.error('Error adding bill entry and initial payment:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'A bill with this name already exists for this organization and user.' });
    }
    res.status(500).json({ message: 'Server error adding bill entry and initial payment.' });
  }
});

/**
 * @route GET /bills
 * @desc Get all recurring bill entries for a user, with organization name
 * @access Private
 */
app.get('/bills', async (req, res) => {
  const user_id = req.user.id;

  try {
    const [rows] = await pool.execute(
      `SELECT b.id, b.bill_name AS billName, b.due_day AS dueDay, b.typical_amount AS typicalAmount,
              b.frequency, b.notes, b.is_active AS isActive,
              o.id AS organizationId, o.name AS organizationName
        FROM bills b
        JOIN organizations o ON b.organization_id = o.id
        WHERE b.user_id = ? ORDER BY o.name, b.bill_name`,
      [user_id]
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching bill entries:', error);
    res.status(500).json({ message: 'Server error fetching bill entries.' });
  }
});

/**
 * @route GET /bills/:id
 * @desc Get a single recurring bill entry by ID
 * @access Private
 */
app.get('/bills/:id', async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const [rows] = await pool.execute(
      `SELECT b.id, b.bill_name AS billName, b.due_day AS dueDay, b.typical_amount AS typicalAmount,
              b.frequency, b.notes, b.is_active AS isActive,
              o.id AS organizationId, o.name AS organizationName
        FROM bills b
        JOIN organizations o ON b.organization_id = o.id
        WHERE b.id = ? AND b.user_id = ?`,
      [id, user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Bill entry not found or not authorized.' });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error fetching bill entry by ID:', error);
    res.status(500).json({ message: 'Server error fetching bill entry.' });
  }
});

/**
 * @route PUT /bills/:id
 * @desc Update a recurring bill entry and clear any associated pending payments to allow regeneration.
 * @access Private
 */
app.put('/bills/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { organizationId, billName, dueDay, typicalAmount, frequency, notes, isActive } = req.body;
    const userId = req.user.id;

    if (!organizationId || !billName) {
        return res.status(400).json({ message: 'Organization ID and Bill Name are required.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Step 1: Update the main recurring bill template in the 'bills' table.
        const [updateResult] = await connection.execute(
            `UPDATE bills
             SET organization_id = ?, bill_name = ?, due_day = ?, typical_amount = ?, frequency = ?, notes = ?, is_active = ?
             WHERE id = ? AND user_id = ?`,
            [organizationId, billName, dueDay || null, typicalAmount || null, frequency, notes, isActive, id, userId]
        );

        if (updateResult.affectedRows === 0) {
            throw new Error('Bill entry not found or not authorized to update.');
        }

        // Step 2: Delete any future 'pending' payment records for this bill.
        // This forces the upcoming bill generation logic to recreate it correctly on the next dashboard load.
        const todayISO = new Date().toISOString().split('T')[0];
        await connection.execute(
            `DELETE FROM payments WHERE bill_id = ? AND user_id = ? AND payment_status = 'pending' AND due_date >= ?`,
            [id, userId, todayISO]
        );

        await connection.commit();
        res.status(200).json({ message: 'Bill entry updated successfully. Future upcoming payments will be regenerated.' });

    } catch (error) {
        await connection.rollback();
        console.error('Error updating bill entry:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'A bill with this name already exists for this organization.' });
        }
        res.status(500).json({ message: error.message || 'Server error updating bill entry.' });
    } finally {
        connection.release();
    }
});

/**
 * @route DELETE /bills/:id
 * @desc Delete a recurring bill entry
 * @access Private
 */
app.delete('/bills/:id', async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const [result] = await pool.execute(
      'DELETE FROM bills WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Bill entry not found or not authorized to delete.' });
    }
    res.status(200).json({ message: 'Bill entry deleted successfully.' });
  } catch (error) {
    console.error('Error deleting bill entry:', error);
    res.status(500).json({ message: 'Server error deleting bill entry.' });
  }
});


// --- API Endpoints for Payments (Individual Records) ---

/**
 * @route POST /payments
 * @desc Record a new bill payment (for ad-hoc payments)
 * @access Private
 */
app.post('/payments', async (req, res) => {
  const { billId, organizationId, dueDate, amountDue, datePaid, confirmationCode, amountPaid, notes } = req.body;
  const user_id = req.user.id;
  const payment_status = (datePaid && amountPaid != null) ? 'paid' : 'pending';

  if (!organizationId || !dueDate || amountDue === undefined) {
    return res.status(400).json({ message: 'Organization ID, Due Date, and Amount Due are required.' });
  }

  try {
    // Verify organization_id belongs to user
    const [orgs] = await pool.execute('SELECT id FROM organizations WHERE id = ? AND user_id = ?', [organizationId, user_id]);
    if (orgs.length === 0) {
        return res.status(404).json({ message: 'Organization not found or not authorized.' });
    }
    if (billId) {
        const [bills] = await pool.execute('SELECT id FROM bills WHERE id = ? AND user_id = ?', [billId, user_id]);
        if (bills.length === 0) {
          return res.status(404).json({ message: 'Associated bill entry not found or not authorized.' });
        }
    }

    const [result] = await pool.execute(
        `INSERT INTO payments (user_id, bill_id, organization_id, due_date, amount_due, payment_status, date_paid, amount_paid, confirmation_code, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        // Ensure all optional fields default to null instead of undefined
        [user_id, billId || null, organizationId, dueDate, amountDue, payment_status, datePaid || null, amountPaid || null, confirmationCode || null, notes || null]
    );
    res.status(201).json({
        message: 'Payment recorded successfully',
        paymentId: result.insertId,
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ message: 'Server error recording payment.' });
  }
});


/**
 * @route GET /payments/upcoming
 * @desc Get upcoming bills due within the next 14 days, creating them Just-In-Time if they don't exist.
 * @access Private
 */
app.get('/payments/upcoming', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const connection = await pool.getConnection();

    try {
        // Step 1: Fetch all active recurring bills for the user.
        const [recurringBills] = await connection.execute(
            'SELECT id, organization_id, due_day, typical_amount, frequency FROM bills WHERE user_id = ? AND is_active = 1',
            [userId]
        );

        // Step 2: For each recurring bill, check if an upcoming payment record exists and create it if not.
        for (const bill of recurringBills) {
            if (!bill.due_day || !bill.frequency) continue;

            const nextDueDate = calculateNextDueDate(bill.due_day, bill.frequency);
            const nextDueDateISO = nextDueDate.toISOString().split('T')[0];

            const [existingPayments] = await connection.execute(
                'SELECT id FROM payments WHERE user_id = ? AND bill_id = ? AND due_date = ?',
                [userId, bill.id, nextDueDateISO]
            );

            if (existingPayments.length === 0) {
                await connection.execute(
                    `INSERT INTO payments (user_id, bill_id, organization_id, due_date, amount_due, payment_status)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [userId, bill.id, bill.organization_id, nextDueDateISO, bill.typical_amount, 'pending']
                );
            }
        }

        // Step 3: Fetch the complete list of upcoming bills within the next 14 days.
        const today = new Date();
        const fourteenDaysFromNow = new Date();
        fourteenDaysFromNow.setDate(today.getDate() + 14);

        const todayISO = today.toISOString().split('T')[0];
        const fourteenDaysFromNowISO = fourteenDaysFromNow.toISOString().split('T')[0];

        const [upcomingRows] = await connection.execute(
            `SELECT p.id, p.bill_id AS billId, p.organization_id AS organizationId, p.due_date AS dueDate,
                    p.amount_due AS amountDue, p.payment_status AS paymentStatus, p.amount_paid AS amountPaid,
                    o.name AS organizationName, b.bill_name AS billName
             FROM payments p
             JOIN organizations o ON p.organization_id = o.id
             LEFT JOIN bills b ON p.bill_id = b.id
             WHERE p.user_id = ? AND p.payment_status IN ('pending', 'overdue') AND p.due_date >= ? AND p.due_date <= ?
             ORDER BY p.due_date ASC`,
            [userId, todayISO, fourteenDaysFromNowISO]
        );

        res.status(200).json(upcomingRows);

    } catch (error) {
        console.error('Error fetching or generating upcoming payments:', error);
        res.status(500).json({ message: 'Server error while handling upcoming payments.' });
    } finally {
        connection.release();
    }
});


/**
 * @route GET /payments/recently-paid
 * @desc Get recently paid bills for a user (last 30 days)
 * @access Private
 */
app.get('/payments/recently-paid', async (req, res) => {
    const user_id = req.user.id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
        const [rows] = await pool.execute(
            `SELECT p.id, p.bill_id AS billId, p.organization_id AS organizationId, p.due_date AS dueDate,
                    p.amount_due AS amountDue, p.payment_status AS paymentStatus, p.date_paid AS datePaid,
                    p.amount_paid AS amountPaid, p.confirmation_code AS confirmationCode, p.notes,
                    o.name AS organizationName, b.bill_name AS billName
             FROM payments p
             JOIN organizations o ON p.organization_id = o.id
             LEFT JOIN bills b ON p.bill_id = b.id
             WHERE p.user_id = ? AND p.payment_status = 'paid' AND p.date_paid >= ?
             ORDER BY p.date_paid DESC`,
            [user_id, thirtyDaysAgo]
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching recently paid payments:', error);
        res.status(500).json({ message: 'Server error fetching recently paid payments.' });
    }
});

/**
 * @route GET /payments/:id
 * @desc Get a single payment record by ID
 * @access Private
 */
app.get('/payments/:id', async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const [rows] = await pool.execute(
      `SELECT p.id, p.bill_id AS billId, p.organization_id AS organizationId, p.due_date AS dueDate,
              p.amount_due AS amountDue, p.payment_status AS paymentStatus, p.date_paid AS datePaid,
              p.amount_paid AS amountPaid, p.confirmation_code AS confirmationCode, p.notes,
              o.name AS organizationName, b.bill_name AS billName
        FROM payments p
        JOIN organizations o ON p.organization_id = o.id
        LEFT JOIN bills b ON p.bill_id = b.id
        WHERE p.id = ? AND p.user_id = ?`,
      [id, user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Payment record not found or not authorized.' });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error fetching payment record by ID:', error);
    res.status(500).json({ message: 'Server error fetching payment record.' });
  }
});


/**
 * @route PUT /payments/:id
 * @desc Update a payment record, specifically for recording a payment against an upcoming bill.
 * @access Private
 */
app.put('/payments/:id', async (req, res) => {
    const { id } = req.params;
    const user_id = req.user.id;
    // For recording a payment, we expect the date it was paid and the amount of this specific payment.
    const { datePaid, amountPaid: newPaymentAmount, confirmationCode, notes } = req.body;

    // Validate the input for this specific action
    if (newPaymentAmount == null || !datePaid) {
        return res.status(400).json({ message: 'To record a payment, a valid amountPaid and datePaid are required.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Lock the row for update to prevent race conditions
        const [payments] = await connection.execute(
            'SELECT amount_due, amount_paid, payment_status FROM payments WHERE id = ? AND user_id = ? FOR UPDATE',
            [id, user_id]
        );

        if (payments.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Payment record not found or not authorized.' });
        }
        const currentPayment = payments[0];

        // Calculate the new total amount paid by adding the new payment to any existing amount.
        const newTotalAmountPaid = (Number(currentPayment.amount_paid) || 0) + Number(newPaymentAmount);
        
        // Determine the new status based on the total amount paid.
        let newStatus = currentPayment.payment_status;
        if (newTotalAmountPaid >= Number(currentPayment.amount_due)) {
            newStatus = 'paid'; // Mark as paid if the total meets or exceeds the amount due.
        }

        // Update the payment record with the new total and status.
        const [result] = await connection.execute(
            `UPDATE payments
             SET amount_paid = ?, date_paid = ?, confirmation_code = ?, notes = ?, payment_status = ?
             WHERE id = ? AND user_id = ?`,
            [newTotalAmountPaid, datePaid, confirmationCode || null, notes || null, newStatus, id, user_id]
        );
        
        await connection.commit();

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Payment record not found during update.' });
        }
        res.status(200).json({ message: 'Payment recorded successfully.', newStatus: newStatus });

    } catch (error) {
        await connection.rollback();
        console.error('Error updating payment record:', error);
        res.status(500).json({ message: 'Server error updating payment record.' });
    } finally {
        connection.release();
    }
});

/**
 * @route DELETE /payments/:id
 * @desc Delete a payment record
 * @access Private
 */
app.delete('/payments/:id', async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const [result] = await pool.execute(
      'DELETE FROM payments WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Payment record not found or not authorized to delete.' });
    }
    res.status(200).json({ message: 'Server error deleting payment record.' });
  } catch (error) {
    console.error('Error deleting payment record:', error);
    res.status(500).json({ message: 'Server error deleting payment record.' });
  }
});

// NEW: API Endpoint to send a test Slack notification
/**
 * @route POST /api/notifications/test-slack
 * @desc Send a test Slack notification to the user's configured webhook.
 * @access Private (requires JWT)
 */
app.post('/api/notifications/test-slack', async (req, res) => {
    const user_id = req.user.id; // Get user ID from authenticated token

    try {
        // Fetch user's Slack webhook URL and username from the 'users' table
        const [userRows] = await pool.execute(
            `SELECT slack_webhook_url, username FROM users WHERE id = ?`,
            [user_id]
        );

        if (userRows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const { slack_webhook_url, username } = userRows[0];

        if (!slack_webhook_url) {
            return res.status(400).json({ message: 'Slack webhook URL not configured for this user.' });
        }

        // Construct the test message payload
        const testMessage = {
            text: `BillTracker test message from ${username || 'your account'}. Your Slack webhook is working!`,
        };

        // Send the message to Slack
        await axios.post(slack_webhook_url, testMessage, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        res.status(200).json({ message: 'Test Slack message sent successfully!' });

    } catch (error) {
        console.error('Error sending test Slack message:', error.message);
        // Check if it's an Axios error (e.g., invalid webhook URL)
        if (axios.isAxiosError(error) && error.response) {
            return res.status(400).json({ message: `Failed to send test message: Slack responded with status ${error.response.status} - ${error.response.statusText}. Please check your webhook URL.` });
        }
        res.status(500).json({ message: 'Server error sending test Slack message.' });
    }
});


// Start the server
app.listen(port, () => {
  console.log(`Bill Payment Service running on port ${port}`);
});
