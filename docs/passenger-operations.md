# Passenger Operations

Complete guide to passenger ride requests, journey management, and transportation services.

## Ride Request Creation

### Create Passenger Request
**Endpoint**: `POST /api/passengerRequest/createRequest`
**Description**: Create a new transportation request
**Authentication**: Passenger token required

**Request Body:**
```json
{
    "passengerRequestBatchId": "batch-uuid-here",
    "numberOfVehicles": 1,
    "shippingDate": "2026-01-31T10:00:00.000Z",
    "deliveryDate": "2026-02-01T10:00:00.000Z",
    "shippingCost": 150.00,
    "shippableItemQtyInQuintal": 2.5,
    "shippableItemName": "Construction Materials",
    "shipperPhoneNumber": "+2519221124667",
    "requestType": "CARGO",
    "originLocation": {
        "latitude": 9.1450,
        "longitude": 38.7525,
        "description": "Location A"
    },
    "destination": {
        "latitude": 9.0350,
        "longitude": 38.7525,
        "description": "Location B"
    },
    "vehicle": {
        "vehicleTypeUniqueId": "vehicle-type-uuid-here"
    }
}
```

### Batch Requests
Support for multiple vehicles in single request:
- `numberOfVehicles`: Number of vehicles needed
- `passengerRequestBatchId`: Groups related requests
- Individual tracking for each vehicle

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

**Request Body:**
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
