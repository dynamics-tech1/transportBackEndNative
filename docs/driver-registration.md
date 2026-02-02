# Driver Registration

Complete guide to driver account creation, verification, and management.

## Driver Registration Flow

### 1. Create Driver Account
**Endpoint**: `POST /api/user/createUser`
**Description**: Register a new driver account
**Authentication**: None required

**Request Body**:
```json
{
    "fullName": "Driver Name",
    "phoneNumber": "+1234567890",
    "roleId": 2,
    "statusId": 1
}
```

### 2. Verify Driver Account
**Endpoint**: `POST /api/user/verifyUserByOTP`
**Description**: Verify driver phone number with OTP
**Authentication**: None required

### 3. Complete Profile Setup
After OTP verification, drivers need to:
- Upload required documents
- Register vehicle information
- Set up payment methods

## Driver Account Status

### Check Account Status
**Endpoint**: `GET /api/account/status?ownerUserUniqueId=self&roleId=2`
**Description**: Check driver account status and requirements
**Authentication**: Driver token required

**Response**:
```json
{
    "message": "success",
    "messageType": "accountStatus",
    "userData": {
        "userRoleStatusId": 5,
        "statusId": 2,
        "roleName": "Driver",
        "statusName": "inactive - vehicle not registered"
    },
    "attachedDocumentsByStatus": {
        "PENDING": [],
        "ACCEPTED": [],
        "REJECTED": []
    },
    "unAttachedDocumentTypes": [
        {
            "documentTypeName": "Driver's License",
            "documentTypeDescription": "Valid driver's license",
            "isDocumentMandatory": true
        }
    ]
}
```

## Document Requirements

### Required Documents for Drivers
1. **Driver's License** - Valid and unexpired license
2. **Vehicle Registration** - Proof of vehicle ownership
3. **Insurance Certificate** - Current vehicle insurance
4. **Profile Photo** - Clear photo for verification

### Document Upload Process
- Upload documents through dedicated endpoints
- Documents are reviewed by admin
- Status updates via email/SMS notifications
- Re-upload required for rejected documents

## Vehicle Registration

### Register Vehicle
**Endpoint**: `POST /api/driver/vehicle`
**Description**: Register driver's vehicle
**Authentication**: Driver token required

**Request Body**:
```json
{
    "vehicleTypeUniqueId": "vehicle-type-uuid",
    "licensePlate": "ABC-123",
    "model": "Toyota Corolla",
    "year": 2020,
    "color": "White"
}
```

## Driver Availability Management

### Update Online Status
**Endpoint**: `PUT /api/driver/status`
**Description**: Set driver online/offline status
**Authentication**: Driver token required

### Location Updates
**Endpoint**: `PUT /api/driver/location`
**Description**: Update current GPS location
**Authentication**: Driver token required

## Driver Dashboard

### View Available Requests
**Endpoint**: `GET /api/driver/requests`
**Description**: Get available ride requests
**Authentication**: Driver token required

### Accept/Reject Requests
**Endpoint**: `POST /api/driver/requests/{requestId}/accept`
**Description**: Accept a ride request
**Authentication**: Driver token required

## Earnings and Payments

### View Earnings
**Endpoint**: `GET /api/driver/earnings`
**Description**: Get earning history and statistics
**Authentication**: Driver token required

### Payment History
**Endpoint**: `GET /api/driver/payments`
**Description**: View payment transactions
**Authentication**: Driver token required

## Driver Ratings and Reviews

### View Ratings
**Endpoint**: `GET /api/driver/ratings`
**Description**: Get driver rating statistics
**Authentication**: Driver token required

### Passenger Reviews
**Endpoint**: `GET /api/driver/reviews`
**Description**: View passenger reviews and feedback
**Authentication**: Driver token required
