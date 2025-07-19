-- Use the database specified in docker-compose.yml
--DROP databse if exists bill_tracker_db;
CREATE DATABASE IF NOT EXISTS bill_tracker_db;
USE bill_tracker_db;

-- Create the organizations table
CREATE TABLE organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL, -- Will link to users later, for now, can be a placeholder
    name VARCHAR(255) NOT NULL,
    account_number VARCHAR(255) NOT NULL,
    typical_due_day INT, -- Day of the month (1-31)
    website VARCHAR(255),
    contact_info VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY (user_id, account_number) -- Ensure unique account numbers per user
);

-- For development, you can insert some dummy data
INSERT INTO organizations (user_id, name, account_number, typical_due_day, website, contact_info) VALUES
(1, 'Dominion Energy', 'stuff1234567890', 20, 'https://dominionenergy.com', '1-800-POWER'),
(1, 'Fairfax Water', 'FVW987654', 15, 'https://fairfaxwater.org', '703-698-5800'),
(1, 'Verizon Fios', 'VZFIOS112233', 1, 'https://verizon.com/fios', '1-800-VERIZON');

-- Setup users
-- Create the users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    profile_config JSON, -- For future use, e.g., notification preferences
    is_email_notification_enabled BOOLEAN DEFAULT TRUE,
    is_slack_notification_enabled BOOLEAN DEFAULT FALSE,
    slack_webhook_url VARCHAR(255), -- NULLABLE, for user's specific Slack webhook
    in_app_alerts_enabled BOOLEAN DEFAULT TRUE,
    notification_time_offsets VARCHAR(255) DEFAULT '7,3,0', -- Stored as comma-separated string (e.g., "7,3,0")
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    -- notification columns
 );

-- Create the bills table for recurring bill information
CREATE TABLE bills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL, -- Links to the users table
    organization_id INT NOT NULL, -- Links to the organizations table
    bill_name VARCHAR(255) NOT NULL, -- e.g., "Electricity Bill", "Internet Bill"
    due_day INT, -- Typical day of the month bill is due (1-31)
    typical_amount DECIMAL(10, 2), -- Typical amount due, if known
    frequency VARCHAR(50) DEFAULT 'monthly', -- e.g., 'monthly', 'quarterly', 'annually'
    is_active BOOLEAN DEFAULT TRUE, -- Is this recurring bill still active?
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE KEY (user_id, organization_id, bill_name) -- Ensure unique bill name per organization per user
);

-- Create a table to track notifications sent to users
-- This table will log notifications sent to users for their bills
-- It will include the type of notification (email, Slack, in-app), the user,
-- the bill, and the timestamp of when the notification was sent.
-- This will help prevent duplicate notifications for the same user, bill, and type on the same day.
-- It will also allow us to track the content of the notification message.
-- This is useful for debugging and auditing purposes.
CREATE TABLE notification_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    bill_id INT NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- 'email', 'slack', 'in-app'
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- MySQL uses DATETIME or TIMESTAMP
    sent_date DATE AS (DATE(sent_at)) STORED, -- tells MySQL that the value for sent_date should be automatically computed by applying the DATE() function to the sent_at column. STORED keyword means that the value of sent_date will be physically stored on disk. This is important because UNIQUE KEY constraints (and other indexes) require stored columns. (Alternatively, VIRTUAL would mean it's computed on the fly, which usually isn't suitable for unique constraints that need to be enforced efficiently).
    message_content TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
    -- Unique constraint to prevent duplicate notifications for the same user, bill, type, and day
    UNIQUE KEY unique_notification_per_day (user_id, bill_id, notification_type, sent_date)
);

-- Create the payments table for individual payment records
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL, -- Links to the users table
    bill_id INT NULL, -- Links to the bills table (optional, can be NULL if standalone payment)
    organization_id INT NOT NULL, -- Links to the organizations table
    due_date DATE NOT NULL,
    amount_due DECIMAL(10, 2) NOT NULL,
    payment_status ENUM('pending', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
    date_paid DATE,
    amount_paid DECIMAL(10, 2),
    confirmation_code VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE SET NULL, -- If bill entry is deleted, payment record can remain
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);