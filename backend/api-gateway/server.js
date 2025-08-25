const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const morgan = require('morgan');
const cors = require('cors');

const app = express();

// --- CORS Configuration ---
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:5173'
];
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
