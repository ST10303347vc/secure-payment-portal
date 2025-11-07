# Payment Portal Backend

A secure Node.js/Express backend API for the Payment Portal with Firebase integration, JWT authentication, and comprehensive security features.

## Features

- **Firebase Integration**: Secure Firebase Admin SDK integration with environment variables
- **JWT Authentication**: Access and refresh token management
- **Security**: CORS, rate limiting, CSRF protection, security headers
- **Logging**: Structured logging with Winston
- **Encryption**: Data encryption capabilities
- **Email Integration**: Email service integration
- **Payment Gateway**: Payment processing capabilities
- **Banking API**: Banking system integration

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **Firebase Project** with Admin SDK enabled
- **Git** for version control

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-backend-repository-url>
cd Backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Setup

#### Create a Firebase Project
1. Go to https://console.firebase.google.com/
2. Create a new project or use an existing one
3. Enable Firestore Database
4. Go to Project Settings → Service Accounts
5. Generate a new private key (downloads a JSON file)

#### Extract Firebase Credentials
From your downloaded Firebase service account JSON file, extract the following values:
- `project_id`
- `private_key`
- `client_email`
- `client_id`
- Other authentication URLs (optional, defaults provided)

### 4. Environment Configuration

#### Create Environment File
Copy the example environment file and configure it:

```bash
cp .env.example .env
```

#### Configure Required Environment Variables

Edit the `.env` file with your specific values:

```env
# Application Configuration
NODE_ENV=development
PORT=5001
API_VERSION=v1

# Firebase Configuration (REQUIRED)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
# Optional Firebase URLs
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/secure_payment_portal
DB_NAME=secure_payment_portal

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-change-this-in-production-min-32-chars
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
CSRF_SECRET=your-super-secret-csrf-key-change-this-in-production-min-32-chars

# Encryption Configuration
ENCRYPTION_KEY=your-32-character-encryption-key-here
ENCRYPTION_IV=your-16-character-iv-here

# CORS Configuration
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Payment Gateway Configuration (placeholder)
PAYMENT_GATEWAY_API_KEY=your-payment-gateway-api-key
PAYMENT_GATEWAY_SECRET=your-payment-gateway-secret
PAYMENT_GATEWAY_WEBHOOK_SECRET=your-webhook-secret

# Banking API Configuration (placeholder)
BANKING_API_URL=https://api.bankingprovider.com
BANKING_API_KEY=your-banking-api-key
BANKING_API_SECRET=your-banking-api-secret
```

**⚠️ Important Notes:**
- Replace all placeholder values with your actual credentials
- The `FIREBASE_PRIVATE_KEY` must include the full private key with `\n` characters for line breaks
- Never commit your `.env` file to version control
- Generate strong, unique secrets for production

### 5. Build the Application

```bash
npm run build
```

### 6. Start the Server

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

The server starts on the port specified in your `.env` file (default: 5001). Health check: `http://localhost:<PORT>/health`.

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run linting
- `npm run lint:fix` - Fix lint issues
- `npm run seed:employees` - Seed demo employee data

## Security Best Practices

### Environment Variables
- Never commit `.env` files to version control
- Use different credentials for development and production
- Regularly rotate secrets and keys
- Use strong, randomly generated secrets (minimum 32 characters)

### Firebase Security
- Enable Firebase Security Rules
- Restrict API access to your domain
- Monitor Firebase usage and logs
- Use Firebase Authentication for user management

### Production Deployment
- Set `NODE_ENV=production`
- Use HTTPS only
- Configure proper CORS origins
- Enable rate limiting
- Set up monitoring and logging
- Use environment-specific Firebase projects

## Deployment

### Environment Setup for Production

1. **Create Production Environment File**
   ```bash
   cp .env.example .env.production
   ```

2. **Configure Production Variables**
   - Use production Firebase project
   - Set strong, unique secrets
   - Configure production database URLs
   - Set appropriate CORS origins

3. **Platform-Specific Deployment**

#### Heroku
```bash
# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set FIREBASE_PROJECT_ID=your-prod-project-id
heroku config:set FIREBASE_PRIVATE_KEY="your-private-key"
# ... set all other environment variables

# Deploy
git push heroku main
```

#### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Docker
```bash
# Build and run with Docker
docker build -t payment-portal-backend .
docker run -p 5001:5001 --env-file .env.production payment-portal-backend
```

## Project Structure

```
Backend/
├── src/
│   ├── app.ts            # App bootstrap and server start
│   ├── config/           # Configuration files
│   │   ├── index.ts      # App, security, db, cors, logging config
│   │   ├── firebase.ts   # Firebase Admin initialization
│   │   └── database.ts   # MongoDB connection
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Express middleware & security
│   ├── models/           # Mongoose models
│   ├── routes/           # API routes
│   ├── scripts/          # Utility/seed scripts
│   ├── types/            # TypeScript types/interfaces
│   ├── utils/            # Utility functions (logger, helpers)
│   └── server.ts         # Server entry
├── dist/                 # Compiled JavaScript (generated)
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore rules
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md             # This file
```

## Troubleshooting

### Common Issues

#### Firebase Connection Issues
```
Error: Failed to initialize Firebase
```
**Solution:** Check your Firebase environment variables. Ensure the private key is properly formatted with `\n` characters.

#### Port Already in Use
```
Error: listen EADDRINUSE :::5001
```
**Solution:** Change the `PORT` in your `.env` file or stop the process using the port.

#### Environment Variables Not Loading
```
Error: Missing required environment variable: JWT_SECRET
```
**Solution:** Ensure your `.env` file exists at `Backend/.env` and all required variables are set. Required at minimum: `JWT_SECRET`, `ENCRYPTION_KEY`, `CSRF_SECRET`, and Firebase variables.

#### MongoDB Connection Issues
```
Database connection failed: ECONNREFUSED
```
**Solution:** Verify `MONGODB_URI` points to a running MongoDB instance and that network access is allowed.

### Debug Mode
Enable verbose logging by setting:
```env
NODE_ENV=development
LOG_LEVEL=debug
```

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify all environment variables are correctly set
3. Ensure Firebase project is properly configured
4. Check server logs for detailed error messages