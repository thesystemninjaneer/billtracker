# my-bill-tracker/cypress/Dockerfile
# Cypress End to End Test

# Use an official Node.js runtime as a parent image
FROM  cypress/included:13.0.0
# Set the working directory in the container
WORKDIR e2e
ENV CYPRESS_BASE_URL=http://bill-tracker-frontend:8080
ENV CYPRESS_API_URL=http://api-gateway:5000
# Copy package.json and package-lock.json to the working directory
COPY package*.json ./
# Install dependencies
RUN npm install
# Copy the rest of the application code
COPY . .
# Expose the port the app runs on
#EXPOSE 3001
# Define the command to run the app
CMD  [ "cypress", "run" ]
