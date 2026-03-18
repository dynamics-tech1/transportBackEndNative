-- Migration to enforce mandatory Phone and Email for all users
-- This prevents duplicate accounts by ensuring every user record has both unique identities.

-- 1. Data Cleanup: Assign placeholder emails to 4 users missing them
UPDATE Users 
SET email = CONCAT('user_', userId, '@placeholder.com') 
WHERE email IS NULL OR email = '';

-- 2. Modify columns to NOT NULL and add Verification flags
ALTER TABLE Users 
    MODIFY phoneNumber VARCHAR(20) NOT NULL,
    MODIFY email VARCHAR(255) NOT NULL,
    ADD COLUMN isPhoneVerified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN isEmailVerified BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Add UNIQUE constraints
-- We'll use UNIQUE INDEX for safety and clarity
ALTER TABLE Users ADD UNIQUE INDEX idx_users_phone_unique (phoneNumber);
ALTER TABLE Users ADD UNIQUE INDEX idx_users_email_unique (email);

-- 4. Separate Identity Verification (OTP & Link)
-- Add columns to store separate OTPs for Phone and Email, and a Token for Link verification
ALTER TABLE usersCredential 
    ADD COLUMN phoneOTP VARCHAR(255) NULL,
    ADD COLUMN emailOTP VARCHAR(255) NULL,
    ADD COLUMN emailVerificationToken VARCHAR(255) NULL,
    ADD COLUMN emailVerificationExpiresAt DATETIME NULL;
