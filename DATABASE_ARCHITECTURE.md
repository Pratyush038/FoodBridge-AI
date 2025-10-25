# FoodBridge AI - Dual Database Architecture

## Overview

This project implements a **hybrid database architecture** using both **SQL** and **NoSQL** databases to leverage the strengths of each paradigm.

---

## 🗄️ Database Systems Used

### 1. PostgreSQL (SQL) - via Supabase
**Type:** Relational Database  
**Purpose:** Primary data storage for structured, relational data

#### Characteristics:
- ✅ ACID transactions (Atomicity, Consistency, Isolation, Durability)
- ✅ Fixed schema with tables, columns, and data types
- ✅ Complex relationships (foreign keys, JOINs)
- ✅ Strong data integrity and consistency
- ✅ SQL query language
- ✅ Ideal for business-critical data

#### Tables:
```sql
- donors (id, name, email, phone, address, etc.)
- ngos (id, name, email, phone, address, etc.)
- food_items (id, donor_id, food_type, quantity, status, etc.)
- requests (id, ngo_id, food_type, quantity, status, etc.)
```

#### Use Cases:
- User accounts and profiles
- Food donation records
- Food requirement requests
- Transactional data
- Data that requires strong consistency

---

### 2. Firebase Realtime Database (NoSQL)
**Type:** Document/JSON Database  
**Purpose:** Real-time data and flexible storage

#### Characteristics:
- ✅ Real-time data synchronization
- ✅ Flexible JSON structure (no fixed schema)
- ✅ Automatic client updates when data changes
- ✅ Offline support with automatic sync
- ✅ Horizontal scaling
- ✅ Ideal for real-time features

#### Data Structure:
```json
{
  "activity_feed": {
    "<activity_id>": {
      "type": "donation_created",
      "message": "...",
      "timestamp": "...",
      "metadata": {...}
    }
  },
  "notifications": {
    "<user_id>": {
      "<notification_id>": {
        "title": "...",
        "message": "...",
        "read": false
      }
    }
  },
  "presence": {
    "<user_id>": {
      "status": "online",
      "lastSeen": "...",
      "currentPage": "..."
    }
  },
  "matches": {
    "<match_id>": {
      "donationId": "...",
      "requirementId": "...",
      "matchScore": 95
    }
  },
  "chats": {
    "<transaction_id>": {
      "messages": {
        "<message_id>": {
          "sender": "...",
          "message": "...",
          "timestamp": "..."
        }
      }
    }
  }
}
```

#### Use Cases:
- Real-time activity feed
- Live notifications
- Chat messages between donors and NGOs
- User presence (online/offline status)
- Real-time match updates
- Analytics cache (fast temporary storage)
- Session tracking

---

## 🔄 Data Flow Examples

### Example 1: Creating a Food Donation

```typescript
// Step 1: Save to PostgreSQL (SQL) - Primary storage
const supabaseData = {
  donor_id: userId,
  food_type: 'Vegetables',
  quantity: 50,
  status: 'available'
};
const result = await supabase.from('food_items').insert(supabaseData);

// Step 2: Sync to Firebase (NoSQL) - Real-time sync
const firebaseRef = ref(database, `donations/${result.id}`);
await set(firebaseRef, donationData);

// Step 3: Create activity log in Firebase (NoSQL only)
await firebaseNoSQLService.activityFeed.create({
  type: 'donation_created',
  message: 'New donation: 50kg of Vegetables',
  timestamp: serverTimestamp()
});
```

**Result:**
- ✅ Structured data stored in PostgreSQL
- ✅ Real-time copy available in Firebase
- ✅ Activity logged for live feed

---

### Example 2: Real-time Notifications

```typescript
// When a match is found (stored in PostgreSQL)
const match = await createMatch(donationId, requestId);

// Send real-time notification via Firebase (NoSQL)
await firebaseNoSQLService.notifications.send({
  userId: donorId,
  type: 'match',
  title: 'Match Found!',
  message: 'Your donation has been matched',
  read: false
});

// Donor receives notification instantly without polling!
```

---

## 📊 When to Use SQL vs NoSQL

### Use SQL (PostgreSQL/Supabase) When:
- ✅ Data has clear relationships (users → donations → matches)
- ✅ You need ACID transactions
- ✅ Data structure is stable and well-defined
- ✅ Complex queries with JOINs are needed
- ✅ Data integrity is critical

### Use NoSQL (Firebase) When:
- ✅ Need real-time updates across clients
- ✅ Data structure is flexible or changes frequently
- ✅ Building chat, notifications, or live feeds
- ✅ Need offline support with sync
- ✅ Rapid prototyping with changing requirements

---

## 🏗️ Architecture Benefits

### 1. **Separation of Concerns**
- PostgreSQL handles persistent business data
- Firebase handles real-time, temporary, and streaming data

### 2. **Best of Both Worlds**
- SQL's consistency + NoSQL's flexibility
- Strong data integrity + Real-time updates

### 3. **Scalability**
- PostgreSQL scales vertically (powerful single server)
- Firebase scales horizontally (distributed globally)

### 4. **Performance**
- Complex queries → PostgreSQL
- Real-time reads → Firebase (faster, no polling)

### 5. **Fault Tolerance**
- If one database is down, critical features still work
- Firebase provides offline support automatically

---

## 🔧 Implementation Files

### SQL Service (Supabase)
- `lib/supabase-service.ts` - CRUD operations for structured data
- `lib/supabase-client.ts` - Database connection

### NoSQL Service (Firebase)
- `lib/firebase-nosql-service.ts` - Real-time features (NEW)
- `lib/firebase-realtime-service.ts` - Chat and logs
- `lib/firebase-service.ts` - Dual writes (SQL + NoSQL)
- `lib/firebase.ts` - Firebase configuration

### API Endpoints
- `app/api/demo-databases/route.ts` - Demonstrates both databases

---

## 🧪 Testing the Dual Database Setup

### 1. View Both Databases
```bash
# Test the demo endpoint
curl http://localhost:3000/api/demo-databases
```

### 2. Seed Firebase with Demo Data
```bash
curl -X POST http://localhost:3000/api/demo-databases \
  -H "Content-Type: application/json" \
  -d '{"seedFirebase": true}'
```

### 3. Check Firebase Console
- URL: https://console.firebase.google.com/u/0/project/foodbridge-ai-038/database/foodbridge-ai-038-default-rtdb/data
- You should now see data under:
  - `activity_feed/`
  - `notifications/`
  - `presence/`
  - `analytics_cache/`

### 4. Check Supabase Dashboard
- URL: https://supabase.com/dashboard/project/gjbrnuunyllvbmibbdmi
- Tables: `donors`, `ngos`, `food_items`, `requests`

---

## 📈 Assignment Requirements Satisfied

### ✅ SQL Database (PostgreSQL)
- **Location:** Supabase Cloud
- **Tables:** 4+ tables with relationships
- **Features:** Foreign keys, transactions, complex queries
- **Evidence:** Check Supabase Table Editor

### ✅ NoSQL Database (Firebase)
- **Location:** Firebase Realtime Database (Asia Southeast1)
- **Collections:** 5+ root nodes with nested data
- **Features:** Real-time sync, flexible schema, nested documents
- **Evidence:** Check Firebase Console (link above)

### ✅ Hybrid Architecture
- **Dual writes:** Every donation/request goes to both databases
- **Clear separation:** SQL for persistence, NoSQL for real-time
- **Live demonstration:** `/api/demo-databases` endpoint

---

## 🎯 Key Differentiators

| Feature | SQL (PostgreSQL) | NoSQL (Firebase) |
|---------|------------------|------------------|
| **Schema** | Fixed, defined upfront | Flexible, can change anytime |
| **Data Model** | Tables with rows/columns | JSON documents |
| **Relationships** | Foreign keys, JOINs | Nested objects, denormalization |
| **Transactions** | ACID guaranteed | Eventually consistent |
| **Real-time** | Need polling or triggers | Built-in real-time sync |
| **Query Language** | SQL | JavaScript/SDK methods |
| **Scaling** | Vertical (bigger server) | Horizontal (more servers) |
| **Use Case** | Business data | Real-time features |

---

## 🚀 Next Steps

To see data in Firebase:
1. Run your app: `npm run dev`
2. Create a donation or requirement
3. Check Firebase Console - you'll see:
   - New entry in `donations/` or `requirements/`
   - Activity log in `activity_feed/`
4. Both databases will have the data!

---

## 📚 References

- **Supabase Docs:** https://supabase.com/docs
- **Firebase Docs:** https://firebase.google.com/docs/database
- **SQL vs NoSQL:** https://www.mongodb.com/nosql-explained/nosql-vs-sql

---

**Author:** FoodBridge AI Team  
**Last Updated:** October 2025
