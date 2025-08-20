require('dotenv').config(); // Load environment variables from .env

const express = require('express');
const mysql = require('mysql2/promise');
// const cors = require('cors');
const bcrypt = require('bcryptjs'); // For password hashing
const jwt = require('jsonwebtoken'); // For JWT token generation

const app = express();
const port = process.env.SERVICE_PORT || 3000;
const jwtSecret = process.env.JWT_SECRET; // Your JWT secret key
//const allowedOrigins =  process.env.ALLOWED_ORIGIN;
const allowedOrigins = [process.env.FRONTEND_URL, process.env.ALLOWED_ORIGIN].filter(Boolean); // Filter out undefined values

// Middleware
// const corsOptions = {
//     origin: function (origin, callback) {
//         if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
//             callback(null, true);
//         } else {
//             callback(new Error('Not allowed by CORS'));
//         }
//     },
//     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allow these HTTP methods
//     credentials: true, // Allow cookies to be sent
//     optionsSuccessStatus: 204,
//     allowedHeaders: ['Content-Type', 'Authorization'] // Explicitly allow Authorization header
// };
// app.use(cors(corsOptions)); // Enable CORS with specific options
app.use(express.json()); // For parsing application/json

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
    console.log('User Service: Connected to MySQL database!');
    connection.release();
  })
  .catch(err => {
    console.error('User Service: Error connecting to database:', err.stack);
    process.exit(1);
  });

// --- JWT Authentication Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) return res.status(401).json({ message: 'Authentication token required.' });

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      console.error("JWT verification error:", err);
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }
    req.user = user; // Attach user payload (e.g., { id: 1, username: 'testuser' }) to request
    next();
  });
};

// --- API Endpoints for Users ---

/**
 * @route POST /register
 * @desc Register a new user
 * @access Public
 */
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Username, email, and password are required.' });
  }

  try {
    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      const field = existingUsers[0].username === username ? 'username' : 'email';
      return res.status(409).json({ message: `User with this ${field} already exists.` });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert new user
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, password_hash]
    );

    // Generate JWT token for immediate login
    const userPayload = { id: result.insertId, username: username };
    const token = jwt.sign(userPayload, jwtSecret, { expiresIn: '1h' }); // Token expires in 1 hour

    res.status(201).json({
      message: 'User registered successfully',
      userId: result.insertId,
      token: token,
      user: userPayload
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

/**
 * @route POST /login
 * @desc Authenticate user and return JWT token
 * @access Public
 */
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    // Find user by username
    const [users] = await pool.execute(
      'SELECT id, username, password_hash FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const user = users[0];

    // Compare provided password with hashed password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Generate JWT token
    const userPayload = { id: user.id, username: user.username };
    const token = jwt.sign(userPayload, jwtSecret, { expiresIn: '1h' }); // Token expires in 1 hour

    res.status(200).json({
      message: 'Logged in successfully',
      token: token,
      user: userPayload
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

/**
 * @route GET /profile
 * @desc Get authenticated user's profile (example of a protected route)
 * @access Private (requires JWT)
 */
app.get('/profile', authenticateToken, async (req, res) => {
  // req.user contains the payload from the JWT (e.g., { id: 1, username: 'testuser' })
  try {
    const [users] = await pool.execute(
      // UPDATED: Removed 'profile_config' column as it no longer exists
      'SELECT id, username, email, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const userProfile = users[0];
    res.status(200).json({
      message: 'User profile retrieved successfully',
      user: {
        id: userProfile.id,
        username: userProfile.username,
        email: userProfile.email,
        createdAt: userProfile.created_at
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error fetching profile.' });
  }
});

/**
 * @route PUT /api/users/me/profile
 * @desc Update authenticated user's email (username update removed)
 * @access Private (requires JWT)
 */
app.put('/api/users/me/profile', authenticateToken, async (req, res) => {
  // Removed 'username' from destructuring, as it will no longer be updated here
  const { email } = req.body;
  const userId = req.user.id; // Get user ID from authenticated token

  if (!email) { // Only email is now expected for update
    return res.status(400).json({ message: 'Email is required for profile update.' });
  }

  try {
    let updateFields = [];
    let updateValues = [];


    // Check for existing email if it is being updated
    if (email) {
      const [existingEmails] = await pool.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );
      if (existingEmails.length > 0) {
        return res.status(409).json({ message: 'This email is already registered by another user.' });
      }
      updateFields.push('email = ?');
      updateValues.push(email);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields provided for update.' });
    }

    const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    updateValues.push(userId);

    await pool.execute(sql, updateValues);

    res.status(200).json({ message: 'User profile updated successfully.' });

  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Server error during profile update.' });
  }
});

// --- Notification Settings API Endpoints (Moved from notification-service) ---

/**
 * @route GET /api/users/me/notifications
 * @desc Get authenticated user's notification settings
 * @access Private (requires JWT)
 */
app.get('/api/users/me/notifications', authenticateToken, async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const [settingsRows] = await pool.execute( // Use pool.execute for consistency
            `SELECT is_email_notification_enabled, is_slack_notification_enabled,
                     slack_webhook_url, in_app_alerts_enabled, notification_time_offsets
             FROM users WHERE id = ?`,
            [req.user.id]
        );
        const settings = settingsRows[0];
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

/**
 * @route PUT /api/users/me/notifications
 * @desc Update authenticated user's notification settings
 * @access Private (requires JWT)
 */
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

        await pool.execute( // Use pool.execute for consistency
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


// Start the server
app.listen(port, () => {
  console.log(`User Service running on port ${port}`);
});
