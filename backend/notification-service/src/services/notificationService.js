// backend/notification-service/src/services/notificationService.js
const nodemailer = require('nodemailer');
const db = require('../db'); // Your MySQL database connection
// Use a Map to store connected SSE clients for direct targeting by userId
const connectedClients = new Map(); // Map to store { userId: ResponseObject }

// --- Email Transporter (Configure with your SMTP details) ---
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVICE_HOST,
    port: parseInt(process.env.EMAIL_SERVICE_PORT || '587'),
    secure: process.env.EMAIL_SERVICE_SECURE === 'true', // Use 'true' for port 465 (SSL), 'false' for 587 (TLS)
    auth: {
        user: process.env.EMAIL_SERVICE_USER,
        pass: process.env.EMAIL_SERVICE_PASS,
    },
});

/**
 * Sends an email notification to a user about an upcoming bill.
 * @param {Object} user - The user object from the database (snake_case column names).
 * @param {Object} bill - The bill object from the database (snake_case column names).
 * @param {string} message - The custom message for the notification.
 */
async function sendEmailNotification(user, bill, message) {
    if (!user.is_email_notification_enabled || !user.email) {
        console.log(`Email notifications disabled or no email for user ${user.id}`);
        return;
    }
    try {
        await transporter.sendMail({
            from: `"Bill Tracker" <${process.env.EMAIL_FROM_ADDRESS}>`, // Your 'from' address
            to: user.email,
            subject: `Bill Reminder: ${bill.name} Due Soon!`,
            html: `<p>${message}</p><p>Your bill "${bill.name}" for $${bill.amount.toFixed(2)} is due on ${bill.due_date.toDateString()}.</p><p>Manage your bills: ${process.env.FRONTEND_URL}/dashboard</p>`,
        });
        console.log(`Email sent to ${user.email} for bill ${bill.name}`);
        await logNotification(user.id, bill.id, 'email', message);
    } catch (error) {
        console.error(`Failed to send email to ${user.email}:`, error);
    }
}

/**
 * Sends a Slack message via webhook.
 * @param {Object} user - The user object from the database (snake_case column names).
 * @param {Object} bill - The bill object from the database (snake_case column names).
 * @param {string} message - The custom message for the notification.
 */
async function sendSlackMessage(user, bill, message) {
    if (!user.is_slack_notification_enabled || !user.slack_webhook_url) {
        console.log(`Slack notifications disabled or no webhook for user ${user.id}`);
        return;
    }
    try {
        await fetch(user.slack_webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: `*Bill Reminder for ${user.email}:* Your bill "${bill.name}" for *$${bill.amount.toFixed(2)}* is due on *${bill.due_date.toDateString()}*. ${message}`,
                blocks: [ // More structured message with Block Kit
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `Hey! Just a friendly reminder:`, // You might personalize this if you have user's Slack ID
                        }
                    },
                    {
                        type: "section",
                        fields: [
                            { type: "mrkdwn", text: `*Bill Name:*\n${bill.name}` },
                            { type: "mrkdwn", text: `*Amount:*\n$${bill.amount.toFixed(2)}` },
                            { type: "mrkdwn", text: `*Due Date:*\n${bill.due_date.toDateString()}` },
                            { type: "mrkdwn", text: `*Status:*\n${message}` }
                        ]
                    },
                    {
                        type: "actions",
                        elements: [
                            {
                                type: "button",
                                text: { type: "plain_text", text: "View Bill" },
                                style: "primary",
                                url: `${process.env.FRONTEND_URL}/bills/${bill.id}` // Link to your bill detail page
                            }
                        ]
                    }
                ]
            }),
        });
        console.log(`Slack message sent to user ${user.id} for bill ${bill.name}`);
        await logNotification(user.id, bill.id, 'slack', message);
    } catch (error) {
        console.error(`Failed to send Slack message to user ${user.id}:`, error);
    }
}

// --- In-App Alerts via Server-Sent Events (SSE) ---
/**
 * Sends an in-app alert via SSE to a specific user's connected clients.
 * RENAMED from sendInAppAlert to sendSSE for clarity.
 * @param {number} userId - The ID of the user to send the alert to.
 * @param {Object} notificationData - Data for the notification (message, bill_id, in_app_alerts_enabled, type).
 */
function sendSSE(userId, notificationData) {
    // Check user's preference before sending, if it's a regular notification (not a test)
    // For test messages, we send regardless of user setting, as the test is to validate the connection.
    if (notificationData.type !== 'in-app-test' && !notificationData.in_app_alerts_enabled) {
        console.log(`In-app alerts disabled for user ${userId}`);
        return;
    }

    const clientRes = connectedClients.get(userId); // Get the specific client's response object
    if (clientRes) {
        try {
            const payload = JSON.stringify(notificationData); // Send the data as-is
            clientRes.write(`data: ${payload}\n\n`); // SSE format
            console.log(`In-app alert sent to user ${userId}: ${notificationData.message || notificationData.text}`);
        } catch (error) {
            console.error(`Failed to send SSE to user ${userId}:`, error);
            // Handle broken pipe or client disconnect: remove from map
            connectedClients.delete(userId);
        }
    } else {
        console.warn(`Attempted to send SSE to disconnected client: ${userId}`);
    }
}

// --- SSE Client Management (called from your main app.js/index.js) ---
/**
 * Sets up an SSE connection for a client.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
function setupSSE(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Important for Nginx/Apache to not buffer events
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080'); // Explicit CORS for SSE

    // Assume req.user is populated by your authentication middleware
    const userId = req.user ? req.user.id : null;

    if (!userId) {
        res.status(401).end('Unauthorized');
        return;
    }

    // Store the response object directly mapped to the userId
    connectedClients.set(userId, res);
    console.log(`SSE client connected for user ${userId}. Total clients: ${connectedClients.size}`);

    // Remove client from map when connection closes
    req.on('close', () => {
        console.log(`SSE client disconnected for user ${userId}.`);
        connectedClients.delete(userId);
    });

    // Send a welcome message (optional)
    sendSSE(userId, { type: 'connection_established', message: 'Connected to BillTracker notifications.' });
}

// --- Notification Logging (Optional but Recommended) ---
/**
 * Logs a sent notification to the database.
 * @param {number} userId - The ID of the user.
 * @param {number} billId - The ID of the bill.
 * @param {string} type - The type of notification ('email', 'slack', 'in-app').
 * @param {string} messageContent - The content of the message sent.
 */
async function logNotification(userId, billId, type, messageContent) {
    try {
        await db.query(
            `INSERT INTO notification_logs (user_id, bill_id, notification_type, message_content, sent_at)
             VALUES (?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE id = id`,
            [userId, billId, type, messageContent]
        );
    } catch (error) {
        console.error('Error logging notification:', error);
    }
}

/**
 * Checks if a specific notification for a user, bill, and type has already been sent on a given day.
 * @param {number} userId - The ID of the user.
 * @param {number} billId - The ID of the bill.
 * @param {string} notificationType - The type of notification ('email', 'slack', 'in-app').
 * @param {Date} dueDate - The due date of the bill (used to determine the day of notification).
 * @returns {Promise<boolean>} - True if a notification has been sent, false otherwise.
 */
async function hasNotificationBeenSent(userId, billId, notificationType, dueDate) {
    const result = await db.query(
        `SELECT COUNT(*) FROM notification_logs
         WHERE user_id = ? AND bill_id = ? AND notification_type = ? AND DATE(sent_at) = DATE(?)`,
        [userId, billId, notificationType, dueDate]
    );
    return parseInt(result.rows[0]['COUNT(*)']) > 0;
}

// --- Scheduler (placeholder - your actual scheduler logic would be here) ---
// This function would typically query for upcoming bills and call sendEmailNotification, sendSlackMessage, sendSSE
function startNotificationScheduler() {
    console.log("Notification scheduler started. (Actual scheduling logic not fully implemented here)");
    // Example: Periodically check for bills due soon and send notifications
    // setInterval(async () => {
    //     const [users] = await db.query('SELECT id, email, slack_webhook_url, is_email_notification_enabled, is_slack_notification_enabled, notification_time_offsets FROM users');
    //     for (const user of users) {
    //         const [bills] = await db.query('SELECT id, name, amount, due_date FROM bills WHERE user_id = ? AND due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)', [user.id, user.notification_time_offsets]);
    //         for (const bill of bills) {
    //             // Determine if notification should be sent based on offsets and if already sent
    //             // sendEmailNotification(user, bill, "Your bill is due soon!");
    //             // sendSlackMessage(user, bill, "Your bill is due soon!");
    //             // sendSSE(user.id, { type: 'bill_due', message: `Your bill ${bill.name} is due soon!`, billId: bill.id });
    //         }
    //     }
    // }, 24 * 60 * 60 * 1000); // Run once every 24 hours
}


module.exports = {
    sendEmailNotification,
    sendSlackMessage,
    sendSSE, // Export the renamed function
    setupSSE,
    logNotification,
    hasNotificationBeenSent,
    connectedClients, // Export the connectedClients Map
    startNotificationScheduler
};
