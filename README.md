# FoodBridge AI

An intelligent platform connecting food donors with verified recipients through NGOs, powered by AI matching and hybrid database architecture.

## ✨ Features

- **🤖 AI-Powered Matching**: Smart algorithms connect donors with nearby organizations
- **💬 Gemini AI Chatbot**: Interactive assistant for platform guidance
- **🗄️ Hybrid Database**: PostgreSQL (Supabase) + Firebase Realtime Database
- **🗺️ Real-time Tracking**: Live donation monitoring with Google Maps
- **👥 Multi-role Support**: Donors, NGOs/Receivers, and Administrators
- **� Analytics Dashboard**: Comprehensive insights and metrics
- **📱 Responsive Design**: Works seamlessly across all devices

## 🏗️ Tech Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- React 18
- Tailwind CSS + shadcn/ui
- Recharts
- Google Maps API

### Backend & Database
- PostgreSQL (Supabase)
- Firebase Realtime Database
- NextAuth.js
- Google Gemini AI
- Next.js API Routes

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm
- Supabase account
- Firebase project
- Google Gemini API key
- Google Maps API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Pratyush038/FoodBridge-AI.git
   cd FoodBridge-AI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create `.env.local` file:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # Firebase
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=your-database-url
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   
   # Google Services
   GEMINI_API_KEY=your-gemini-api-key
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-maps-api-key
   
   # NextAuth
   NEXTAUTH_SECRET=your-nextauth-secret
   NEXTAUTH_URL=http://localhost:3000
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

4. **Set up databases**
   
   - **Supabase**: Run migrations from `supabase/migrations/`
   - **Firebase**: Enable Realtime Database in Firebase Console

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Open browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📊 Database Architecture

FoodBridge AI uses a hybrid database approach:

- **PostgreSQL (Supabase)**: Structured data (users, donations, requests, transactions)
- **Firebase**: Real-time features (chat, notifications, activity feeds)

For detailed architecture, see [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md)

## 🗂️ Project Structure

```
FoodBridgeAI/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── donor/             # Donor dashboard
│   ├── receiver/          # NGO dashboard
│   ├── admin/             # Admin panel
│   └── ...
├── components/            # React components
│   ├── ui/               # UI components (shadcn)
│   └── ...
├── lib/                   # Services & utilities
│   ├── supabase-service.ts
│   ├── firebase-service.ts
│   ├── ai-matching-engine.ts
│   ├── gemini-service.ts
│   ├── user-service.ts
│   └── utils.ts
├── supabase/
│   └── migrations/       # Database migrations
└── ...
```

## 🎯 Key Features

### For Donors
- Register and create profile
- Upload food donations with details
- View AI-matched recipient requests
- Track donation history
- Real-time chat with NGOs

### For NGOs/Receivers
- Register organization
- Post food requirements
- Browse available donations
- Manage pickups
- Track organization statistics

### For Administrators
- System-wide analytics
- User management
- Monitor transactions
- Generate reports

## 🤖 AI Matching Engine

The AI matching algorithm considers:

- Food type compatibility (25%)
- Location proximity (30%)
- Quantity matching (20%)
- Request urgency (multiplier)
- Donor reliability (15%)
- NGO rating (10%)

## 📄 API Routes

### Core Endpoints
- `/api/donors` - Donor management
- `/api/ngos` - NGO management
- `/api/food-items` - Food donation CRUD
- `/api/requests` - Food requirement CRUD
- `/api/transactions` - Transaction management
- `/api/feedback` - Feedback system
- `/api/chatbot` - AI chatbot interface
- `/api/analytics` - Dashboard analytics

## 🧪 Testing

```bash
npm run test:integration
```

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

Built with ❤️ for reducing food waste and fighting hunger

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
