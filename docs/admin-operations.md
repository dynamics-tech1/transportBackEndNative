# Admin Operations

Complete guide to administrative functions, system monitoring, and management operations.

## User Management (Admin)

### Get Users by Filter
**Endpoint**: `GET /api/admin/getUserByFilterDetailed`
**Description**: Search and filter users by criteria
**Authentication**: Admin token required

**Query Parameters:**
- `phoneNumber`: Filter by phone
- `roleId`: Filter by role (1=Passenger, 2=Driver, 3=Admin)
- `statusId`: Filter by status
- `fullName`: Search by name

### Create Admin User
**Endpoint**: `POST /api/admin/createUserByAdminOrSuperAdmin`
**Description**: Create new admin users
**Authentication**: Super Admin token required

## Driver Management

### Get Unauthorized Drivers
**Endpoint**: `GET /api/admin/getUnAuthorizedDriver`
**Description**: View drivers pending authorization
**Authentication**: Admin token required

### Get Online Drivers
**Endpoint**: `GET /api/admin/getOnlineDrivers`
**Description**: View currently online drivers
**Authentication**: Admin token required

### Get All Active Drivers
**Endpoint**: `GET /api/admin/getAllActiveDrivers`
**Description**: View all active drivers
**Authentication**: Admin token required

## Document Approval

### Approve/Reject Documents
**Endpoint**: `PUT /api/admin/acceptRejectAttachedDocuments`
**Description**: Review and approve driver documents
**Authentication**: Admin token required

**Request Body:**
```json
{
    "attachedDocumentUniqueId": "document-uuid",
    "action": "ACCEPTED",
    "reason": "Document is valid"
}
```

## Journey Monitoring

### View Ongoing Journeys
**Endpoint**: `GET /api/user/getOngoingJourney`
**Description**: Monitor active journeys
**Authentication**: Admin token required

### Journey Statistics
**Endpoint**: `GET /api/admin/journeyStats`
**Description**: Get journey statistics and metrics
**Authentication**: Admin token required

## Financial Management

### Approve User Deposits
**Endpoint**: `PUT /api/finance/userDeposit/{userDepositUniqueId}`
**Description**: Approve pending deposit requests
**Authentication**: Admin token required

### View User Deposits
**Endpoint**: `GET /api/finance/userDeposit`
**Description**: View all deposit requests
**Authentication**: Admin token required

## System Administration

### Database Management
**Endpoint**: `DELETE /api/admin/dropAllTables`
**Description**: Drop all database tables (dev only)
**Authentication**: Admin token required

**Endpoint**: `POST /api/admin/createTable`
**Description**: Create database tables
**Authentication**: Admin token required

### System Configuration
**Endpoint**: `POST /api/admin/installPreDefinedData`
**Description**: Install initial system data
**Authentication**: Super Admin token required

## Role Management

### Create Roles
**Endpoint**: `POST /api/admin/roles`
**Description**: Create new user roles
**Authentication**: Admin token required

### Manage User Roles
**Endpoint**: `POST /api/admin/userRole/create`
**Description**: Assign roles to users
**Authentication**: Super Admin token required

### View Roles
**Endpoint**: `GET /api/admin/roles`
**Description**: Get all system roles
**Authentication**: Admin token required

## System Monitoring

### Application Health
**Endpoint**: `GET /health`
**Description**: Check application health status
**Authentication**: None required

### Database Health
**Endpoint**: `GET /health/database`
**Description**: Check database connectivity
**Authentication**: None required

### System Metrics
**Endpoint**: `GET /admin/metrics`
**Description**: View system performance metrics
**Authentication**: Admin token required

## Security & Access Control

### Admin Access Verification
- `verifyAdminsIdentity`: Ensures admin role
- `verifyIfUserIsSupperAdmin`: Ensures super admin role
- `verifyTokenOfAxios`: Validates JWT tokens

### Audit Logging
- All admin actions are logged
- User permission changes tracked
- Security events monitored

## Admin Dashboard Features

### Statistics Overview
- Total users by role
- Active drivers count
- Pending document approvals
- Revenue metrics

### User Activity Monitoring
- Recent registrations
- Active sessions
- Failed login attempts
- System usage patterns

### Financial Oversight
- Deposit approval queue
- Payment transaction monitoring
- Revenue analytics
- Financial reporting
