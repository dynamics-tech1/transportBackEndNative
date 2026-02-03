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

### Cancel Passenger Request

**Endpoint**: `PUT /api/passengerRequest/cancelPassengerRequest/self`
**Description**: Cancels an active passenger request. Updates all related driver requests and journey decisions to cancelled status, sends notifications to affected drivers, and creates cancellation records.
**Authentication**: Passenger token required

**Request Body**:

```json
{
  "passengerRequestUniqueId": "0099014f-c59a-4945-a7b6-3aef2ab3048b",
  "cancellationReasonsTypeId": 10
}
```

**Success Response**:

```json
{
  "message": "success",
  "status": 7,
  "uniqueIds": {
    "passengerRequestUniqueId": "0099014f-c59a-4945-a7b6-3aef2ab3048b",
    "journeyDecisionUniqueIds": ["uuid-here", "uuid-here"],
    "driverRequestUniqueIds": ["uuid-here", "uuid-here"]
  },
  "totalRecords": {
    "totalCount": 4,
    "waitingCount": 0,
    "requestedCount": 0,
    "acceptedByDriverCount": 0,
    "acceptedByPassengerCount": 0,
    "journeyStartedCount": 0,
    "journeyCompletedCount": 0,
    "notSeenCompletedCount": 0,
    "notSeenCancelledByDriverCount": 0,
    "cancelledByPassengerCount": 1,
    "cancelledByDriverCount": 0,
    "cancelledByAdminCount": 0,
    "cancelledBySystemCount": 0,
    "notSeenCancelledByPassengerCount": 0,
    "notSeenNotSelectedInBidCount": 0,
    "notSeenRejectedByDriverCount": 0,
    "notSeenRejectedByPassengerCount": 0
  }
}
```

**Error Responses**:

- **400 Bad Request**: Missing required fields or invalid request status
- **401 Unauthorized**: Invalid or missing passenger token
- **403 Forbidden**: Not authorized to cancel this request
- **404 Not Found**: Passenger request not found
- **409 Conflict**: Request already cancelled or in terminal status
- **500 Internal Server Error**: Server error during cancellation

**Note**: Admin/Super Admin can cancel any request using `/api/passengerRequest/cancelPassengerRequest/:userUniqueId` where `:userUniqueId` is the target user's ID.

### Accept Driver Request (Selection in Bid)

**Endpoint**: `PUT /api/passenger/acceptDriverRequest`
**Description**: Allows a passenger to select and accept a driver's offer from multiple driver bids. Updates the selected driver's status to "accepted by passenger" and all other drivers' status to "not selected in bid".
**Authentication**: Passenger token required

**Request Body**:

```json
{
  "driverRequestUniqueId": "8f66482b-f0f0-4f94-9d7a-d7d0a6d2c894",
  "journeyDecisionUniqueId": "68ed97a0-a18d-4a92-b15e-808032f96bf3",
  "passengerRequestUniqueId": "f64ca621-8b44-4adc-92a9-dc0767542099"
}
```

**Success Response**:

```json
{
  "message": "success",
  "status": 4,
  "uniqueIds": {
    "passengerRequestUniqueId": "f64ca621-8b44-4adc-92a9-dc0767542099",
    "journeyDecisionUniqueId": "68ed97a0-a18d-4a92-b15e-808032f96bf3",
    "driverRequestUniqueId": "8f66482b-f0f0-4f94-9d7a-d7d0a6d2c894",
    "notSelectedDriverRequestUniqueIds": ["uuid-here", "uuid-here"],
    "notSelectedJourneyDecisionUniqueIds": ["uuid-here", "uuid-here"]
  },
  "totalRecords": {
    "totalCount": 4,
    "waitingCount": 0,
    "requestedCount": 0,
    "acceptedByDriverCount": 0,
    "acceptedByPassengerCount": 1,
    "journeyStartedCount": 0,
    "journeyCompletedCount": 0,
    "notSeenCompletedCount": 0,
    "notSeenCancelledByDriverCount": 0,
    "cancelledByPassengerCount": 0,
    "cancelledByDriverCount": 0,
    "cancelledByAdminCount": 0,
    "cancelledBySystemCount": 0,
    "notSeenCancelledByPassengerCount": 0,
    "notSeenNotSelectedInBidCount": 3,
    "notSeenRejectedByDriverCount": 0,
    "notSeenRejectedByPassengerCount": 0
  }
}
```

**Error Responses**:

- **400 Bad Request**: Missing required fields or invalid request status
- **401 Unauthorized**: Invalid or missing passenger token
- **403 Forbidden**: Not authorized to accept this request
- **404 Not Found**: Passenger request, driver request, or journey decision not found
- **409 Conflict**: Request not in appropriate status for acceptance or already processed
- **500 Internal Server Error**: Server error during acceptance

**Business Logic**:

- Updates selected driver status to `acceptedByPassenger` (4)
- Updates all other drivers to `notSelectedInBid` (14)
- Sends notifications to all affected drivers (accepted and rejected)
- Updates passenger request status to reflect selection
- Returns comprehensive status counts for frontend updates

### View Cancellation Notifications

**Endpoint**: `GET /api/passengerRequest/getCancellationNotifications?seenStatus=not seen by passenger yet`
**Description**: Retrieves cancellation notifications for a passenger, filtered by seen status. Used to display notifications when drivers cancel requests or when requests are cancelled by other means.
**Authentication**: Passenger token required

**Query Parameters**:

- `seenStatus`: Filter by notification status ("seen" | "not seen by passenger yet")
- `page`: Page number for pagination (optional, default: 1)
- `limit`: Number of results per page (optional, default: 10)

**Success Response**:

```json
{
  "message": "success",
  "data": [
    {
      "cancellationId": 25,
      "cancellationUniqueId": "uuid-here",
      "passengerRequestUniqueId": "f64ca621-8b44-4adc-92a9-dc0767542099",
      "driverRequestUniqueId": "8f66482b-f0f0-4f94-9d7a-d7d0a6d2c894",
      "journeyDecisionUniqueId": "68ed97a0-a18d-4a92-b15e-808032f96bf3",
      "cancellationReasonsTypeId": 2,
      "cancellationReason": "Driver cancelled due to emergency",
      "cancelledBy": "driver",
      "cancelledByUserUniqueId": "driver-uuid-here",
      "isSeenByPassenger": "not seen by passenger yet",
      "createdAt": "2026-02-02T16:30:00.000Z",
      "driver": {
        "fullName": "Driver Name",
        "phoneNumber": "+251922112480",
        "vehicleType": "Isuzu FSR",
        "licensePlate": "3-4322rfc"
      },
      "passengerRequest": {
        "originPlace": "Addis Ababa, Ethiopia",
        "destinationPlace": "Diredawa, Ethiopia",
        "shippableItemName": "Cement",
        "shippingCost": "45000.00"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 25,
    "itemsPerPage": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Error Responses**:

- **400 Bad Request**: Invalid query parameters
- **401 Unauthorized**: Invalid or missing passenger token
- **403 Forbidden**: Not authorized to view these notifications
- **500 Internal Server Error**: Server error during retrieval

**Use Cases**:

- Display notification badges for unseen cancellations
- Show cancellation history to passengers
- Filter between seen and unseen notifications
- Paginate through large notification lists

### Request Status Tracking

Journey status IDs and descriptions:

**Active Statuses (1-6):**

- **1: Waiting for driver** - Initial state when a passenger creates a transport request, waiting for drivers to respond and accept
- **2: Requested** - A passenger request has been sent or forwarded to a driver. The driver has received the request but has not yet responded
- **3: Accepted by Driver** - Driver has accepted the passenger request and provided their bidding price. A JourneyDecision record is created, linking the driver and passenger request
- **4: Accepted by Passenger** - Passenger has selected one driver from multiple drivers who accepted the request. This occurs when multiple drivers accepted (status 3), and the passenger chooses one driver's offer
- **5: Journey Started** - The actual journey has been initiated by the driver. This occurs after the passenger has accepted the driver (status 4), and the driver begins the transportation
- **6: Journey Completed** - The journey has been successfully completed by the driver. The transportation service has been fully delivered

**Terminal Statuses (7-15):**

- **7: Cancelled by Passenger** - Passenger has cancelled the entire transport request. This cancellation affects all drivers who were involved, and the entire shipment is cancelled
- **8: Rejected by Passenger** - Passenger has rejected a specific driver's offer after the driver accepted the request (status 3). This rejection only affects the specific driver that was rejected, and the passenger can still select other drivers who accepted the request
- **9: Cancelled by Driver** - Driver canceled the request after accepting it and providing their bidding price. This occurs after the driver has committed to participate in the bid (status 3 - acceptedByDriver), meaning a JourneyDecision record exists
- **10: Cancelled by Admin** - Admin has cancelled the request. This administrative cancellation can occur at various stages of the journey lifecycle
- **11: Completed by Admin** - Admin has manually marked the journey as completed. This administrative action is used when a journey needs to be marked as completed through administrative intervention
- **12: Cancelled by System** - System has automatically cancelled the request. This can occur due to system-level rules, timeout conditions, or other automated cancellation scenarios
- **13: No Answer from Driver** - Driver did not respond to the incoming request within the expected time. The request is then automatically forwarded to another available driver
- **14: Not Selected in Bid** - Driver had accepted the passenger request (status 3) and participated in the bid process, but the passenger selected a different driver. The driver's offer was not chosen during the bid selection
- **15: Rejected by Driver** - Driver rejected the incoming passenger request before accepting it. This occurs at the initial request stage (status 2 - requested), meaning the driver never accepted the request, did not provide a bidding price, and no JourneyDecision record was created

## Journey Tracking

### Track Active Journey

**Endpoint**: `GET /api/user/getPassengerRequest4allOrSingleUser?journeyStatusId=5,3`
**Description**: Get current active journeys (journey started or accepted by passenger)
**Authentication**: User token required

**Query Parameters:**

- `journeyStatusId`: Comma-separated status IDs (5=journeyStarted, 3=acceptedByPassenger)
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 10)
- `ownerUserUniqueId`: Filter by user (default: self)

**Response**:

```json
{
  "message": "success",
  "formattedData": [
    {
      "passengerRequest": {
        "journeyStatusId": 5,
        "originPlace": "Addis Ababa, Ethiopia",
        "destinationPlace": "Diredawa, Ethiopia",
        "shippableItemName": "Cement",
        "shippingCost": "45000.00"
      },
      "driverRequests": [
        {
          "driverRequestId": 15,
          "driverRequestUniqueId": "uuid-here",
          "fullName": "Driver Name",
          "phoneNumber": "+251922112480"
        }
      ],
      "decisions": [
        {
          "journeyDecisionUniqueId": "uuid-here",
          "decisionTime": "2026-02-02 16:49:39",
          "shippingCostByDriver": "50000.00"
        }
      ],
      "journey": {
        "journeyId": 25,
        "journeyUniqueId": "uuid-here",
        "journeyStartedAt": "2026-02-02T14:30:00.000Z"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 1,
    "itemsPerPage": 10
  }
}
```

### Journey History

**Endpoint**: `GET /api/user/getPassengerRequest4allOrSingleUser?journeyStatusId=6`
**Description**: View completed journey history
**Authentication**: User token required

**Query Parameters:**

- `journeyStatusId`: Status ID (6=journeyCompleted)
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 10)
- `ownerUserUniqueId`: Filter by user (default: self)
- `startDate`: Filter by start date (YYYY-MM-DD)
- `endDate`: Filter by end date (YYYY-MM-DD)
- `sortBy`: Sort field (createdAt, journeyStartedAt, etc.)
- `sortOrder`: Sort direction (asc/desc)

**Response**:

```json
{
  "message": "success",
  "formattedData": [
    {
      "passengerRequest": {
        "journeyStatusId": 6,
        "originPlace": "Addis Ababa, Ethiopia",
        "destinationPlace": "Diredawa, Ethiopia",
        "shippableItemName": "Cement",
        "shippingCost": "45000.00",
        "journeyCompletedAt": "2026-02-02T16:45:00.000Z"
      },
      "driverRequests": [
        {
          "driverRequestId": 15,
          "fullName": "Driver Name",
          "phoneNumber": "+251922112480"
        }
      ],
      "decisions": [
        {
          "journeyDecisionUniqueId": "uuid-here",
          "decisionTime": "2026-02-02 16:49:39",
          "shippingCostByDriver": "50000.00"
        }
      ],
      "journey": {
        "journeyId": 25,
        "journeyUniqueId": "uuid-here",
        "journeyStartedAt": "2026-02-02T14:30:00.000Z",
        "journeyCompletedAt": "2026-02-02T16:45:00.000Z"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 47,
    "itemsPerPage": 10
  }
}
```

**For passengers and drivers**, use `GET /api/user/getPassengerRequest4allOrSingleUser` with appropriate journey status filters.

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
