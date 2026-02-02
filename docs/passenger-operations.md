# Passenger Operations

Complete guide to passenger ride requests, journey management, and transportation services.

## Ride Request Creation

### 1. Create Passenger Request

**Endpoint**: `POST /api/passengerRequest/createRequest`
**Description**: Creates a new ride request for transporting goods.
**Authentication**: Passenger token required
**Request Body**:

```json
{
  "shipperPhoneNumber": "+2519221124667",
  "passengerRequestBatchId": "ef5bc758-b85f-4de6-a750-855c79643790",
  "numberOfVehicles": 4,
  "deliveryDate": "2025-04-20T10:54:26.077Z",
  "requestType": "PASSENGER",
  "destination": {
    "latitude": 9.0204693,
    "longitude": 38.80246,
    "description": "Diredawa, Ethiopia"
  },
  "vehicle": {
    "vehicleTypeUniqueId": "cb47c878-5d07-45f6-b628-6b02430cb691"
  },
  "shippableItemName": "Cement",
  "shippableItemQtyInQuintal": 500,
  "shippingCost": 67679090,
  "shippingDate": "2025-04-20T10:54:26.077Z",
  "originLocation": {
    "latitude": 9.0204683,
    "longitude": 38.80246,
    "description": "Addis Ababa, Ethiopia"
  }
}
```

**Response**:

```json
{
  "message": "success",
  "totalRecords": {
    "totalCount": 4,
    "waitingCount": 4,
    "requestedCount": 0,
    "acceptedByDriverCount": 0,
    "acceptedByPassengerCount": 0,
    "journeyStartedCount": 0,
    "notSeenCompletedCount": 0,
    "notSeenCancelledByDriverCount": 0
  }
}
```

### 2. Get Passenger Requests

**Endpoint**: `GET /api/user/getPassengerRequest4allOrSingleUser?journeyStatusId=5,1,2`
**Description**: Retrieves ride requests with optional filtering by journey status.
**Authentication**: User token required
**Query Parameters**:

- `journeyStatusId`: Comma-separated list of status IDs to filter by

**Response**:

```json
{
  "message": "success",
  "formattedData": [
    {
      "passengerRequest": {
        "passengerRequestId": 4,
        "passengerRequestUniqueId": "a3ffa51c-a716-43a6-9b8f-d639bd5e5c30",
        "userUniqueId": "7cf1250c-6b07-422b-b3fe-84144f9e7055",
        "passengerRequestBatchId": "ef5bc758-b85f-4de6-a750-855c79643790",
        "vehicleTypeUniqueId": "fddf2911-dfa5-4363-a04f-c82e59536fa4",
        "journeyStatusId": 1,
        "originLatitude": "9.02046830",
        "originLongitude": "38.80246000",
        "originPlace": "Addis Ababa, Ethiopia",
        "destinationLatitude": "9.02046930",
        "destinationLongitude": "38.80246000",
        "destinationPlace": "Diredawa, Ethiopia",
        "shipperRequestCreatedAt": "2026-01-31T12:16:18.000Z",
        "shippableItemName": "Cement",
        "shippableItemQtyInQuintal": "500.00",
        "shippingDate": "2025-04-20T10:54:26.000Z",
        "deliveryDate": "2025-04-20T10:54:26.000Z",
        "shippingCost": "67679090.00",
        "isCompletionSeen": 0,
        "shipperRequestCreatedBy": "7cf1250c-6b07-422b-b3fe-84144f9e7055",
        "shipperRequestCreatedByRoleId": 1,
        "passengerRequestUpdatedBy": null,
        "passengerRequestDeletedBy": null,
        "passengerRequestUpdatedAt": null,
        "passengerRequestDeletedAt": null,
        "fullName": "user 81 ",
        "email": null,
        "phoneNumber": "+251922112481",
        "vehicleTypeName": "Isuzu NPR"
      },
      "driverRequests": [],
      "decisions": [],
      "journey": {}
    },
    {
      "passengerRequest": {
        "passengerRequestId": 3,
        "passengerRequestUniqueId": "c5f6474e-083d-4b3e-ac0f-d60b3fe62897",
        "userUniqueId": "7cf1250c-6b07-422b-b3fe-84144f9e7055",
        "passengerRequestBatchId": "ef5bc758-b85f-4de6-a750-855c79643790",
        "vehicleTypeUniqueId": "fddf2911-dfa5-4363-a04f-c82e59536fa4",
        "journeyStatusId": 1,
        "originLatitude": "9.02046830",
        "originLongitude": "38.80246000",
        "originPlace": "Addis Ababa, Ethiopia",
        "destinationLatitude": "9.02046930",
        "destinationLongitude": "38.80246000",
        "destinationPlace": "Diredawa, Ethiopia",
        "shipperRequestCreatedAt": "2026-01-31T12:16:18.000Z",
        "shippableItemName": "Cement",
        "shippableItemQtyInQuintal": "500.00",
        "shippingDate": "2025-04-20T10:54:26.000Z",
        "deliveryDate": "2025-04-20T10:54:26.000Z",
        "shippingCost": "67679090.00",
        "isCompletionSeen": 0,
        "shipperRequestCreatedBy": "7cf1250c-6b07-422b-b3fe-84144f9e7055",
        "shipperRequestCreatedByRoleId": 1,
        "passengerRequestUpdatedBy": null,
        "passengerRequestDeletedBy": null,
        "passengerRequestUpdatedAt": null,
        "passengerRequestDeletedAt": null,
        "fullName": "user 81 ",
        "email": null,
        "phoneNumber": "+251922112481",
        "vehicleTypeName": "Isuzu NPR"
      },
      "driverRequests": [],
      "decisions": [],
      "journey": {}
    },
    {
      "passengerRequest": {
        "passengerRequestId": 2,
        "passengerRequestUniqueId": "26a4fd0d-e4d7-4f2c-a472-ea6b22d8f0ce",
        "userUniqueId": "7cf1250c-6b07-422b-b3fe-84144f9e7055",
        "passengerRequestBatchId": "ef5bc758-b85f-4de6-a750-855c79643790",
        "vehicleTypeUniqueId": "fddf2911-dfa5-4363-a04f-c82e59536fa4",
        "journeyStatusId": 1,
        "originLatitude": "9.02046830",
        "originLongitude": "38.80246000",
        "originPlace": "Addis Ababa, Ethiopia",
        "destinationLatitude": "9.02046930",
        "destinationLongitude": "38.80246000",
        "destinationPlace": "Diredawa, Ethiopia",
        "shipperRequestCreatedAt": "2026-01-31T12:16:18.000Z",
        "shippableItemName": "Cement",
        "shippableItemQtyInQuintal": "500.00",
        "shippingDate": "2025-04-20T10:54:26.000Z",
        "deliveryDate": "2025-04-20T10:54:26.000Z",
        "shippingCost": "67679090.00",
        "isCompletionSeen": 0,
        "shipperRequestCreatedBy": "7cf1250c-6b07-422b-b3fe-84144f9e7055",
        "shipperRequestCreatedByRoleId": 1,
        "passengerRequestUpdatedBy": null,
        "passengerRequestDeletedBy": null,
        "passengerRequestUpdatedAt": null,
        "passengerRequestDeletedAt": null,
        "fullName": "user 81 ",
        "email": null,
        "phoneNumber": "+251922112481",
        "vehicleTypeName": "Isuzu NPR"
      },
      "driverRequests": [],
      "decisions": [],
      "journey": {}
    },
    {
      "passengerRequest": {
        "passengerRequestId": 1,
        "passengerRequestUniqueId": "9a9c66a3-ec66-42c7-be0a-837a8f7d8b83",
        "userUniqueId": "7cf1250c-6b07-422b-b3fe-84144f9e7055",
        "passengerRequestBatchId": "ef5bc758-b85f-4de6-a750-855c79643790",
        "vehicleTypeUniqueId": "fddf2911-dfa5-4363-a04f-c82e59536fa4",
        "journeyStatusId": 1,
        "originLatitude": "9.02046830",
        "originLongitude": "38.80246000",
        "originPlace": "Addis Ababa, Ethiopia",
        "destinationLatitude": "9.02046930",
        "destinationLongitude": "38.80246000",
        "destinationPlace": "Diredawa, Ethiopia",
        "shipperRequestCreatedAt": "2026-01-31T12:16:18.000Z",
        "shippableItemName": "Cement",
        "shippableItemQtyInQuintal": "500.00",
        "shippingDate": "2025-04-20T10:54:26.000Z",
        "deliveryDate": "2025-04-20T10:54:26.000Z",
        "shippingCost": "67679090.00",
        "isCompletionSeen": 0,
        "shipperRequestCreatedBy": "7cf1250c-6b07-422b-b3fe-84144f9e7055",
        "shipperRequestCreatedByRoleId": 1,
        "passengerRequestUpdatedBy": null,
        "passengerRequestDeletedBy": null,
        "passengerRequestUpdatedAt": null,
        "passengerRequestDeletedAt": null,
        "fullName": "user 81 ",
        "email": null,
        "phoneNumber": "+251922112481",
        "vehicleTypeName": "Isuzu NPR"
      },
      "driverRequests": [],
      "decisions": [],
      "journey": {}
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 4,
    "itemsPerPage": 10,
    "hasNext": false,
    "hasPrev": false,
    "userId": "7cf1250c-6b07-422b-b3fe-84144f9e7055"
  },
  "filters": {
    "journeyStatusId": "3,1",
    "journeyStatusIds": ["3", "1"]
  }
}
```

## Request Management

### View Passenger Requests

**Endpoint**: `GET /api/user/getPassengerRequest4allOrSingleUser?journeyStatusId=5,1,2`
**Description**: Get passenger requests with filtering
**Authentication**: User token required

### Request Status Tracking

Journey status IDs:

- 1: Waiting for driver
- 2: Driver accepted
- 3: Journey started
- 4: Journey completed
- 5: Cancelled

## Journey Tracking

### Track Active Journey

**Endpoint**: `GET /api/user/getOngoingJourney`
**Description**: Get current ongoing journeys
**Authentication**: User token required

### Journey History

**Endpoint**: `GET /api/user/journeyHistory`
**Description**: View completed journey history
**Authentication**: User token required

## Payment Processing

### Make Payment

**Endpoint**: `POST /api/payment/create`
**Description**: Process payment for journey
**Authentication**: User token required

### Payment History

**Endpoint**: `GET /api/payment/history`
**Description**: View payment transactions
**Authentication**: User token required

## Rating and Feedback

### Rate Driver

**Endpoint**: `POST /api/rating/driver`
**Description**: Submit rating for completed journey
**Authentication**: User token required

**Request Body**:

```json
{
  "journeyId": "journey-uuid",
  "rating": 5,
  "comment": "Excellent service"
}
```

### View Ratings

**Endpoint**: `GET /api/rating/history`
**Description**: View submitted ratings
**Authentication**: User token required
