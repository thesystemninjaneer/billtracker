// --- main app file for notification service ---
// This file sets up the Express server for background tasks like scheduling
// and Server-Sent Events (SSE). It no longer handles notification settings APIs.
require('dotenv').config();

const express = require('express');
const path = require('path');
const { startNotificationScheduler, setupSSE, sendSSE, connectedClients } = require('./src/services/notificationService');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const jwtSecret = process.env.JWT_SECRET;
//const allowedOrigins =  process.env.ALLOWED_ORIGIN;
const allowedOrigins = [process.env.FRONTEND_URL, process.env.ALLOWED_ORIGIN].filter(Boolean); // Filter out undefined values

// --- Middleware (CORS Configuration) ---
const corsOptions = {
    origin: function (origin, callback) {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204,
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions)); // Apply this middleware
// ADDED FOR DEBUGGING: Log the configured CORS origin
console.log(`Notification Service: CORS configured to allow origin: ${corsOptions.origin}`);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection pool (still needed for scheduler and SSE)
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

// --- JWT Authentication Middleware (for SSE stream and test endpoint) ---
const authenticateToken = (req, res, next) => {
  let token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1]; // Bearer TOKEN
  if (!token && req.query.token) { // Check query parameter if header is missing
      token = req.query.token;
  }

  if (token == null) return res.status(401).json({ message: 'Authentication token required.' });

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      console.error("Notification Service JWT verification error:", err);
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
};

// --- Server-Sent Events Endpoint (Remains here) ---
app.get('/api/notifications/stream', authenticateToken, (req, res) => {
    setupSSE(req, res); // This function is from notificationService
});

// NEW: API Endpoint to send a test In-App notification
/**
 * @route POST /api/notifications/test-in-app
 * @desc Send a test in-app notification to the authenticated user's connected clients.
 * @access Private (requires JWT)
 */
app.post('/api/notifications/test-in-app', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const username = req.user.username || 'User';

    if (!connectedClients.has(userId)) {
        return res.status(400).json({ message: 'No active in-app notification connection found for this user. Please ensure your browser is connected to the SSE stream.' });
    }

    try {
        sendSSE(userId, {
            type: 'in-app-test',
            message: `BillTracker test in-app alert from ${username}! Your in-app notifications are working.`,
            timestamp: new Date().toISOString()
        });
        res.status(200).json({ message: 'Test in-app notification triggered successfully.' });
    } catch (error) {
        console.error('Error triggering test in-app notification:', error);
        res.status(500).json({ message: 'Server error triggering test in-app notification.' });
    }
});


// Start the notification server
const port = process.env.SERVICE_PORT || 3003;
app.listen(port, () => {
  console.log(`Notification Service running on port ${port} (Background tasks & SSE only)`);
  startNotificationScheduler();
});

module.exports = app;
