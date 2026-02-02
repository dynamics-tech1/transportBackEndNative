# User Management

Complete guide to user registration, verification, and profile management.

## User Registration Flow

### 1. Create User Account
**Endpoint**: `POST /api/user/createUser`
**Description**: Register a new user (passenger or driver)
**Authentication**: None required

**Request Body**:
```json
{
    "fullName": "John Doe",
    "phoneNumber": "+1234567890",
    "roleId": 1,
    "statusId": 1
}
```

**Response**:
```json
{
    "status": "success",
    "data": {
        "userUniqueId": "user-uuid-here",
        "fullName": "John Doe",
        "phoneNumber": "+1234567890",
        "userCreatedAt": "2026-01-31T12:00:00.000Z"
    },
    "messageDetail": "User created successfully, but OTP SMS could not be sent..."
}
```

### 2. Verify User with OTP
**Endpoint**: `POST /api/user/verifyUserByOTP`
**Description**: Verify phone number using SMS OTP
**Authentication**: None required

**Request Body**:
```json
{
    "roleId": 1,
    "OTP": "123456",
    "phoneNumber": "+1234567890"
}
```

**Response**:
```json
{
    "token": "jwt-token-here",
    "message": "success",
    "data": "OTP verified successfully"
}
```

## Admin User Management

### Create Admin User (Super Admin Only)
**Endpoint**: `POST /api/admin/createUserByAdminOrSuperAdmin`
**Description**: Create admin users with elevated permissions
**Authentication**: Super Admin token required

### Get Users by Filter
**Endpoint**: `GET /api/admin/getUserByFilterDetailed`
**Description**: Search and filter users by various criteria
**Authentication**: Admin token required

## User Profile Management

### Update Profile
**Endpoint**: `PUT /api/user/profile`
**Description**: Update user profile information
**Authentication**: User token required

### Get Profile
**Endpoint**: `GET /api/user/profile`
**Description**: Retrieve current user profile
**Authentication**: User token required

## User Status Management

### Account Status Check
**Endpoint**: `GET /api/account/status?ownerUserUniqueId=self&roleId=2`
**Description**: Check account status and requirements
**Authentication**: User token required

### User Role Management
**Endpoint**: `POST /api/admin/userRole/create`
**Description**: Assign roles to users (Super Admin only)
**Authentication**: Super Admin token required

## User Data Privacy

### Data Export
**Endpoint**: `GET /api/user/data`
**Description**: Export user data for GDPR compliance
**Authentication**: User token required

### Account Deletion
**Endpoint**: `DELETE /api/user/account`
**Description**: Permanently delete user account
**Authentication**: User token required
