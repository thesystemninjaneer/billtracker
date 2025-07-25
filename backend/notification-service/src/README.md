# Notification Service

## Build

```sh
cd ./billtracker/backend/notification-service
npm install express mysql2 nodemailer node-cron dotenv ejs
```

## Architecture

This directory includes the follwing vanilla javascript backend code for the Apps Node.js/Express/MySQL components. 

- Use mysql2 for database interactions.
- Implement a cron job (node-cron) for scheduled checks.
- Use nodemailer for email.
- Use fetch for Slack webhooks.
- Implement Server-Sent Events (SSE) for real-time in-app alerts (a native browser API, simpler than WebSockets for one-way communication).
- Create Express API endpoints for managing user notification settings.

### db.js

Used by the other javascript files in this directory to connect to the app's backend mysql database to query the content from `notification_logs` tables as defined in the ../db/db0init.sql schema.

### notificationService.js

This module will handle sending different types of notifications. SQL queries are updated to use ? placeholders, and notification_time_offsets handling is adjusted for string conversion.

### scheduler.js

Uses MySQL queries to parse notification_time_offsets from a comma-separated string.

### settings.ejs

 Replace 'YOUR_AUTH_TOKEN_HERE' with actual token retrieval logic This token must be sent with every authenticated API request. Example: from a cookie, localStorage, or a global variable set by your server.

### server.js

- GET /dashboard
- GET /settings/notifications
- GET /api/users/me/notifications
- PUT /api/users/me/notifications
- GET /api/notifications/stream
  - This is the endpoint frontend will connect to for real-time updates