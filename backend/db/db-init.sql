-- Use the database specified in docker-compose.yml
-- CREATE DATABASE IF NOT EXISTS bill_tracker_db;
USE bill_tracker_db;

-- -----------------------------------------------------
-- Table `users`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(255) NOT NULL UNIQUE,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `is_email_notification_enabled` TINYINT(1) NOT NULL DEFAULT 0,
    `is_slack_notification_enabled` TINYINT(1) NOT NULL DEFAULT 0,
    `slack_webhook_url` VARCHAR(255) NULL,
    `in_app_alerts_enabled` TINYINT(1) NOT NULL DEFAULT 1,
    `notification_time_offsets` VARCHAR(255) NOT NULL DEFAULT '7,3,1', -- Days before bill is due
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`));

-- For development, insert a dummy user
-- The password hash is for 'password123'
INSERT INTO users (id, username, email, password_hash) VALUES
(1, 'testuser', 'testuser@example.com', '$2b$10$9zFZ1321nRDxm6ARwL88qOYYI9Yoz6YDEQ8OXyJU6/9TyVd0YCuwS');

-- -----------------------------------------------------
-- Table `organizations`
-- -----------------------------------------------------
CREATE TABLE organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_number VARCHAR(255) NOT NULL,
    typical_due_day INT,
    website VARCHAR(255),
    contact_info VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY (user_id, account_number), -- Ensure unique account numbers per user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- For development, insert some dummy data
INSERT INTO organizations (user_id, name, account_number, typical_due_day, website, contact_info) VALUES
(1, 'Dominion Energy', 'stuff1234567890', 20, 'https://dominionenergy.com', '1-800-POWER'),
(1, 'Fairfax Water', 'FVW987654', 15, 'https://fairfaxwater.org', '703-698-5800'),
(1, 'Verizon Fios', 'VZFIOS112233', 1, 'https://verizon.com/fios', '1-800-VERIZON');


-- -----------------------------------------------------
-- Table `bills`
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- Table `payments`
-- -----------------------------------------------------
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


-- -----------------------------------------------------
-- Table `notifications_sent`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications_sent` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `user_id` INT NOT NULL,
    `payment_id` INT NOT NULL,
    `sent_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `notification_type` ENUM('in_app', 'email', 'slack') NOT NULL,
    `time_offset` INT NOT NULL, -- Days before due date the notification was sent
    PRIMARY KEY (`id`),
    INDEX `fk_notifications_sent_users_idx` (`user_id` ASC) VISIBLE,
    INDEX `fk_notifications_sent_payments_idx` (`payment_id` ASC) VISIBLE,
    CONSTRAINT `fk_notifications_sent_users`
        FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT `fk_notifications_sent_payments`
        FOREIGN KEY (`payment_id`)
        REFERENCES `payments` (`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE);
