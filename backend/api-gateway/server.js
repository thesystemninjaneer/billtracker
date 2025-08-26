// backend/api-gateway/server.js
require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const morgan = require('morgan');
const cors = require('cors');

const app = express();

// --- CORS Configuration ---
const allowedOrigins = [process.env.FRONTEND_URL, process.env.ALLOWED_ORIGIN].filter(Boolean); // Filter out undefined values

const corsOptions = {
    origin: function (origin, callback) {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
//    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allow these HTTP methods
    credentials: true, // Allow cookies to be sent
//    optionsSuccessStatus: 204,
//    allowedHeaders: ['Content-Type', 'Authorization'] // Explicitly allow Authorization header
};
app.use(cors(corsOptions));
app.use(morgan('dev'));

// --- Service Targets (from docker-compose) ---
const USER_SERVICE_URL = 'http://user-service:3000';
const ORGANIZATION_SERVICE_URL = 'http://organization-service:3001';
const BILL_PAYMENT_SERVICE_URL = 'http://bill-payment-service:3002';
const NOTIFICATION_SERVICE_URL = 'http://notification-service:3003';

// --- PROXY ROUTING RULES (Specific to General) ---

// 1. User Service (Specific Routes for /me/*)
app.use('/api/users/me', createProxyMiddleware({
    target: USER_SERVICE_URL,
    changeOrigin: true,
}));

// 2. User Service (General Routes)
app.use('/api/users', createProxyMiddleware({
    target: USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/users': '' },
}));

// 3. Organization Service
app.use('/api/organizations', createProxyMiddleware({
    target: ORGANIZATION_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api': '' },
}));

// 4. Bill Payment Service
app.use(['/api/payments', '/api/bills'], createProxyMiddleware({
    target: BILL_PAYMENT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api': '' },
}));

app.use(['/api/notifications/test-slack'], createProxyMiddleware({
    target: BILL_PAYMENT_SERVICE_URL,
    changeOrigin: true,
}));

// 5. Notification Service
app.use('/api/notifications', createProxyMiddleware({
    target: NOTIFICATION_SERVICE_URL,
    changeOrigin: true,
    onProxyRes: (proxyRes, req, res) => {
        // FIX: Use the correct response object 'res' to set headers for the client.
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
    },
}));

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`API Gateway running on internal port ${PORT}`);
});
