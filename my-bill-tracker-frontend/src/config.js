// my-bill-tracker-frontend/src/config.js

// Read the API URL from the global runtime configuration injected by Docker,
// but fall back to localhost for local development outside of Docker.
const gatewayUrl = (window.runtimeConfig && window.runtimeConfig.API_GATEWAY_URL)

// The single entry point for all backend services is now the API Gateway.
const API_GATEWAY_BASE_URL = `${gatewayUrl}/api`;

const config = {
  // All API endpoints are now relative to the gateway's URL.
  USER_API_BASE_URL: `${API_GATEWAY_BASE_URL}/users`,
  ORGANIZATION_API_BASE_URL: `${API_GATEWAY_BASE_URL}/organizations`,
  BILL_PAYMENT_API_BASE_URL: API_GATEWAY_BASE_URL,
  NOTIFICATION_SSE_BASE_URL: API_GATEWAY_BASE_URL, 
};

export default config;