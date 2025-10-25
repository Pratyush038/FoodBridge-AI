# Database Architecture

## Overview

FoodBridge AI implements a **hybrid database architecture** combining **SQL (PostgreSQL)** and **NoSQL (Firebase)** to leverage the strengths of both paradigms for optimal performance and real-time capabilities.

## Database Systems

### PostgreSQL (via Supabase)
**Purpose:** Primary storage for structured, relational data

**Key Features:**
- ACID transactions
- Complex relationships with foreign keys
- Strong data consistency
- SQL query support

**Schema:**
```sql
- donors (donor profiles and metrics)
- ngos (NGO/receiver organizations)
- food_items (food donations)
- requests (food requirements)
- transactions (donation fulfillment records)
- feedback (ratings and reviews)
```

**Use Cases:**
- User accounts and profiles
- Food donation/request records
- Transaction history
- Analytics and reporting

### Firebase Realtime Database
**Purpose:** Real-time synchronization and flexible storage

**Key Features:**
- Real-time data sync across clients
- Flexible JSON structure
- Offline support with auto-sync
- Horizontal scalability

**Data Structure:**
```json
{
  "activity_feed": { /* Real-time activity logs */ },
  "notifications": { /* User notifications */ },
  "chats": { /* Donor-NGO messaging */ },
  "matches": { /* AI matching results */ }
}
```

**Use Cases:**
- Real-time activity feeds
- Live notifications
- Chat messaging
- AI matching cache
- User presence tracking

## Architecture Benefits

### 1. Separation of Concerns
- PostgreSQL: Persistent business-critical data
- Firebase: Real-time, temporary, and streaming data

### 2. Performance Optimization
- Complex queries → PostgreSQL
- Real-time updates → Firebase (no polling required)

### 3. Scalability
- Vertical scaling (PostgreSQL) + Horizontal scaling (Firebase)

### 4. Fault Tolerance
- Independent database operations
- Automatic offline support via Firebase

## When to Use Each

### Use SQL (PostgreSQL)
- Data with clear relationships
- ACID transaction requirements
- Stable, well-defined schemas
- Complex JOIN queries

### Use NoSQL (Firebase)
- Real-time updates needed
- Flexible or changing data structures
- Chat and notification features
- Offline-first applications

## Implementation

**SQL Service:**
- `lib/supabase-service.ts` - CRUD operations
- `lib/supabase-client.ts` - Database connection

**NoSQL Service:**
- `lib/firebase-service.ts` - Firebase operations
- `lib/firebase-realtime-service.ts` - Real-time features
- `lib/firebase.ts` - Configuration

**API Endpoints:**
- `app/api/*` - RESTful endpoints for both databases

## Key Comparison

| Feature | PostgreSQL | Firebase |
|---------|-----------|----------|
| **Schema** | Fixed | Flexible |
| **Data Model** | Tables/Rows | JSON Documents |
| **Relationships** | Foreign Keys, JOINs | Nested Objects |
| **Consistency** | Strong (ACID) | Eventually Consistent |
| **Real-time** | Polling/Triggers | Built-in Sync |
| **Scaling** | Vertical | Horizontal |

## Setup

1. **PostgreSQL (Supabase):**
   - Create project at [supabase.com](https://supabase.com)
   - Run migrations from `supabase/migrations/`
   - Set environment variables

2. **Firebase:**
   - Create project at [firebase.google.com](https://firebase.google.com)
   - Enable Realtime Database
   - Configure authentication and security rules

For detailed setup instructions, see the main [README.md](./README.md)

---

*Last Updated: October 2025*
