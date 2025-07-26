// --- main app file for notification service ---
// This file sets up the Express server for background tasks like scheduling
// and Server-Sent Events (SSE). It no longer handles notification settings APIs.
require('dotenv').config();

const express = require('express');
const path = require('path');
const { startNotificationScheduler } = require('./src/scheduler');
const { setupSSE } = require('./src/services/notificationService');
const cors = require('cors'); // Keep cors for SSE if frontend connects directly
const jwt = require('jsonwebtoken'); // Keep jwt for SSE authentication if needed

const app = express();
const jwtSecret = process.env.JWT_SECRET; // Your JWT secret key

// --- Middleware (only if needed for SSE or other background tasks) ---
// Keep CORS if your frontend connects to SSE stream directly
const corsOptions = {
    origin: 'http://localhost:8080', // Allow your frontend's origin
    methods: 'GET,HEAD', // Only GET for SSE stream
    credentials: true,
    optionsSuccessStatus: 204,
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
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

// --- JWT Authentication Middleware (only if SSE stream is authenticated) ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

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

// --- Removed: EJS view engine setup and static file serving for EJS pages ---
// app.set('view engine', 'ejs');
// app.set('views', path.join(__dirname, 'src/views'));
// app.use(express.static(path.join(__dirname, 'public')));

// --- Removed: Authentication middleware applied to EJS routes ---
// app.use('/settings/notifications', authenticateToken);
// app.use('/dashboard', authenticateToken);

// --- Removed: Home/Dashboard route (EJS rendering) ---
// app.get('/dashboard', authenticateToken, async (req, res) => { /* ... */ });

// --- Removed: Notification Settings API Endpoints (Moved to user-service) ---
// app.get('/api/users/me/notifications', authenticateToken, async (req, res) => { /* ... */ });
// app.put('/api/users/me/notifications', authenticateToken, async (req, res) => { /* ... */ });

// --- Server-Sent Events Endpoint (Remains here) ---
// This is the endpoint frontend will connect to for real-time updates
app.get('/api/notifications/stream', authenticateToken, (req, res) => { // Added authenticateToken if SSE needs auth
    setupSSE(req, res); // This function is from notificationService
});

// Start the notification server
const port = process.env.SERVICE_PORT || 3003;
app.listen(port, () => {
  console.log(`Notification Service running on port ${port} (Background tasks & SSE only)`);
  startNotificationScheduler(); // Start the daily cron job
});

module.exports = app;
