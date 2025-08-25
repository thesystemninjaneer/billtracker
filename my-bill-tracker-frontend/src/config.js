// my-bill-tracker-frontend/src/config.js

// The single entry point for all backend services is now the API Gateway.
const API_GATEWAY_BASE_URL = 'http://localhost:5000/api';

const config = {
  // All API endpoints are now relative to the gateway's URL.
  USER_API_BASE_URL: `${API_GATEWAY_BASE_URL}/users`,
  ORGANIZATION_API_BASE_URL: `${API_GATEWAY_BASE_URL}/organizations`,
  BILL_PAYMENT_API_BASE_URL: API_GATEWAY_BASE_URL,
  // FIX: Make this the base gateway URL. The specific path will be added in the component.
  NOTIFICATION_SSE_BASE_URL: API_GATEWAY_BASE_URL, 
};

export default config;