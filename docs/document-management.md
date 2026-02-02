# Document Management

Complete guide to document upload, verification, and management system.

## Document Types

### Required Documents by Role

**Driver Documents:**
- Driver's License
- Vehicle Registration (Librea)
- Vehicle Insurance
- Profile Photo

**Passenger Documents:**
- ID Card (optional)
- Profile Photo (optional)

## Document Upload Process

### Upload Document
**Endpoint**: `POST /api/documents/upload`
**Description**: Upload a document file
**Authentication**: User token required

**Request Body (Form Data):**
```
documentType: "driversLicense"
file: [binary file data]
expirationDate: "2026-12-31"
fileNumber: "DL123456"
description: "Driver's license front and back"
```

### Get Document Status
**Endpoint**: `GET /api/documents/status`
**Description**: Check uploaded document statuses
**Authentication**: User token required

## Admin Document Review

### Get Pending Documents
**Endpoint**: `GET /api/admin/documents/pending`
**Description**: Get documents awaiting review
**Authentication**: Admin token required

### Approve/Reject Document
**Endpoint**: `PUT /api/admin/documents/{documentId}`
**Description**: Approve or reject a document
**Authentication**: Admin token required

**Request Body:**
```json
{
    "action": "ACCEPTED",
    "reason": "Document is valid and complete"
}
```

## Document Storage

### File Storage Security
- FTP server for secure file storage
- File type validation (PDF, JPEG, PNG only)
- File size limits (5MB maximum)
- Virus scanning before storage

### File Access
- Public URLs for approved documents
- Secure access for admin review
- Automatic cleanup of rejected documents

## Document Lifecycle

### Upload → Review → Approval Flow
1. **Upload**: User uploads document
2. **Validation**: System validates file type/size
3. **Storage**: File stored securely on FTP
4. **Review**: Admin reviews document
5. **Approval**: Document approved/rejected
6. **Notification**: User notified of decision

### Document Expiration
- Automatic expiration tracking
- Renewal reminders before expiry
- Re-upload required for expired documents

## Document Categories

### Verification Documents
- Government-issued ID cards
- Professional licenses
- Vehicle registrations

### Operational Documents
- Insurance certificates
- Vehicle permits
- Business licenses

### Profile Documents
- Profile photos
- Address proofs
- Bank statements
