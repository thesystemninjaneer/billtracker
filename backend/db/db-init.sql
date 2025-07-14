-- Use the database specified in docker-compose.yml
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
(1, 'Dominion Energy', '1234567890', 20, 'https://dominionenergy.com', '1-800-POWER'),
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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