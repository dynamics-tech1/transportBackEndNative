# Environment Configuration

Required environment variables and configuration settings for the Transport Management System.

## Required Setup

1. Copy `.env.sample` to `.env`
2. Fill in all required values
3. Never commit `.env` to version control

## Database Configuration

```bash
DB_HOST=localhost                    # MySQL server hostname/IP
DB_USER=your_db_username             # MySQL username
DB_PASSWORD=your_db_password         # MySQL password
DB_DATABASE=transport_management     # Database name
DB_PORT=3306                        # MySQL port (default: 3306)
DB_CONNECT_TIMEOUT=60000            # Connection timeout in ms
```

Optional: For local MySQL socket connection (macOS with MAMP)
```bash
DB_SOCKET_PATH=/Applications/MAMP/tmp/mysql/mysql.sock
```

## Authentication & Security

```bash
SECRET_KEY=your_super_secret_jwt_key_here_minimum_32_characters  # JWT signing key
API_KEY=your_api_key_for_external_services                      # External API access key
```

## File Uploads & Storage

```bash
FTP_HOST=your-ftp-server.com        # FTP server for document uploads
FTP_USER=your-ftp-username          # FTP account username
FTP_PASSWORD=your-ftp-password      # FTP account password
FTP_UPLOADS_PATH=https://your-domain.com/uploads/  # Public URL for uploaded files
```

## Super Admin Setup

```bash
SUPER_ADMIN_FULL_NAME=System Administrator    # Initial admin name
SUPER_ADMIN_PHONE=+1234567890               # Admin phone number
SUPER_ADMIN_EMAIL=admin@yourdomain.com      # Admin email address
```

## External Services

### SMS Service (Africa's Talking)
```bash
SMS_TOKEN=your_sms_api_token
AFRO_BASE_URL=https://api.africastalking.com
SMS_SENDER=TRANSPORT
OTP_TEMPLATE=Your OTP code is: {code}
```

### Push Notifications (Firebase)
```bash
FCM_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"your-project-id"}'
```

### Redis Cache (Optional)
```bash
UPSTASH_REDIS_URL=redis://localhost:6379
```

## Application Settings

```bash
NODE_ENV=development    # Environment: development | staging | production
PORT=3000              # Server port
```

## Development vs Production

### Development Environment
- Full error logging enabled
- CORS restrictions relaxed
- Development database
- Debug mode active

### Production Environment
- Error masking for security
- Strict CORS policies
- Production database
- Rate limiting enabled
- SSL required

## Example Configuration Files

### Local Development (.env)
```bash
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_DATABASE=transport_dev
DB_PORT=3306

# JWT
SECRET_KEY=your_development_secret_key_here_make_it_long_and_secure

# FTP (Optional for local dev)
FTP_HOST=localhost
FTP_USER=ftpuser
FTP_PASSWORD=ftppass
FTP_UPLOADS_PATH=http://localhost:3000/uploads/

# SMS (Use test credentials)
SMS_TOKEN=test_token
AFRO_BASE_URL=https://api.sandbox.africastalking.com

# App
NODE_ENV=development
PORT=3000
```

### Production (.env)
```bash
# Database
DB_HOST=your-production-db-host.com
DB_USER=prod_user
DB_PASSWORD=secure_prod_password
DB_DATABASE=transport_prod
DB_PORT=3306

# JWT
SECRET_KEY=your_production_secret_key_here_make_it_very_long_and_secure

# FTP
FTP_HOST=your-ftp-server.com
FTP_USER=prod_ftp_user
FTP_PASSWORD=secure_ftp_password
FTP_UPLOADS_PATH=https://yourdomain.com/uploads/

# SMS
SMS_TOKEN=production_sms_token
AFRO_BASE_URL=https://api.africastalking.com

# App
NODE_ENV=production
PORT=3000
```

## Environment Variable Validation

The application will validate required environment variables on startup. Missing required variables will cause the server to fail with clear error messages.

### Required Variables
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`
- `SECRET_KEY`
- `NODE_ENV`

### Optional Variables
- `FTP_*` - File uploads disabled if not configured
- `SMS_*` - OTP features disabled if not configured
- `FCM_SERVICE_ACCOUNT_JSON` - Push notifications disabled if not configured
- `UPSTASH_REDIS_URL` - Caching disabled if not configured

## Security Best Practices

### Secret Management
- Never commit `.env` files to version control
- Use different secrets for each environment
- Rotate secrets regularly
- Use strong, random values for `SECRET_KEY`

### Database Security
- Use dedicated database users with minimal privileges
- Different databases for development, staging, and production
- Enable SSL/TLS for production database connections

### File Storage Security
- Use secure FTP (FTPS) in production
- Implement file type and size restrictions
- Scan uploaded files for malware
- Use CDN for file serving in production
