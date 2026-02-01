-- Migration: 002-add-cancellation-seen-column
-- Description: Add isCancellationByPassengerSeenByDriver column to DriverRequest table
-- Created: 2025-01-XX
-- Note: This column tracks whether driver has seen cancellation notification

-- Add isCancellationByPassengerSeenByDriver column to DriverRequest table
ALTER TABLE DriverRequest
ADD COLUMN isCancellationByPassengerSeenByDriver ENUM('no need to see it', 'not seen by driver yet', 'seen by driver') DEFAULT 'no need to see it' COMMENT 'Track if driver has seen cancellation notification';

