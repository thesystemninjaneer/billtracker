# Stage 1: Build the React Vite application
FROM node:22-alpine as builder

# Install Git so we can get version info
RUN apk add --no-cache git

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the source code
COPY . .

# --- Inject version from Git tag or commit ---
# Try to get latest tag, fallback to commit hash
RUN echo "export const APP_VERSION = '$(git describe --tags --always)';" > src/version.js

# Build the Vite app
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM docker.io/library/nginx:1.25-alpine

# Copy built app from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy the Nginx config and entrypoint script
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
