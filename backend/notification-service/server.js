// --- main app file for notification service ---
// This file sets up the Express server, connects to the MySQL database,
// and defines the API endpoints for notification settings and real-time updates.
// It also initializes the notification scheduler to send daily reminders.
// The server listens on the port specified in the environment variable SERVICE_PORT or defaults to 3003
require('dotenv').config();

const express = require('express');
const path = require('path');
const { startNotificationScheduler } = require('./src/scheduler');
const { setupSSE } = require('./src/services/notificationService');
const cors = require('cors');
const jwt = require('jsonwebtoken');
// Enable CORS for frontend app
const corsOptions = {
  origin: 'http://localhost:8080', // Specify the allowed origin(s)
  methods: ['GET', 'POST', 'HEAD', 'PUT', 'PATCH', 'DELETE'], // Specify allowed HTTP methods
  allowedHeaders: ['Authorization', 'Content-Type'], // Specify allowed request headers
  credentials: true, // Allow cookies and authentication credentials
};

const app = express();
const jwtSecret = process.env.JWT_SECRET;

// --- Middleware ---
app.use(express.json());
app.use(cors(corsOptions)); // Enable CORS for all routes
app.use(express.urlencoded({ extended: true }));
// Set up your view engine (assuming EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views')); // EJS templates are in src/views
// Serve static files (CSS, client-side JS)
app.use(express.static(path.join(__dirname, 'public')));




// Test DB connection
const db = require('./src/db'); // Your MySQL DB connection
db.getConnection()
  .then(connection => {
    console.log('Notification Service: Connected to MySQL database!');
    connection.release();
  })
  .catch(err => {
    console.error('Notification Service: Error connecting to database:', err.stack);
    process.exit(1);
  });

// --- JWT Authentication Middleware for notification Service ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) return res.status(401).json({ message: 'Authentication token required.' });

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      console.error("Notification Service JWT verification error:", err);
      // For a production app, differentiate between malformed and expired tokens
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }
    req.user = user; // Attach user payload (e.g., { id: 1, username: 'testuser' }) to request
    next();
  });
};

// Apply authentication middleware to all notification routes
app.use('/settings/notifications', authenticateToken);
app.use('/api/users/me/notifications', authenticateToken);



// --- Routes ---

// Home/Dashboard route 
app.get('/dashboard', authenticateToken, async (req, res) => {
    if (!req.user) {
        return res.redirect('/login'); // Redirect to login if not authenticated
    }
    try {
        const userResult = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        const user = userResult.rows[0];
        const billsResult = await db.query('SELECT * FROM bills WHERE user_id = ? ORDER BY due_date ASC', [req.user.id]);
        const bills = billsResult.rows;

        res.render('dashboard', { user, bills, frontendUrl: process.env.FRONTEND_URL });
    } catch (err) {
        console.error('Error fetching dashboard data:', err);
        res.status(500).send('Error loading dashboard');
    }
});

// --- API Endpoints Route for Notification Settings Page ---
/**
 * @route GET /settings/notifications
 * @desc Render the notification settings page for the authenticated user
 * @access Private (requires JWT)
 */
app.get('/settings/notifications', authenticateToken, async (req, res) => {
    if (!req.user) {
        return res.redirect('/login'); // Redirect to login if not authenticated
    }
    try {
        const userResult = await db.query('SELECT id FROM users WHERE id = ?', [req.user.id]);
        if (!userResult.rows.length) {
            return res.status(404).send('User not found');
        }
        // Render the settings page. The client-side JS will fetch the settings via API.
        res.render('settings', { user: req.user, frontendUrl: process.env.FRONTEND_URL });
    } catch (err) {
        console.error('Error loading notification settings page:', err);
        res.status(500).send('Error loading page');
    }
});

// --- Notification Settings API Routes ---
app.get('/api/users/me/notifications', authenticateToken, async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const result = await db.query(
            `SELECT is_email_notification_enabled, is_slack_notification_enabled,
                    slack_webhook_url, in_app_alerts_enabled, notification_time_offsets
             FROM users WHERE id = ?`,
            [req.user.id]
        );
        const settings = result.rows[0];
        if (!settings) return res.status(404).json({ message: 'User not found' });

        // Parse notification_time_offsets from comma-separated string to array for frontend
        settings.notification_time_offsets = settings.notification_time_offsets
            ? settings.notification_time_offsets.split(',').map(Number)
            : [];

        res.json(settings);
    } catch (error) {
        console.error("Error fetching notification settings:", error);
        res.status(500).json({ message: 'Failed to fetch notification settings' });
    }
});

app.put('/api/users/me/notifications', authenticateToken, async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const {
        is_email_notification_enabled,
        is_slack_notification_enabled,
        slack_webhook_url,
        in_app_alerts_enabled,
        notification_time_offsets // This will be an array from frontend
    } = req.body;

    try {
        // Convert notification_time_offsets array to comma-separated string for MySQL storage
        const offsetsString = Array.isArray(notification_time_offsets)
            ? notification_time_offsets.join(',')
            : '';

        await db.query(
            `UPDATE users
             SET is_email_notification_enabled = ?,
                 is_slack_notification_enabled = ?,
                 slack_webhook_url = ?,
                 in_app_alerts_enabled = ?,
                 notification_time_offsets = ?
             WHERE id = ?`,
            [
                is_email_notification_enabled,
                is_slack_notification_enabled,
                slack_webhook_url,
                in_app_alerts_enabled,
                offsetsString, // Store as string
                req.user.id
            ]
        );
        res.status(200).json({ message: 'Notification settings updated successfully' });
    } catch (error) {
        console.error("Error updating notification settings:", error);
        res.status(500).json({ message: 'Failed to update notification settings' });
    }
});

// --- Server-Sent Events Endpoint ---
// This is the endpoint frontend will connect to for real-time updates
app.get('/api/notifications/stream', (req, res) => {
    setupSSE(req, res); // This function is from notificationService
});

// Start the notification server
const port = process.env.SERVICE_PORT || 3003;
app.listen(port, () => {
  console.log(`Notification Service running on port ${port}`);
  startNotificationScheduler(); // Start the daily cron job
});

module.exports = app; // Export app for testing if needed