#!/bin/sh

# Set a default value for the API URL if it's not provided
export API_GATEWAY_URL=${API_GATEWAY_URL:-http://localhost:5000}

# Create the content for the script tag
# This creates a JavaScript snippet like: window.runtimeConfig = { API_GATEWAY_URL: "http://192.168.1.100:5000" };
CONFIG_JS="window.runtimeConfig = { API_GATEWAY_URL: \"${API_GATEWAY_URL}\" };"

# Find the placeholder script tag in index.html and replace its content
# The '#' character in the sed command is used as a delimiter to avoid conflict with URL slashes
sed -i "s#<script id=\"runtime-config\"></script>#<script id=\"runtime-config\">${CONFIG_JS}</script>#" /usr/share/nginx/html/index.html

# Start Nginx in the foreground
exec nginx -g 'daemon off;'