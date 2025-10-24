# FoodBridge AI

FoodBridge AI is an intelligent platform that connects surplus food providers, such as restaurants, grocers, and event organisers, with verified recipients through a network of NGOs, shelters, and community kitchens. Powered by automation, AI-based matching, and hybrid database architecture, it ensures timely, efficient, and equitable food distribution, reducing waste and fighting hunger at scale.

## 🌟 Key Features

- **🤖 AI-Powered Matching**: Smart algorithms connect donors with nearby organizations using machine learning
- **💬 Gemini AI Chatbot**: Interactive assistant for queries about donations, availability, and matching
- **🗄️ Hybrid Database Architecture**: 
  - **Supabase (PostgreSQL)**: Structured data with ACID compliance
  - **Firebase**: Real-time updates, chat, and live notifications
- **📊 Advanced DBMS Features**: 
  - Stored procedures for complex operations
  - Triggers for automatic status updates
  - Views for analytics and reporting
- **🗺️ Real-time Tracking**: Monitor donations with live updates and geolocation
- **👥 Multi-role Support**: Donors, NGOs/receivers, and administrators
- **📈 Analytics Dashboard**: Comprehensive insights and performance metrics
- **📱 Mobile Responsive**: Works seamlessly on all devices

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│              Frontend (Next.js + React)              │
│  Donor Dashboard | NGO Dashboard | Admin Panel      │
│  AI Chatbot | Real-time Chat | Analytics            │
└──────────────┬──────────────────────────────────────┘
               │
        API Routes (TypeScript)
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌─────────────┐     ┌─────────────┐
│  Supabase   │     │  Firebase   │
│ (PostgreSQL)│     │   (NoSQL)   │
├─────────────┤     ├─────────────┤
│ • Donors    │     │ • Chat      │
│ • NGOs      │     │ • Logs      │
│ • Food Items│     │ • Updates   │
│ • Requests  │     │ • AI Cache  │
│ • Trans.    │     └─────────────┘
│ • Feedback  │
│ • Triggers  │
│ • Views     │
│ • Functions │
└─────────────┘
```

## 📋 Lab Requirements Compliance

✅ **5-6 Entities**: Donors, NGOs, Food Items, Requests, Transactions, Feedback  
✅ **SQL Database**: Supabase (PostgreSQL) with proper schema, constraints, and relationships  
✅ **NoSQL Database**: Firebase Realtime Database for real-time features  
✅ **DBMS Concepts**: Stored procedures, triggers, views, RLS policies  
✅ **Innovative Component**: AI-based matching engine with ML algorithms  
✅ **Backend**: Next.js API routes (TypeScript) - No PHP  
✅ **Additional**: Gemini AI chatbot for enhanced user experience

## 🚀 Tech Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **UI Library**: React 18
- **Styling**: Tailwind CSS + shadcn/ui components
- **Charts**: Recharts
- **Maps**: Google Maps Platform (Maps JavaScript API & Places API)

### Backend & Database
- **SQL Database**: Supabase (PostgreSQL)
- **NoSQL Database**: Firebase Realtime Database
- **Authentication**: NextAuth.js with Google OAuth
- **AI**: Google Gemini API for chatbot
- **API**: Next.js API Routes (TypeScript)

### DevOps & Tools
- **Version Control**: Git + GitHub
- **Package Manager**: npm
- **Testing**: Custom integration tests
- **Deployment**: Vercel (recommended)

## 🎯 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (free tier)
- Firebase project (free tier)
- Google Gemini API key
- Google OAuth credentials (optional)

### Quick Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Pratyush038/FoodBridge-AI
   cd FoodBridge-AI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy and edit `.env.local`:
   ```bash
   # See SETUP_GUIDE.md for detailed instructions
   
   # Supabase (SQL Database)
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # Firebase (NoSQL Database)
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=your-database-url
   # ... other Firebase config
   
   # Gemini AI
   GEMINI_API_KEY=your-gemini-api-key
   
   # NextAuth
   NEXTAUTH_SECRET=your-secret-key
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Set up databases**
   
   ```bash
   # See SETUP_GUIDE.md for step-by-step instructions
   # 1. Create Supabase project and run migration
   # 2. Configure Firebase Realtime Database
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Test the integration**
   ```bash
   npm run test:integration
   ```

7. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📚 Documentation

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)**: Complete setup instructions
- **[API Documentation](#api-routes)**: API endpoints reference
- **Database Schema**: See `supabase/migrations/001_initial_schema.sql`

## 🗂️ Database Schema

### SQL Entities (Supabase)

1. **donors** - Donor profiles with tier and reliability metrics
2. **ngos** - NGO/food bank profiles with capacity and ratings
3. **food_items** - Available food donations with expiry tracking
4. **requests** - Food requests from NGOs with urgency levels
5. **transactions** - Donation fulfillment records with match scores
6. **feedback** - Ratings and reviews for quality assurance

### Views & Analytics

- `weekly_donation_report` - Aggregated weekly statistics
- `donor_performance` - Donor rankings and metrics
- `ngo_activity` - NGO impact and activity

### Stored Procedures

- `update_donor_tier()` - Calculate donor tier based on donations
- `calculate_match_score()` - AI-assisted matching algorithm
- `get_nearby_requests()` - Geospatial query for proximity

### Triggers

- Auto-update timestamps on modifications
- Auto-expire food items past expiry date
- Auto-update transaction status
- Auto-increment donation/request counters

### NoSQL Collections (Firebase)

- **donation_logs** - Real-time activity tracking
- **chats/{transactionId}** - Donor-NGO messaging
- **live_updates** - Push notifications
- **ai_predictions** - Cached AI matching results

## 🔌 API Routes

### Donor Management
- `GET /api/donors?userId={id}` - Get donor by user ID
- `POST /api/donors` - Create new donor
- `PUT /api/donors?id={id}` - Update donor profile

### NGO Management
- `GET /api/ngos?userId={id}` - Get NGO by user ID
- `POST /api/ngos` - Create new NGO
- `PUT /api/ngos?id={id}` - Update NGO profile

### Food Items
- `GET /api/food-items?available=true` - Get available food items
- `GET /api/food-items?donorId={id}` - Get donor's food items
- `POST /api/food-items` - Create food item
- `PUT /api/food-items?id={id}` - Update food item
- `DELETE /api/food-items?id={id}` - Delete food item

### Requests
- `GET /api/requests?active=true` - Get active requests
- `GET /api/requests?ngoId={id}` - Get NGO's requests
- `GET /api/requests?lat={lat}&lng={lng}` - Get nearby requests
- `POST /api/requests` - Create request
- `PUT /api/requests?id={id}` - Update request

### Transactions
- `GET /api/transactions?donorId={id}` - Get donor transactions
- `GET /api/transactions?ngoId={id}` - Get NGO transactions
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions?id={id}` - Update transaction

### AI Chatbot
- `POST /api/chatbot` - Send message to Gemini AI
- `GET /api/chatbot/suggestions?role={role}` - Get suggested questions

### Analytics
- `GET /api/analytics` - Get dashboard statistics
- `GET /api/analytics?type=weekly-report` - Get weekly report
- `GET /api/analytics?type=donor-performance` - Get donor rankings
- `GET /api/analytics?type=ngo-activity` - Get NGO activity

### Feedback
- `POST /api/feedback` - Submit feedback
- `GET /api/feedback?transactionId={id}` - Get transaction feedback

## 🎭 Features by Role

### 🍽️ Donors
- Register and create donor profile
- Upload food donations with details and images
- View AI-matched NGO requests nearby
- Track donation history and tier progression
- Real-time chat with NGOs
- View impact analytics

### 🏢 NGOs/Receivers
- Register and create NGO profile
- Post food requirements with urgency levels
- Browse available donations with AI matching
- Manage pickup confirmations
- Real-time chat with donors
- View organization statistics and ratings

### 👨‍💼 Administrators
- System-wide analytics dashboard
- User verification and management
- Monitor all transactions
- View weekly/monthly reports
- Access donor and NGO performance metrics

## 🤖 AI Features

### Matching Algorithm
The AI matching engine uses weighted scoring across multiple factors:

- **Food Type Match** (25%): Exact or similar food type matching
- **Location Proximity** (30%): Distance-based scoring using Haversine formula
- **Quantity Match** (20%): Compatibility of donation and request quantities
- **Urgency Factor** (multiplier): High/medium/low urgency weighting
- **Donor History** (15%): Reliability and consistency scoring
- **Receiver History** (10%): NGO rating and responsiveness

Results are cached in Firebase for real-time access and stored in Supabase for analytics.

### Gemini AI Chatbot
Context-aware conversational assistant that:
- Answers questions about the platform
- Provides real-time donation availability
- Explains matching results
- Offers statistics and insights
- Guides users through processes
- Maintains conversation context

## 🧪 Testing

### Run Integration Tests

```bash
npm run test:integration
```

This will test:
- Environment variable configuration
- Supabase connection
- Firebase connection  
- API endpoint availability
- Chatbot functionality
- Database schema setup

### Manual Testing Checklist

- [ ] User registration (donor and NGO)
- [ ] Food donation creation
- [ ] Request creation
- [ ] AI matching visualization
- [ ] Transaction creation and status updates
- [ ] Real-time chat functionality
- [ ] Chatbot queries
- [ ] Analytics dashboard
- [ ] Feedback submission

## 📦 Project Structure

```
FoodBridgeAI/
├── app/                        # Next.js app directory
│   ├── api/                    # API routes
│   │   ├── donors/            # Donor CRUD
│   │   ├── ngos/              # NGO CRUD
│   │   ├── food-items/        # Food item CRUD
│   │   ├── requests/          # Request CRUD
│   │   ├── transactions/      # Transaction CRUD
│   │   ├── feedback/          # Feedback CRUD
│   │   ├── chatbot/           # Gemini AI chatbot
│   │   └── analytics/         # Analytics endpoints
│   ├── donor/                 # Donor dashboard
│   ├── receiver/              # NGO dashboard
│   ├── admin/                 # Admin panel
│   └── ...
├── components/                # React components
│   ├── ui/                   # shadcn/ui components
│   ├── ai-matching-dashboard.tsx
│   ├── food-upload-form.tsx
│   ├── requirements-form.tsx
│   └── ...
├── lib/                       # Service layer
│   ├── supabase.ts           # Supabase client
│   ├── supabase-service.ts   # SQL CRUD operations
│   ├── firebase.ts           # Firebase client
│   ├── firebase-realtime-service.ts # NoSQL operations
│   ├── ai-matching-engine.ts # AI matching logic
│   ├── gemini-service.ts     # Chatbot service
│   ├── database.types.ts     # TypeScript types
│   └── ...
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql # Database schema
├── scripts/
│   └── test-integration.js   # Integration tests
├── SETUP_GUIDE.md            # Detailed setup instructions
└── README.md                 # This file
```
