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