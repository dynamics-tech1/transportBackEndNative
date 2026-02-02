# Finance Management

Complete guide to payment processing, deposits, balances, and financial operations.

## User Deposits

### Create Deposit Request
**Endpoint**: `POST /api/finance/userDeposit`
**Description**: Submit a deposit request
**Authentication**: User token required

**Request Body:**
```json
{
    "amount": 1000.00,
    "depositSourceUniqueId": "bank-transfer-uuid"
}
```

### View Deposit History
**Endpoint**: `GET /api/finance/userDeposit`
**Description**: Get user's deposit history
**Authentication**: User token required

**Query Parameters:**
- `userUniqueId`: User UUID or "self"
- `depositStatus`: Filter by status (approved, requested, rejected)

### Approve Deposit (Admin)
**Endpoint**: `PUT /api/finance/userDeposit/{userDepositUniqueId}`
**Description**: Approve pending deposit
**Authentication**: Admin token required

**Request Body:**
```json
{
    "depositStatus": "approved",
    "acceptRejectReason": "Deposit verified and approved"
}
```

## Balance Management

### Check User Balance
**Endpoint**: `GET /api/finance/balance`
**Description**: Get current account balance
**Authentication**: User token required

**Response:**
```json
{
    "message": "success",
    "data": {
        "userUniqueId": "user-uuid",
        "currentBalance": 2500.00,
        "availableBalance": 2400.00,
        "pendingDeposits": 500.00,
        "lastUpdated": "2026-01-31T12:00:00.000Z"
    }
}
```

### Balance Transactions
**Endpoint**: `GET /api/finance/transactions`
**Description**: Get balance transaction history
**Authentication**: User token required

## Payment Processing

### Process Payment
**Endpoint**: `POST /api/payment/process`
**Description**: Process payment for journey
**Authentication**: User token required

**Request Body:**
```json
{
    "journeyId": "journey-uuid",
    "amount": 150.00,
    "paymentMethod": "wallet"
}
```

### Payment Methods
Supported payment methods:
- Wallet balance
- Bank transfer
- Mobile money
- Cash on delivery

## Financial Reports

### User Financial Summary
**Endpoint**: `GET /api/finance/summary`
**Description**: Get financial overview
**Authentication**: User token required

### Driver Earnings
**Endpoint**: `GET /api/driver/earnings`
**Description**: Get driver earning history
**Authentication**: Driver token required

### Admin Financial Reports
**Endpoint**: `GET /api/admin/financial-reports`
**Description**: System-wide financial analytics
**Authentication**: Admin token required

## Balance Effects

### Deposit Approval
- **User Balance**: + deposit amount
- **System**: Records transaction
- **Notifications**: User notified of approval

### Payment Deduction
- **User Balance**: - payment amount
- **Driver Balance**: + earnings (after commission)
- **System**: - commission fee

### Commission Structure
- Platform commission: 10-15% of fare
- Driver earnings: 85-90% of fare
- Processing fees: Additional charges

## Financial Security

### Transaction Validation
- Amount limits and validation
- Fraud detection algorithms
- Duplicate transaction prevention
- Real-time balance checks

### Audit Trail
- All financial transactions logged
- Balance changes tracked
- Admin approval records maintained
- Regulatory compliance reporting

## Currency & Localization

### Supported Currencies
- Ethiopian Birr (ETB) - primary
- USD support for international users

### Currency Conversion
- Real-time exchange rates
- Automatic conversion for payments
- Multi-currency wallet support

## Financial Compliance

### Regulatory Requirements
- Transaction reporting
- KYC compliance for large deposits
- Anti-money laundering checks
- Financial audit trails

### Data Retention
- Transaction history: 7 years
- Financial reports: Indefinite
- Audit logs: 10 years

## Integration Points

### Payment Gateway Integration
- Multiple payment providers
- Secure payment processing
- Real-time transaction updates
- Failed payment handling

### Banking System Integration
- Direct bank transfers
- Account verification
- Automated reconciliation
- Financial institution APIs
