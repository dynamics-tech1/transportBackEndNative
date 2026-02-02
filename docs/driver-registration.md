# Driver Registration

Complete guide to driver account creation, verification, and management.

## Driver Registration Flow

### 1. Create Driver Account

**Endpoint**: `POST /api/user/createUser`
**Description**: Creates a new driver account.
**Request Body**:

```json
{
  "fullName": "Driver Name",
  "email": "driver@example.com",
  "phoneNumber": "+1234567890",
  "password": "driverPass123",
  "roleId": 4 // Driver role
}
```

### 2. Verify Driver Account

**Endpoint**: `POST /api/user/verifyUserByOTP`
**Description**: Verify driver phone number with OTP
**Authentication**: None required

**Response**:

```json
{
  "message": "success",
  "messageType": "accountStatus",
  "vehicle": null,
  "userData": {
    "userRoleStatusId": 5,
    "userRoleStatusUniqueId": "f05804fa-8f49-4126-9247-213045fd8453",
    "statusId": 2,
    "userRoleId": 5,
    "userRoleStatusDescription": null,
    "userRoleStatusCreatedBy": "b269e36d-1ed1-469d-8d4a-042f53365329",
    "userRoleStatusCreatedAt": "2026-01-31T12:23:31.000Z",
    "userRoleStatusCurrentVersion": 1,
    "userUniqueId": "b269e36d-1ed1-469d-8d4a-042f53365329",
    "roleId": 2,
    "userRoleUniqueId": "3564bda8-6afd-4c1e-9250-75ef1dd55813",
    "fullName": "user 80",
    "phoneNumber": "+251918569809",
    "email": null,
    "roleName": "Driver",
    "roleDescription": "a person who can recive order from passenger to load goods",
    "statusName": "inactive - vehicle not registered",
    "statusDescription": "Driver has not registered a vehicle.",
    "createdByName": "user 80"
  },
  "attachedDocumentsByStatus": {
    "PENDING": [],
    "ACCEPTED": [],
    "REJECTED": []
  },
  "unAttachedDocumentTypes": [
    {
      "attachedDocumentId": null,
      "attachedDocumentUniqueId": null,
      "userUniqueId": null,
      "attachedDocumentDescription": null,
      "documentTypeId": 1,
      "attachedDocumentFileNumber": null,
      "documentExpirationDate": null,
      "attachedDocumentAcceptance": null,
      "attachedDocumentName": null,
      "documentVersion": null,
      "attachedDocumentCreatedByUserId": null,
      "attachedDocumentCreatedAt": null,
      "attachedDocumentAcceptanceReason": null,
      "attachedDocumentAcceptedRejectedByUserId": null,
      "attachedDocumentAcceptedRejectedAt": null,
      "documentTypeUniqueId": "fb7c9a3a-ca80-453f-96d2-bb661237ba22",
      "documentTypeName": "Driver's License",
      "uploadedDocumentName": "driversLicense",
      "uploadedDocumentTypeId": "driversLicenseTypeId",
      "uploadedDocumentDescription": "driversLicenseDescription",
      "uploadedDocumentExpirationDate": "driversLicenseExpirationDate",
      "uploadedDocumentFileNumber": "driversLicenseFileNumber",
      "documentTypeDescription": " A valid and unexpired driver's license. The admin needs this to ensure the driver is legally permitted to operate a vehicle.",
      "documentTypeCreatedBy": "f51c5673-b309-4837-9967-ed74b3d02ff2",
      "documentTypeCreatedAt": "2026-01-31T11:53:03.000Z",
      "documentTypeUpdatedBy": null,
      "documentTypeUpdatedAt": null,
      "documentTypeDeletedBy": null,
      "documentTypeDeletedAt": null,
      "isDocumentTypeDeleted": 0,
      "documentTypeCurrentVersion": 1,
      "roleDocumentRequirementId": 1,
      "roleDocumentRequirementUniqueId": "c60ce1c0-87eb-44fb-bbdb-18424502e4c8",
      "roleId": 2,
      "isDocumentMandatory": 1,
      "isFileNumberRequired": 1,
      "isExpirationDateRequired": 1,
      "isDescriptionRequired": 0,
      "roleDocumentRequirementCreatedBy": "f51c5673-b309-4837-9967-ed74b3d02ff2",
      "roleDocumentRequirementUpdatedBy": null,
      "roleDocumentRequirementDeletedBy": null,
      "roleDocumentRequirementCreatedAt": "2026-01-31T11:53:06.000Z",
      "roleDocumentRequirementUpdatedAt": null,
      "roleDocumentRequirementDeletedAt": null,
      "doc_status": "NOT_ATTACHED"
    },
    {
      "attachedDocumentId": null,
      "attachedDocumentUniqueId": null,
      "userUniqueId": null,
      "attachedDocumentDescription": null,
      "documentTypeId": 2,
      "attachedDocumentFileNumber": null,
      "documentExpirationDate": null,
      "attachedDocumentAcceptance": null,
      "attachedDocumentName": null,
      "documentVersion": null,
      "attachedDocumentCreatedByUserId": null,
      "attachedDocumentCreatedAt": null,
      "attachedDocumentAcceptanceReason": null,
      "attachedDocumentAcceptedRejectedByUserId": null,
      "attachedDocumentAcceptedRejectedAt": null,
      "documentTypeUniqueId": "b05fdb3f-ce24-4514-be46-d87bedaf8fe1",
      "documentTypeName": " Vehicle Registration (librea)",
      "uploadedDocumentName": "VehicleRegistrationLibrea",
      "uploadedDocumentTypeId": "VehicleRegistrationLibreaTypeId",
      "uploadedDocumentDescription": "VehicleRegistrationLibreaDescription",
      "uploadedDocumentExpirationDate": "VehicleRegistrationLibreaExpirationDate",
      "uploadedDocumentFileNumber": "VehicleRegistrationLibreaFileNumber",
      "documentTypeDescription": "Proof of ownership or right to use the vehicle for ride share services. It confirms the vehicle is legally registered.",
      "documentTypeCreatedBy": "f51c5673-b309-4837-9967-ed74b3d02ff2",
      "documentTypeCreatedAt": "2026-01-31T11:53:03.000Z",
      "documentTypeUpdatedBy": null,
      "documentTypeUpdatedAt": null,
      "documentTypeDeletedBy": null,
      "documentTypeDeletedAt": null,
      "isDocumentTypeDeleted": 0,
      "documentTypeCurrentVersion": 1,
      "roleDocumentRequirementId": 2,
      "roleDocumentRequirementUniqueId": "348a065d-1886-4145-a457-139b768a7bb0",
      "roleId": 2,
      "isDocumentMandatory": 1,
      "isFileNumberRequired": 1,
      "isExpirationDateRequired": 0,
      "isDescriptionRequired": 0,
      "roleDocumentRequirementCreatedBy": "f51c5673-b309-4837-9967-ed74b3d02ff2",
      "roleDocumentRequirementUpdatedBy": null,
      "roleDocumentRequirementDeletedBy": null,
      "roleDocumentRequirementCreatedAt": "2026-01-31T11:53:07.000Z",
      "roleDocumentRequirementUpdatedAt": null,
      "roleDocumentRequirementDeletedAt": null,
      "doc_status": "NOT_ATTACHED"
    },
    {
      "attachedDocumentId": null,
      "attachedDocumentUniqueId": null,
      "userUniqueId": null,
      "attachedDocumentDescription": null,
      "documentTypeId": 4,
      "attachedDocumentFileNumber": null,
      "documentExpirationDate": null,
      "attachedDocumentAcceptance": null,
      "attachedDocumentName": null,
      "documentVersion": null,
      "attachedDocumentCreatedByUserId": null,
      "attachedDocumentCreatedAt": null,
      "attachedDocumentAcceptanceReason": null,
      "attachedDocumentAcceptedRejectedByUserId": null,
      "attachedDocumentAcceptedRejectedAt": null,
      "documentTypeUniqueId": "d080a535-45fe-4fa7-bb75-e3e8a2bd85b8",
      "documentTypeName": "Profile Photo",
      "uploadedDocumentName": "profilePhoto",
      "uploadedDocumentTypeId": "profilePhotoTypeId",
      "uploadedDocumentDescription": "profilePhotoDescription",
      "uploadedDocumentExpirationDate": "profilePhotoExpirationDate",
      "uploadedDocumentFileNumber": "profilePhotoFileNumber",
      "documentTypeDescription": "Profile Photo is used to identify current face of user",
      "documentTypeCreatedBy": "f51c5673-b309-4837-9967-ed74b3d02ff2",
      "documentTypeCreatedAt": "2026-01-31T11:53:04.000Z",
      "documentTypeUpdatedBy": null,
      "documentTypeUpdatedAt": null,
      "documentTypeDeletedBy": null,
      "documentTypeDeletedAt": null,
      "isDocumentTypeDeleted": 0,
      "documentTypeCurrentVersion": 1,
      "roleDocumentRequirementId": 3,
      "roleDocumentRequirementUniqueId": "180acf9b-8d85-41db-a98c-c890ab273bdf",
      "roleId": 2,
      "isDocumentMandatory": 1,
      "isFileNumberRequired": 0,
      "isExpirationDateRequired": 0,
      "isDescriptionRequired": 0,
      "roleDocumentRequirementCreatedBy": "f51c5673-b309-4837-9967-ed74b3d02ff2",
      "roleDocumentRequirementUpdatedBy": null,
      "roleDocumentRequirementDeletedBy": null,
      "roleDocumentRequirementCreatedAt": "2026-01-31T11:53:08.000Z",
      "roleDocumentRequirementUpdatedAt": null,
      "roleDocumentRequirementDeletedAt": null,
      "doc_status": "NOT_ATTACHED"
    }
  ],
  "requiredDocuments": [
    {
      "roleDocumentRequirementId": 1,
      "roleDocumentRequirementUniqueId": "c60ce1c0-87eb-44fb-bbdb-18424502e4c8",
      "roleId": 2,
      "documentTypeId": 1,
      "isDocumentMandatory": 1,
      "isFileNumberRequired": 1,
      "isExpirationDateRequired": 1,
      "isDescriptionRequired": 0,
      "roleDocumentRequirementCreatedBy": "f51c5673-b309-4837-9967-ed74b3d02ff2",
      "roleDocumentRequirementUpdatedBy": null,
      "roleDocumentRequirementDeletedBy": null,
      "roleDocumentRequirementCreatedAt": "2026-01-31T11:53:06.000Z",
      "roleDocumentRequirementUpdatedAt": null,
      "roleDocumentRequirementDeletedAt": null,
      "dt_documentTypeId": 1,
      "documentTypeName": "Driver's License",
      "ro_roleId": 2,
      "roleUniqueId": "25fb4e56-d664-433d-b6f0-8f6b7163229c",
      "roleName": "Driver"
    },
    {
      "roleDocumentRequirementId": 2,
      "roleDocumentRequirementUniqueId": "348a065d-1886-4145-a457-139b768a7bb0",
      "roleId": 2,
      "documentTypeId": 2,
      "isDocumentMandatory": 1,
      "isFileNumberRequired": 1,
      "isExpirationDateRequired": 0,
      "isDescriptionRequired": 0,
      "roleDocumentRequirementCreatedBy": "f51c5673-b309-4837-9967-ed74b3d02ff2",
      "roleDocumentRequirementUpdatedBy": null,
      "roleDocumentRequirementDeletedBy": null,
      "roleDocumentRequirementCreatedAt": "2026-01-31T11:53:07.000Z",
      "roleDocumentRequirementUpdatedAt": null,
      "roleDocumentRequirementDeletedAt": null,
      "dt_documentTypeId": 2,
      "documentTypeName": " Vehicle Registration (librea)",
      "ro_roleId": 2,
      "roleUniqueId": "25fb4e56-d664-433d-b6f0-8f6b7163229c",
      "roleName": "Driver"
    },
    {
      "roleDocumentRequirementId": 3,
      "roleDocumentRequirementUniqueId": "180acf9b-8d85-41db-a98c-c890ab273bdf",
      "roleId": 2,
      "documentTypeId": 4,
      "isDocumentMandatory": 1,
      "isFileNumberRequired": 0,
      "isExpirationDateRequired": 0,
      "isDescriptionRequired": 0,
      "roleDocumentRequirementCreatedBy": "f51c5673-b309-4837-9967-ed74b3d02ff2",
      "roleDocumentRequirementUpdatedBy": null,
      "roleDocumentRequirementDeletedBy": null,
      "roleDocumentRequirementCreatedAt": "2026-01-31T11:53:08.000Z",
      "roleDocumentRequirementUpdatedAt": null,
      "roleDocumentRequirementDeletedAt": null,
      "dt_documentTypeId": 4,
      "documentTypeName": "Profile Photo",
      "ro_roleId": 2,
      "roleUniqueId": "25fb4e56-d664-433d-b6f0-8f6b7163229c",
      "roleName": "Driver"
    }
  ],
  "subscription": {
    "hasActiveSubscription": true,
    "subscriptionType": "paid",
    "subscriptionDetails": [
      {
        "userSubscriptionId": 1,
        "userSubscriptionUniqueId": "6bcc90de-f580-48fe-b2f4-9626062799f0",
        "driverUniqueId": "b269e36d-1ed1-469d-8d4a-042f53365329",
        "subscriptionPlanPricingUniqueId": "1ee1aa1f-ef8c-4547-ba39-9b90261eb4ef",
        "startDate": "2026-01-31T12:27:36.000Z",
        "endDate": "2026-03-02T12:27:36.000Z",
        "userSubscriptionCreatedBy": "b269e36d-1ed1-469d-8d4a-042f53365329",
        "userSubscriptionUpdatedBy": null,
        "userSubscriptionDeletedBy": null,
        "userSubscriptionCreatedAt": "2026-01-31T12:27:37.000Z",
        "userSubscriptionUpdatedAt": null,
        "userSubscriptionDeletedAt": null,
        "planName": "One month Free",
        "planDescription": "This plan is free for one month",
        "isFree": 1,
        "price": "700.00",
        "effectiveFrom": "2026-01-19T21:00:00.000Z",
        "effectiveTo": "2026-02-18T21:00:00.000Z",
        "subscriptionStatus": "active",
        "daysUntilExpiry": 30
      }
    ],
    "wasRecentlyGranted": true
  },
  "status": 2,
  "reason": "No vehicle registered for this role",
  "banData": null
}
```

### 3. Register Vehicle

**Endpoint**: `POST /api/user/vehicles/driverUserUniqueId/self`
**Description**: if there is no vehicle in /api/account/status Response then Register a new vehicle for the driver.
**Authentication**: Driver token required if it is registered by driver else admin token required to register for other user
**Request Body**:

```json
{
  "vehicleTypeUniqueId": "fddf2911-dfa5-4363-a04f-c82e59536fa4",
  "licensePlate": "3-23A6326 AA",
  "color": "White base red sponda",
  "isDriverOwnerOfVehicle": false
}
```

**Response**:

```json
{
  "message": "Vehicle registered successfully",
  "vehicleId": "vehicle-uuid-here"
}
```

from account we can know role document requirement

so we can upload documents for driver verification based on uploadedDocumentName ,uploadedDocumentTypeId,uploadedDocumentFileNumber,uploadedDocumentExpirationDate,uploadedDocumentDescription

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
