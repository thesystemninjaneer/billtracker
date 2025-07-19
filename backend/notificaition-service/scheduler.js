const cron = require('node-cron');
const db = require('db'); // Your MySQL database connection
const { sendEmailNotification, sendSlackMessage, sendInAppAlert, logNotification, hasNotificationBeenSent } = require('./services/notificationService');

exports.startNotificationScheduler = () => {
    // Schedule to run every day at 9:00 AM (adjust as needed)
    cron.schedule('0 9 * * *', async () => {
        console.log('Running daily bill notification check...');

        try {
            // Fetch all users with any notification type enabled
            const usersResult = await db.query(
                `SELECT id, email, is_email_notification_enabled, is_slack_notification_enabled,
                        slack_webhook_url, in_app_alerts_enabled, notification_time_offsets
                 FROM users
                 WHERE is_email_notification_enabled = TRUE
                    OR is_slack_notification_enabled = TRUE
                    OR in_app_alerts_enabled = TRUE`
            );
            const users = usersResult.rows;

            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalize to start of day

            for (const user of users) {
                // Parse comma-separated string from DB into an array of numbers
                const reminderOffsets = user.notification_time_offsets
                    ? user.notification_time_offsets.split(',').map(Number)
                    : [7, 3, 0]; // Default if not set or empty

                for (const offset of reminderOffsets) {
                    const targetDueDate = new Date(today);
                    targetDueDate.setDate(today.getDate() + offset);

                    // Fetch unpaid bills for this user due on the target date
                    const billsResult = await db.query(
                        `SELECT id, name, amount, due_date, is_paid, user_id
                         FROM bills
                         WHERE user_id = ? AND is_paid = FALSE
                           AND due_date >= ? AND due_date < ?`,
                        [user.id, targetDueDate, new Date(targetDueDate.getTime() + 24 * 60 * 60 * 1000)]
                    );
                    const bills = billsResult.rows;

                    for (const bill of bills) {
                        const daysRemaining = Math.ceil((bill.due_date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        let message = '';

                        if (daysRemaining === 0) {
                            message = `It's due today!`;
                        } else if (daysRemaining > 0) {
                            message = `It's due in ${daysRemaining} day(s).`;
                        } else {
                            message = `It was due ${Math.abs(daysRemaining)} day(s) ago.`;
                        }

                        // Check if notification has already been sent for this specific day/offset
                        if (user.is_email_notification_enabled && !(await hasNotificationBeenSent(user.id, bill.id, 'email', targetDueDate))) {
                            await sendEmailNotification(user, bill, message);
                        }
                        if (user.is_slack_notification_enabled && !(await hasNotificationBeenSent(user.id, bill.id, 'slack', targetDueDate))) {
                            await sendSlackMessage(user, bill, message);
                        }
                        // For in-app alerts, we send to active connections and log once per day
                        if (user.in_app_alerts_enabled && !(await hasNotificationBeenSent(user.id, bill.id, 'in-app', targetDueDate))) {
                            sendInAppAlert(user.id, {
                                message: message,
                                bill_id: bill.id,
                                in_app_alerts_enabled: user.in_app_alerts_enabled
                            });
                            // Log after attempting to send to ensure it's recorded
                            await logNotification(user.id, bill.id, 'in-app', message);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error in notification scheduler:', error);
        }
    });
};