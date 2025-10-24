// backend/api-gateway/server.js
require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const morgan = require('morgan');
const cors = require('cors');
const https = require('https'); // 1. Import the HTTPS module
const fs = require('fs');       // 2. Import the File System module
const fetch = require('node-fetch'); // ✅ Add this import

const app = express();

// --- CORS Configuration ---
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'https://localhost:8443').split(',');
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
};
app.use(cors(corsOptions));
app.use(morgan('dev'));

// ✅ --- VERSION ENDPOINT ---
// This route fetches the latest GitHub release tag (e.g. "v1.1.0")
let cachedVersion = null;
let lastFetched = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

app.get('/api/version', async (req, res) => {
    try {
        const now = Date.now();

        // ✅ Return cached version if still valid
        if (cachedVersion && now - lastFetched < CACHE_DURATION) {
            return res.json({ version: cachedVersion, cached: true });
        }

        const owner = process.env.GITHUB_OWNER || 'your-github-username';
        const repo = process.env.GITHUB_REPO || 'billtracker';

        // ✅ Built-in fetch (Node 18+)
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/tags`);
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const tags = await response.json();
        const version = tags.length > 0 ? tags[0].name : 'Unknown';

        // ✅ Cache it
        cachedVersion = version;
        lastFetched = now;

        res.json({ version, cached: false });
    } catch (error) {
        console.error('Error fetching GitHub version:', error.message);
        res.status(500).json({ version: 'Unavailable' });
    }
});

// --- Service Targets ---
const USER_SERVICE_URL = 'http://user-service:3000';
const ORGANIZATION_SERVICE_URL = 'http://organization-service:3001';
const BILL_PAYMENT_SERVICE_URL = 'http://bill-payment-service:3002';
const NOTIFICATION_SERVICE_URL = 'http://notification-service:3003';
const FRONTEND_URL = 'http://bill-tracker-frontend:80'; // 3. Define the frontend service URL

// --- API Proxy Routing Rules ---
// 1. User Service (Specific Routes for /me/*)
app.use('/api/users/me', createProxyMiddleware({ target: USER_SERVICE_URL, changeOrigin: true }));
// 2. User Service (General Routes)
app.use('/api/users', createProxyMiddleware({ target: USER_SERVICE_URL, changeOrigin: true, pathRewrite: { '^/api/users': '' } }));
// 3. Organization Service
app.use('/api/organizations', createProxyMiddleware({ target: ORGANIZATION_SERVICE_URL, changeOrigin: true, pathRewrite: { '^/api': '' } }));
// 4. Bill Payment Service
app.use(['/api/payments', '/api/bills'], createProxyMiddleware({ target: BILL_PAYMENT_SERVICE_URL, changeOrigin: true, pathRewrite: { '^/api': '' } }));
// 5. Notification Service
app.use(['/api/notifications/test-slack'], createProxyMiddleware({
    target: BILL_PAYMENT_SERVICE_URL,
    changeOrigin: true,
}));
app.use('/api/notifications', createProxyMiddleware({
    target: NOTIFICATION_SERVICE_URL,
    changeOrigin: true,
    ws: true, // Enable WebSocket support for SSE
    onProxyRes: (proxyRes, req, res) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
    },
}));

// --- Frontend Proxy Rule ---
// 4. This rule must be LAST. It catches all other requests and forwards them to the frontend.
app.use('/', createProxyMiddleware({
    target: FRONTEND_URL,
    changeOrigin: true,
}));


// --- Server Initialization ---
const PORT = 8443; // 5. The standard port for local HTTPS development

// 6. Read the SSL certificate files
const options = {
    key: fs.readFileSync('./certs/key.pem'),
    cert: fs.readFileSync('./certs/cert.pem'),
};

// 7. Create and start the HTTPS server
https.createServer(options, app).listen(PORT, () => {
    console.log(`API Gateway is running in HTTPS mode on port ${PORT}`);
});
