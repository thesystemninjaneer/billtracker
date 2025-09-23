const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    // Defines the base URL for your application
    // This is the address of your frontend service within the Docker network
    baseUrl: 'http://my-bill-tracker-frontend:80',
    
    // Specifies the folder containing your E2E test files
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',

    // Setup Node events for tasks like database access
    setupNodeEvents(on, config) {
      // You can add Node.js event listeners here.
      // This is where you would define tasks for database queries
      on('task', {
        dbQuery(query) {
          const mysql = require('mysql2');
          const connection = mysql.createConnection({
            host: 'database', // The service name of your database container
            user: 'testuser',
            password: 'testpassword',
            database: 'testdb'
          });
          return new Promise((resolve, reject) => {
            connection.query(query, (error, results) => {
              connection.end();
              if (error) {
                return reject(error);
              }
              resolve(results);
            });
          });
        },
        // A task to clear the database after each test run
        clearDb() {
          const mysql = require('mysql2');
          const connection = mysql.createConnection({
            host: 'db',
            user: 'bill_user',
            password: 'your_db_password',
            database: 'bill_tracker_db
          });
          return new Promise((resolve, reject) => {
            const queries = [
              'DELETE FROM payments;',
              'DELETE FROM bills;',
              'DELETE FROM organizations;'
            ];
            connection.query(queries.join(''), (error, results) => {
              connection.end();
              if (error) {
                return reject(error);
              }
              resolve(true);
            });
          });
        }
      });
    },

    // Global test timeout in milliseconds
    defaultCommandTimeout: 10000,
    
    // How long to wait for a URL to load or a page to refresh
    pageLoadTimeout: 60000,

    // How many times to retry a failed test (in headless mode)
    retries: {
      runMode: 1,
      openMode: 0,
    },
  },
});
