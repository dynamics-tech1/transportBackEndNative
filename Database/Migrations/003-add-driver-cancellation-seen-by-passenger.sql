-- Migration: 003-add-driver-cancellation-seen-by-passenger
-- Description: Add isCancellationByDriverSeenByPassenger column to JourneyDecisions table
-- Created: 2025-01-XX
-- Note: This column tracks whether passenger has seen driver cancellation notification

-- Add isCancellationByDriverSeenByPassenger column to JourneyDecisions table
ALTER TABLE JourneyDecisions
ADD COLUMN isCancellationByDriverSeenByPassenger ENUM('no need to see it', 'not seen by passenger yet', 'seen by passenger') DEFAULT 'no need to see it' COMMENT 'Track if passenger has seen driver cancellation notification';

