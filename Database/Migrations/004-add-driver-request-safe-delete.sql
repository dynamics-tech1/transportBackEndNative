-- Migration: 004-add-driver-request-safe-delete
-- Description: Add deletedAt and deletedBy columns to DriverRequest table for safe delete (soft delete) functionality
-- Created: 2025-01-XX
-- Note: This enables safe delete instead of hard delete, preserving data integrity and audit trails

-- Add deletedAt column to DriverRequest table
-- NULL = not deleted, DATETIME = deletion timestamp
ALTER TABLE DriverRequest
ADD COLUMN deletedAt DATETIME NULL DEFAULT NULL COMMENT 'Timestamp when driver request was deleted (NULL = not deleted)';

-- Add deletedBy column to DriverRequest table
-- Stores the userUniqueId of the user who deleted the request for audit purposes
ALTER TABLE DriverRequest
ADD COLUMN deletedBy VARCHAR(36) NULL DEFAULT NULL COMMENT 'User unique ID who deleted the driver request';

-- Add index on deletedAt for efficient filtering of deleted records
-- This improves query performance when filtering: WHERE deletedAt IS NULL
CREATE INDEX idx_driverrequest_deletedAt ON DriverRequest(deletedAt);

-- Add index on deletedBy for audit queries
CREATE INDEX idx_driverrequest_deletedBy ON DriverRequest(deletedBy);
