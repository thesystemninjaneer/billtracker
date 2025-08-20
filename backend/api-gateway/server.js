// backend/api-gateway/server.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const morgan = require('morgan');
const cors = require('cors');

const app = express();

// --- Specific CORS Configuration ---
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

// --- Proxy Targets ---
const USER_SERVICE_URL = 'http://user-service:3000';
const ORGANIZATION_SERVICE_URL = 'http://organization-service:3001';
const BILL_PAYMENT_SERVICE_URL = 'http://bill-payment-service:3002';
const NOTIFICATION_SERVICE_URL = 'http://notification-service:3003';

// --- Proxy Routes ---

// The user service has its own routes like /login, /register
app.use('/api/users', createProxyMiddleware({
    target: USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/users': '' },
}));

// The org service expects /organizations, so we strip the /api part only
app.use('/api/organizations', createProxyMiddleware({
    target: ORGANIZATION_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api': '' }, // FIX: Rewrites /api/organizations to /organizations
}));

// The bill service expects /payments/* or /bills/*
app.use(['/api/payments', '/api/bills'], createProxyMiddleware({
    target: BILL_PAYMENT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api': '' }, // FIX: Rewrites /api/payments to /payments
}));

// The notification service expects /notifications/*
app.use('/api/notifications', createProxyMiddleware({
    target: NOTIFICATION_SERVICE_URL,
    changeOrigin: true,
    // FIX: REMOVE the pathRewrite line for this route.
    onProxyRes: (proxyRes, req, res) => {
        proxyRes.setHeader('Content-Type', 'text/event-stream');
        proxyRes.setHeader('Cache-Control', 'no-cache');
        proxyRes.setHeader('Connection', 'keep-alive');
    },
}));


const PORT = 5000;
app.listen(PORT, () => {
  console.log(`API Gateway running on internal port ${PORT}`);
});