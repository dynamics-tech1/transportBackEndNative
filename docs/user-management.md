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

### 1.1 Create Admin User

**Endpoint**: `POST /api/admin/createUserByAdminOrSuperAdmin`
**Description**: Creates a new user with admin privileges. Requires Super Admin authentication.
**Authentication**: Super Admin token required
**Request Body**:

```json
{
  "fullName": "Birhanu Gardie",
  "phoneNumber": "+251910185606",
  "email": "birie@gmail.com",
  "roleId": 3,
  "statusId": 1,
  "userRoleStatusDescription": "an admin can have a role of managing driver passenger etc."
}
```

**Response**:

```json
{
  "message": "success",
  "data": {
    "userUniqueId": "ef226a60-08d1-4b0e-aaa6-de3f26d67d94",
    "fullName": "Birhanu Gardie",
    "phoneNumber": "+251910185606",
    "email": "birie@gmail.com",
    "userCreatedAt": "2026-01-31 15:03:39",
    "userCreatedBy": "f51c5673-b309-4837-9967-ed74b3d02ff2"
  }
}
```

### 1.2 Verify Admin User by OTP

**Endpoint**: `POST /api/user/verifyUserByOTP`
**Description**: Verifies an admin user's phone number using OTP sent during registration.
**Authentication**: None (OTP verification)
**Request Body**:

```json
{
  "roleId": 3,
  "OTP": 101010,
  "phoneNumber": "+251910185606"
}
```

**Response**:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7InVzZXJVbmlxdWVJZCI6ImVmMjI2YTYwLTA4ZDEtNGIwZS1hYWE2LWRlM2YyNmQ2N2Q5NCIsImZ1bGxOYW1lIjoiQmlyaGFudSBHYXJkaWUiLCJwaG9uZU51bWJlciI6IisyNTE5MTAxODU2MDYiLCJlbWFpbCI6ImJpcmllQGdtYWlsLmNvbSIsInJvbGVJZCI6M319sImlhdCI6MTc2OTg3MTg0OX0.5wKgVhR5OJ-P5uzaK4QOg3Yyd60H465p2y4izxyoB60",
  "message": "success",
  "data": "OTP verified successfully"
}
```

> **Important**: Store the JWT token in localStorage (browsers), AsyncStorage (React Native), or environment variables (Postman). Include this token in the Authorization header as `Bearer <token>` for all subsequent admin API calls.

### Get Users by Filter

**Endpoint**: `GET /api/admin/getUserByFilterDetailed`
**Description**: Search and filter users by various criteria
**Authentication**: Admin token required

## Regular User Management

### 3. Create Regular User passenger

**Endpoint**: `POST /api/user/createUser`
**Description**: Creates a new passenger or driver user.
**Request Body**:

```json
{
  "fullName": "user 81 ",
  "phoneNumber": "+251922112481",
  // "email": "mabebawumolla8322@gmail.com",
  "roleId": 1,
  "statusId": 1
}
```

**Response**:

```json
{
  "status": "success",
  "data": {
    "userUniqueId": "7cf1250c-6b07-422b-b3fe-84144f9e7055",
    "fullName": "user 81 ",
    "phoneNumber": "+251922112481",
    "userCreatedAt": "2026-01-31 15:05:53",
    "userCreatedBy": "system"
  },
  "messageDetail": "User created successfully, but OTP SMS could not be sent: SMS API Error: 401 - \"Unauthorized (401-9) : Account balance is too low. Please refill or contact support.\"",
  "message": "success"
}
```

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
