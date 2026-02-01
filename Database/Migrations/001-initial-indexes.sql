-- Migration: 001-initial-indexes
-- Description: Create initial indexes for frequently queried columns
-- Created: 2025-01-XX
-- Note: MySQL doesn't support IF NOT EXISTS for CREATE INDEX, so indexes are created directly
-- The migration runner will skip already-executed migrations

-- Users table indexes
CREATE INDEX idx_users_userUniqueId ON Users(userUniqueId);
CREATE INDEX idx_users_phoneNumber ON Users(phoneNumber);
CREATE INDEX idx_users_email ON Users(email);

-- UserRole table indexes
CREATE INDEX idx_userrole_userUniqueId_roleId ON UserRole(userUniqueId, roleId);
CREATE INDEX idx_userrole_userRoleUniqueId ON UserRole(userRoleUniqueId);

-- UserRoleStatusCurrent table indexes
CREATE INDEX idx_userrolestatuscurrent_userRoleId_statusId ON UserRoleStatusCurrent(userRoleId, statusId);
CREATE INDEX idx_userrolestatuscurrent_userRoleStatusUniqueId ON UserRoleStatusCurrent(userRoleStatusUniqueId);

-- AttachedDocuments table indexes
CREATE INDEX idx_attacheddocuments_userUniqueId_documentTypeId ON AttachedDocuments(userUniqueId, documentTypeId);
CREATE INDEX idx_attacheddocuments_attachedDocumentUniqueId ON AttachedDocuments(attachedDocumentUniqueId);

-- VehicleDriver table indexes
CREATE INDEX idx_vehicledriver_driverUserUniqueId_assignmentStatus ON VehicleDriver(driverUserUniqueId, assignmentStatus);
CREATE INDEX idx_vehicledriver_vehicleDriverUniqueId ON VehicleDriver(vehicleDriverUniqueId);

-- VehicleOwnership table indexes
CREATE INDEX idx_vehicleownership_vehicleUniqueId_userUniqueId ON VehicleOwnership(vehicleUniqueId, userUniqueId);
CREATE INDEX idx_vehicleownership_ownershipUniqueId ON VehicleOwnership(ownershipUniqueId);

-- PassengerRequest table indexes
CREATE INDEX idx_passengerrequest_passengerRequestUniqueId ON PassengerRequest(passengerRequestUniqueId);
CREATE INDEX idx_passengerrequest_userUniqueId_journeyStatusId ON PassengerRequest(userUniqueId, journeyStatusId);

-- DriverRequest table indexes
CREATE INDEX idx_driverrequest_driverRequestUniqueId ON DriverRequest(driverRequestUniqueId);
CREATE INDEX idx_driverrequest_userUniqueId_journeyStatusId ON DriverRequest(userUniqueId, journeyStatusId);

-- JourneyDecisions table indexes
CREATE INDEX idx_journeydecisions_journeyDecisionUniqueId ON JourneyDecisions(journeyDecisionUniqueId);
CREATE INDEX idx_journeydecisions_passengerRequestId_driverRequestId ON JourneyDecisions(passengerRequestId, driverRequestId);

-- Journey table indexes
CREATE INDEX idx_journey_journeyUniqueId ON Journey(journeyUniqueId);
CREATE INDEX idx_journey_journeyDecisionUniqueId_journeyStatusId ON Journey(journeyDecisionUniqueId, journeyStatusId);

