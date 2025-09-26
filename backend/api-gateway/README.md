# API Gateway Service 🌉

This service acts as the single, unified entry point for all backend services in the Bill Tracker application. It is a reverse proxy that receives all incoming HTTP requests from the frontend and routes them to the appropriate microservice (user-service, organization-service, etc.).

## Purpose

The primary purpose of the API Gateway is to simplify the overall application architecture and enhance security. It centralizes cross-cutting concerns, meaning individual backend services can focus solely on their business logic.

Key Features:

- Centralized Routing: Provides a single, stable URL for the frontend to communicate with. The gateway is responsible for knowing the internal addresses of all other microservices.
- CORS Management: Handles all Cross-Origin Resource Sharing (CORS) logic for the entire application. This is the only place CORS needs to be configured.
- Request Logging: Uses morgan to provide real-time logging of all incoming traffic in the console, which is invaluable for debugging.
- Decoupling: Decouples the frontend client from the backend's internal microservice architecture. The frontend doesn't need to know how many backend services exist or what their individual addresses are.
- SSL

## Prerequisites

- Node.js & npm: Required for running the service standalone.
- Docker & Docker Compose: Required for running the service as part of the integrated application.

## Configuration

The gateway is configured using environment variables, which should be set in the root `docker-compose.yaml` file.

| Variable | Description | Default (if not set) | Example Value |
| -------- | ----------- | -------------------- | ---- |
| `CORS_ALLOWED_ORIGINS` | A comma-separated list of URLs that are allowed to make requests to the API. This should be the address where your frontend is hosted. | `http://localhost:8080,http://localhost:5173` | `https://your-domain.com` |

## Running the Service
### With Docker Compose (Recommended)

This is the standard method for running the entire application. The gateway will be started automatically as part of the stack.

1. Navigate to the project's root directory (`my-bill-tracker`).
2. Run the command:
   ```
   docker-compose up --build
   ```

### Standalone (for Development/Testing)

You can run the gateway by itself, but it will only function correctly if the other backend services are also running and accessible on their respective `localhost` ports.

1. Navigate to this directory: `backend/api-gateway`.
2. (OPT) Create SSL certificates (change `localhost` to your ip or hostname)
   ```
   $ openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -sha256 -days 365 -nodes -subj "/CN=localhost"
   sudo chown 1000:1000 key.pem cert.pem
   ```
3. Install dependencies:
   ```
    npm install
   ```
4. Start the server:
   ```
    npm start
   ```

## Routing Logic Explained

The gateway uses a set of rules to forward requests. The order of these rules is important, as more specific rules must come before more general ones.

| Incoming Path Prefix | Target Service | Path Rewritten? | Notes |
| -------------------  | -------------- | --------------- | ----- |
| `/api/users/me` | `user-service` | No | Specific Rule: Handles requests like` /api/users/me/notifications`. The full path is passed through. |
| `/api/users` | `user-service` | Yes | General Rule: Handles `/login`, `/register`. Rewrites `/api/users/login` to `/login`. |
| `/api/organizations` | `organization-service` | Yes | Rewrites /api/organizations to /organizations. |
| `/api/payments`, `/api/bills` | `bill-payment-service` | Yes | Rewrites `/api/payments/*` to `/payments/*` and `/api/bills/*` to `/bills/*`. |
| `/api/notifications` | `notification-service` | No | The full path is passed through. Includes special headers to support Server-Sent Events (SSE) streaming.

## Core Dependencies

- Express: The web server framework.
- http-proxy-middleware: The core library that enables the reverse proxy functionality.
- cors: Manages the CORS pre-flight requests and headers.
- morgan: Provides development-friendly request logging to the console.

To setup the next most relevant service, follow the [db README.md](../db/README.md).
