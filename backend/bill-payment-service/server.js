require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();
const port = process.env.SERVICE_PORT || 3002;
const jwtSecret = process.env.JWT_SECRET;
//const allowedOrigins = process.env.ALLOWED_ORIGIN;
const allowedOrigins = [process.env.FRONTEND_URL, process.env.ALLOWED_ORIGIN].filter(Boolean); // Filter out undefined values

// Middleware
const corsOptions = {
    origin: function (origin, callback) {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allow these HTTP methods
    credentials: true, // Allow cookies to be sent
    optionsSuccessStatus: 204,
    allowedHeaders: ['Content-Type', 'Authorization'] // Explicitly allow Authorization header
};
app.use(cors(corsOptions));
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
    let nextDueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);

    // If the calculated date is in the past, move it to the next month/period
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
                // For 'one-time' or unknown frequency, assume today if in past, or next month
                nextDueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
                if (nextDueDate < today) {
                    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                }
                break;
        }
    }
    // Handle cases where dueDay is greater than days in month (e.g., Feb 30)
    if (nextDueDate.getDate() !== dueDay) {
        nextDueDate.setDate(0); // Set to last day of previous month, then add dueDay
        nextDueDate.setDate(dueDay);
    }

    return nextDueDate;
};


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
 * @desc Update a recurring bill entry
 * @access Private
 */
app.put('/bills/:id', async (req, res) => {
  const { id } = req.params;
  const { organizationId, billName, dueDay, typicalAmount, frequency, notes, isActive } = req.body;
  const user_id = req.user.id;

  if (!organizationId || !billName) {
    return res.status(400).json({ message: 'Organization ID and Bill Name are required.' });
  }

  try {
    // Optional: Verify organization_id belongs to user
    const [orgs] = await pool.execute('SELECT id FROM organizations WHERE id = ? AND user_id = ?', [organizationId, user_id]);
    if (orgs.length === 0) {
      return res.status(404).json({ message: 'Organization not found or not authorized.' });
    }

    const [result] = await pool.execute(
      `UPDATE bills
        SET organization_id = ?, bill_name = ?, due_day = ?, typical_amount = ?, frequency = ?, notes = ?, is_active = ?
        WHERE id = ? AND user_id = ?`,
      [organizationId, billName, dueDay, typicalAmount, frequency, notes, isActive, id, user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Bill entry not found or not authorized to update.' });
    }
    res.status(200).json({ message: 'Bill entry updated successfully.' });
  } catch (error) {
    console.error('Error updating bill entry:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'A bill with this name already exists for this organization and user.' });
    }
    res.status(500).json({ message: 'Server error updating bill entry.' });
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
 * @desc Record a new bill payment
 * @access Private
 */
app.post('/payments', async (req, res) => {
  const { billId, organizationId, dueDate, amountDue, datePaid, paymentConfirmationCode, amountPaid, notes } = req.body;
  const user_id = req.user.id;
  const payment_status = (datePaid && amountPaid !== null) ? 'paid' : 'pending'; // Auto-set status

  if (!organizationId || !dueDate || amountDue === undefined) { // Check for amountDue explicitly
    return res.status(400).json({ message: 'Organization ID, Due Date, and Amount Due are required.' });
  }

  try {
    // Optional: Verify organization_id and bill_id belong to user
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
      [user_id, billId || null, organizationId, dueDate, amountDue, payment_status, datePaid || null, amountPaid || null, paymentConfirmationCode, notes]
    );
    res.status(201).json({
      message: 'Payment recorded successfully',
      paymentId: result.insertId,
      payment: { id: result.insertId, billId, organizationId, dueDate, amountDue, payment_status, datePaid, amountPaid, paymentConfirmationCode, notes }
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ message: 'Server error recording payment.' });
  }
});

/**
 * @route GET /payments/upcoming
 * @desc Get upcoming bills (payments with status 'pending' or 'overdue') for a user
 * @access Private
 */
app.get('/payments/upcoming', async (req, res) => {
    const user_id = req.user.id;
    const today = new Date().toISOString().split('T')[0]; // Current date YYYY-MM-DD

    try {
        const [rows] = await pool.execute(
            `SELECT p.id, p.bill_id AS billId, p.organization_id AS organizationId, p.due_date AS dueDate,
                    p.amount_due AS amountDue, p.payment_status AS paymentStatus, p.date_paid AS datePaid,
                    p.amount_paid AS amountPaid, p.confirmation_code AS confirmationCode, p.notes,
                    o.name AS organizationName, b.bill_name AS billName
             FROM payments p
             JOIN organizations o ON p.organization_id = o.id
             LEFT JOIN bills b ON p.bill_id = b.id
             WHERE p.user_id = ? AND p.payment_status IN ('pending', 'overdue') AND p.due_date >= ?
             ORDER BY p.due_date ASC`,
            [user_id, today]
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching upcoming payments:', error);
        res.status(500).json({ message: 'Server error fetching upcoming payments.' });
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
 * @desc Update a payment record
 * @access Private
 */
app.put('/payments/:id', async (req, res) => {
  const { id } = req.params;
  const { billId, organizationId, dueDate, amountDue, datePaid, paymentConfirmationCode, amountPaid, notes, paymentStatus } = req.body;
  const user_id = req.user.id;

  if (!organizationId || !dueDate || amountDue === undefined) {
    return res.status(400).json({ message: 'Organization ID, Due Date, and Amount Due are required.' });
  }

  try {
    // Optional: Verify organization_id and bill_id belong to user
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
      `UPDATE payments
        SET bill_id = ?, organization_id = ?, due_date = ?, amount_due = ?, payment_status = ?,
            date_paid = ?, amount_paid = ?, confirmation_code = ?, notes = ?
        WHERE id = ? AND user_id = ?`,
      [billId || null, organizationId, dueDate, amountDue, paymentStatus, datePaid || null, amountPaid || null, paymentConfirmationCode, notes, id, user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Payment record not found or not authorized to update.' });
    }
    res.status(200).json({ message: 'Payment record updated successfully.' });
  } catch (error) {
    console.error('Error updating payment record:', error);
    res.status(500).json({ message: 'Server error updating payment record.' });
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
