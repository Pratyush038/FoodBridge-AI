# FoodBridge AI Backend

A robust Node.js/Express.js backend with PostgreSQL database for the FoodBridge AI platform.

## Features

- **RESTful API** with Express.js
- **PostgreSQL Database** with connection pooling
- **Firebase Authentication** integration
- **Role-based Access Control** (donor, receiver, admin)
- **Input Validation** with express-validator
- **Rate Limiting** and security middleware
- **Database Migrations** and seeding
- **Comprehensive Error Handling**
- **API Documentation** ready endpoints

## Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Set up Environment Variables
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/foodbridge_db

# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

### 3. Set up PostgreSQL Database

#### Option A: Local PostgreSQL
1. Install PostgreSQL on your system
2. Create a database: `createdb foodbridge_db`
3. Update `DATABASE_URL` in `.env`

#### Option B: Cloud Database (Recommended)
Use a cloud provider like:
- **Supabase** (free tier available)
- **Railway** (free tier available)
- **Neon** (free tier available)
- **AWS RDS**
- **Google Cloud SQL**

### 4. Run Database Migrations
```bash
npm run migrate
```

### 5. Seed Sample Data (Optional)
```bash
npm run seed
```

### 6. Start the Server
```bash
# Development
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register/update user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Donations
- `POST /api/donations` - Create donation
- `GET /api/donations/my-donations` - Get user's donations
- `GET /api/donations/available` - Get available donations
- `PATCH /api/donations/:id/status` - Update donation status
- `GET /api/donations/all` - Get all donations (admin)
- `GET /api/donations/analytics` - Get donation analytics (admin)

### Requirements
- `POST /api/requirements` - Create requirement
- `GET /api/requirements/my-requirements` - Get user's requirements
- `GET /api/requirements/active` - Get active requirements
- `PATCH /api/requirements/:id/status` - Update requirement status
- `GET /api/requirements/all` - Get all requirements (admin)
- `GET /api/requirements/analytics` - Get requirement analytics (admin)

### Matches
- `POST /api/matches` - Create match
- `GET /api/matches/my-matches` - Get user's matches
- `PATCH /api/matches/:id/status` - Update match status
- `GET /api/matches/all` - Get all matches (admin)

### Analytics
- `GET /api/analytics` - Get comprehensive analytics (admin)
- `GET /api/analytics/my-stats` - Get user-specific stats

## Database Schema

### Users Table
- `uid` (VARCHAR, PRIMARY KEY) - Firebase UID
- `email` (VARCHAR, UNIQUE) - User email
- `name` (VARCHAR) - User name
- `role` (VARCHAR) - User role (donor/receiver/admin)
- `organization_name` (VARCHAR) - Organization name
- `location` (JSONB) - User location data
- `verified` (BOOLEAN) - Verification status
- `created_at`, `updated_at` (TIMESTAMP)

### Donations Table
- `id` (UUID, PRIMARY KEY) - Donation ID
- `donor_id` (VARCHAR, FK) - Reference to users.uid
- `donor_name` (VARCHAR) - Donor name
- `food_type` (VARCHAR) - Type of food
- `quantity`, `unit` (VARCHAR) - Amount and unit
- `description` (TEXT) - Description
- `location` (JSONB) - Pickup location
- `pickup_time`, `expiry_date` (TIMESTAMP) - Time constraints
- `image_url` (TEXT) - Food image URL
- `status` (VARCHAR) - pending/matched/completed/expired
- `matched_with`, `matched_at` - Match information
- `created_at`, `updated_at` (TIMESTAMP)

### Requirements Table
- `id` (UUID, PRIMARY KEY) - Requirement ID
- `receiver_id` (VARCHAR, FK) - Reference to users.uid
- `receiver_name` (VARCHAR) - Receiver name
- `organization_name` (VARCHAR) - Organization name
- `title` (VARCHAR) - Requirement title
- `food_type` (VARCHAR) - Type of food needed
- `quantity`, `unit` (VARCHAR) - Amount and unit
- `urgency` (VARCHAR) - high/medium/low
- `description` (TEXT) - Description
- `location` (JSONB) - Delivery location
- `needed_by` (TIMESTAMP) - Deadline
- `serving_size` (VARCHAR) - Number of people served
- `status` (VARCHAR) - active/matched/fulfilled
- `matched_with`, `matched_at` - Match information
- `created_at`, `updated_at` (TIMESTAMP)

### Matches Table
- `id` (UUID, PRIMARY KEY) - Match ID
- `donation_id` (UUID, FK) - Reference to donations.id
- `requirement_id` (UUID, FK) - Reference to requirements.id
- `donor_id`, `receiver_id` (VARCHAR, FK) - User references
- `status` (VARCHAR) - pending/confirmed/completed/cancelled
- `distance` (DECIMAL) - Distance between locations
- `match_score` (DECIMAL) - AI matching score
- `created_at`, `updated_at` (TIMESTAMP)

## Security Features

- **Firebase Authentication** - Secure user authentication
- **JWT Token Verification** - API endpoint protection
- **Role-based Access Control** - Different permissions per role
- **Input Validation** - Request data validation
- **Rate Limiting** - API abuse prevention
- **CORS Configuration** - Cross-origin request control
- **Helmet.js** - Security headers
- **SQL Injection Prevention** - Parameterized queries

## Development

### Running Tests
```bash
npm test
```

### Database Operations
```bash
# Run migrations
npm run migrate

# Seed database
npm run seed

# Reset database (drop and recreate)
npm run db:reset
```

### Monitoring
- Health check endpoint: `GET /health`
- Request logging with Morgan
- Error tracking and reporting

## Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=your-production-database-url
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-service-account-email
FRONTEND_URL=https://your-frontend-domain.com
```

### Deployment Platforms
- **Railway** - Easy deployment with PostgreSQL
- **Heroku** - Classic platform with add-ons
- **Vercel** - Serverless functions
- **AWS/GCP/Azure** - Full cloud deployment

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify database server is running
   - Check firewall/network settings

2. **Firebase Authentication Errors**
   - Verify Firebase service account credentials
   - Check FIREBASE_PROJECT_ID matches your project
   - Ensure private key format is correct

3. **CORS Errors**
   - Update FRONTEND_URL in environment variables
   - Check CORS configuration in server.js

4. **Migration Errors**
   - Ensure database exists and is accessible
   - Check user permissions
   - Verify SQL syntax in migration files

### Logs and Debugging
- Enable debug mode: `DEBUG=* npm run dev`
- Check server logs for detailed error information
- Use database query logging for SQL debugging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.