# Firebase Security Rules Setup

## Issue
Firebase Realtime Database is currently denying all writes due to security rules.

## Solution

You need to update your Firebase Realtime Database security rules.

### Step 1: Go to Firebase Console
1. Visit: https://console.firebase.google.com/u/0/project/foodbridge-ai-038/database/foodbridge-ai-038-default-rtdb/rules
2. Click on the "Rules" tab

### Step 2: Update Security Rules

Replace the current rules with these development-friendly rules:

```json
{
  "rules": {
    ".read": "auth != null || true",
    ".write": "auth != null || true",
    
    "donations": {
      ".indexOn": ["donorId", "status"],
      "$donationId": {
        ".read": true,
        ".write": true
      }
    },
    
    "requirements": {
      ".indexOn": ["receiverId", "status"],
      "$requirementId": {
        ".read": true,
        ".write": true
      }
    },
    
    "matches": {
      ".indexOn": ["donationId", "requirementId", "status"],
      "$matchId": {
        ".read": true,
        ".write": true
      }
    },
    
    "activity_feed": {
      ".read": true,
      ".write": true,
      ".indexOn": ["timestamp", "type"]
    },
    
    "notifications": {
      "$userId": {
        ".read": "auth != null && auth.uid == $userId || true",
        ".write": "auth != null && auth.uid == $userId || true"
      }
    },
    
    "presence": {
      "$userId": {
        ".read": true,
        ".write": "auth != null && auth.uid == $userId || true"
      }
    },
    
    "chats": {
      "$transactionId": {
        ".read": true,
        ".write": true
      }
    },
    
    "analytics_cache": {
      ".read": true,
      ".write": true
    },
    
    "sessions": {
      "$userId": {
        ".read": "auth != null && auth.uid == $userId || true",
        ".write": "auth != null && auth.uid == $userId || true"
      }
    }
  }
}
```

### Step 3: Click "Publish"

---

## Production Security Rules (For Later)

Once your app is ready for production, update to these more secure rules:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    
    "donations": {
      ".indexOn": ["donorId", "status"],
      "$donationId": {
        ".read": true,
        ".write": "auth != null && (
          !data.exists() || 
          data.child('donorId').val() == auth.uid
        )"
      }
    },
    
    "requirements": {
      ".indexOn": ["receiverId", "status"],
      "$requirementId": {
        ".read": true,
        ".write": "auth != null && (
          !data.exists() || 
          data.child('receiverId').val() == auth.uid
        )"
      }
    },
    
    "matches": {
      ".read": true,
      ".write": "auth != null"
    },
    
    "activity_feed": {
      ".read": true,
      ".write": "auth != null"
    },
    
    "notifications": {
      "$userId": {
        ".read": "auth != null && auth.uid == $userId",
        ".write": "auth != null"
      }
    },
    
    "presence": {
      "$userId": {
        ".read": true,
        ".write": "auth != null && auth.uid == $userId"
      }
    },
    
    "chats": {
      "$transactionId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    
    "analytics_cache": {
      ".read": true,
      ".write": "auth != null"
    }
  }
}
```

---

## Quick Commands After Updating Rules

### Test Firebase Write
```bash
curl -X POST http://localhost:3001/api/demo-databases \
  -H "Content-Type: application/json" \
  -d '{"seedFirebase": true}'
```

### View All Database Data
```bash
curl http://localhost:3001/api/demo-databases
```

---

## Verification

After updating the rules, you should see data at:
- https://console.firebase.google.com/u/0/project/foodbridge-ai-038/database/foodbridge-ai-038-default-rtdb/data

Look for these nodes:
- ✅ `activity_feed/`
- ✅ `analytics_cache/`
- ✅ `presence/`
- ✅ `donations/` (when you create donations)
- ✅ `requirements/` (when you create requirements)
- ✅ `matches/` (when AI creates matches)

---

## Troubleshooting

If you still see `PERMISSION_DENIED`:
1. Make sure you clicked "Publish" in Firebase Console
2. Wait 10-20 seconds for rules to propagate
3. Restart your Next.js dev server
4. Try the curl command again

---

**Note:** The current rules allow public read/write for development. Make sure to tighten security before deploying to production!
