# Setup & Initialization

Database Management and initial system setup for the Transport Management System.

## Database Setup

### 1. Drop All Tables
**Endpoint**: `DELETE /api/admin/dropAllTables`
**Description**: Drops all database tables. Use with caution as this will delete all data.
**Authentication**: No token required for development environment, and it will be disabled for production environment
**Response**:
```json
{
    "message": "success",
    "data": "All tables dropped successfully"
}
```

### 2. Create Tables
**Endpoint**: `POST /api/admin/createTable`
**Description**: Creates all necessary database tables.
**Authentication**: No token required for development environment, and it will be disabled for production environment
**Response**:
```json
{
    "message": "success",
    "data": "Tables created successfully"
}
```

### 3. Install Predefined Data
**Endpoint**: `POST /api/admin/installPreDefinedData`
**Description**: Populates the database with initial required data (roles, vehicle types, etc.).
**Authentication**: Super Admin token required
**Response**:
```json
{
  "message": "Predefined data installed successfully"
}
```

## Initial System Configuration

### Super Admin Setup
After installing predefined data, create the initial Super Admin user:

1. **Create Super Admin User** via `POST /api/admin/createUserByAdminOrSuperAdmin`
2. **Verify OTP** via `POST /api/user/verifyUserByOTP`
3. **Store JWT Token** for subsequent admin operations

### Environment Verification
Ensure all required environment variables are configured before starting:

- Database connection settings
- JWT secret key
- FTP credentials for file uploads
- SMS service configuration
- Firebase configuration (optional)

### Health Checks
- **Server Health**: `GET /` - Returns server status
- **Database Health**: Verify database connection
- **External Services**: Test SMS, FTP, and other integrations

## Development vs Production Setup

### Development Environment
- Full error logging enabled
- Relaxed CORS policies
- Development database
- Debug mode active
- All admin endpoints accessible

### Production Environment
- Error masking for security
- Strict CORS policies
- Production database
- Rate limiting enabled
- SSL/TLS required
- Sensitive endpoints disabled

## Quick Setup Checklist

- [ ] Copy `.env.sample` to `.env`
- [ ] Configure database settings
- [ ] Set JWT secret key
- [ ] Configure FTP credentials
- [ ] Set up SMS service
- [ ] Run database setup commands
- [ ] Create Super Admin user
- [ ] Test API endpoints
- [ ] Verify file uploads
- [ ] Check real-time features

## Troubleshooting Setup Issues

### Database Connection Issues
- Verify MySQL server is running
- Check database credentials in `.env`
- Ensure database exists or create it manually

### Environment Variable Errors
- Ensure `.env` file exists in project root
- Check variable naming (case-sensitive)
- Restart server after changing `.env`

### Permission Issues
- Verify file system permissions for uploads directory
- Check FTP account permissions
- Ensure database user has necessary privileges
