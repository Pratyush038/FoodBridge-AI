#!/bin/bash

# FoodBridge AI - Database Setup & Test Script
# This script helps verify both SQL and NoSQL databases are working

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  FoodBridge AI - Database Verification Script"
echo "═══════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if server is running
echo -e "${BLUE}[1/5]${NC} Checking if dev server is running..."
if curl -s http://localhost:3001 > /dev/null 2>&1 || curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Dev server is running"
    
    # Determine which port
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        PORT=3001
    else
        PORT=3000
    fi
    echo -e "  Using port: ${PORT}"
else
    echo -e "${RED}✗${NC} Dev server is not running"
    echo -e "${YELLOW}  Please run: npm run dev${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}[2/5]${NC} Testing Firebase NoSQL write..."
SEED_RESPONSE=$(curl -s -X POST http://localhost:${PORT}/api/demo-databases \
  -H "Content-Type: application/json" \
  -d '{"seedFirebase": true}')

if echo "$SEED_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Firebase write successful!"
    echo "$SEED_RESPONSE" | jq '.' 2>/dev/null || echo "$SEED_RESPONSE"
else
    echo -e "${RED}✗${NC} Firebase write failed"
    echo "$SEED_RESPONSE" | jq '.' 2>/dev/null || echo "$SEED_RESPONSE"
    echo ""
    echo -e "${YELLOW}⚠️  Action Required:${NC}"
    echo "   1. Go to: https://console.firebase.google.com/u/0/project/foodbridge-ai-038/database/foodbridge-ai-038-default-rtdb/rules"
    echo "   2. Set rules to:"
    echo '      { "rules": { ".read": true, ".write": true } }'
    echo "   3. Click 'Publish'"
    echo "   4. Wait 30 seconds and run this script again"
    echo ""
    exit 1
fi

echo ""
echo -e "${BLUE}[3/5]${NC} Testing dual database read..."
DB_RESPONSE=$(curl -s http://localhost:${PORT}/api/demo-databases)

if echo "$DB_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Dual database read successful!"
    
    # Extract counts
    SQL_DONORS=$(echo "$DB_RESPONSE" | jq -r '.databases.sql.totalRecords.donors // 0' 2>/dev/null || echo "0")
    SQL_NGOS=$(echo "$DB_RESPONSE" | jq -r '.databases.sql.totalRecords.ngos // 0' 2>/dev/null || echo "0")
    SQL_FOOD=$(echo "$DB_RESPONSE" | jq -r '.databases.sql.totalRecords.foodItems // 0' 2>/dev/null || echo "0")
    SQL_REQUESTS=$(echo "$DB_RESPONSE" | jq -r '.databases.sql.totalRecords.requests // 0' 2>/dev/null || echo "0")
    
    NOSQL_ACTIVITIES=$(echo "$DB_RESPONSE" | jq -r '.databases.nosql.totalRecords.activities // 0' 2>/dev/null || echo "0")
    NOSQL_ONLINE=$(echo "$DB_RESPONSE" | jq -r '.databases.nosql.totalRecords.onlineUsers // 0' 2>/dev/null || echo "0")
    
    echo ""
    echo "  SQL Database (PostgreSQL):"
    echo "    • Donors: ${SQL_DONORS}"
    echo "    • NGOs: ${SQL_NGOS}"
    echo "    • Food Items: ${SQL_FOOD}"
    echo "    • Requests: ${SQL_REQUESTS}"
    echo ""
    echo "  NoSQL Database (Firebase):"
    echo "    • Activities: ${NOSQL_ACTIVITIES}"
    echo "    • Online Users: ${NOSQL_ONLINE}"
else
    echo -e "${RED}✗${NC} Database read failed"
    echo "$DB_RESPONSE" | jq '.' 2>/dev/null || echo "$DB_RESPONSE"
fi

echo ""
echo -e "${BLUE}[4/5]${NC} Checking database connections..."

# Check Supabase
if echo "$DB_RESPONSE" | grep -q 'PostgreSQL'; then
    echo -e "${GREEN}✓${NC} PostgreSQL (Supabase) connected"
else
    echo -e "${RED}✗${NC} PostgreSQL (Supabase) not connected"
fi

# Check Firebase
if echo "$DB_RESPONSE" | grep -q 'Firebase'; then
    echo -e "${GREEN}✓${NC} Firebase Realtime DB connected"
else
    echo -e "${RED}✗${NC} Firebase Realtime DB not connected"
fi

echo ""
echo -e "${BLUE}[5/5]${NC} Database URLs:"
echo ""
echo "  PostgreSQL (SQL):"
echo "    📊 https://supabase.com/dashboard/project/gjbrnuunyllvbmibbdmi"
echo ""
echo "  Firebase (NoSQL):"
echo "    🔥 https://console.firebase.google.com/u/0/project/foodbridge-ai-038/database/foodbridge-ai-038-default-rtdb/data"
echo ""

echo "═══════════════════════════════════════════════════════"
echo -e "${GREEN}✓ Database verification complete!${NC}"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📚 For more information, see:"
echo "   • QUICK_SETUP_CHECKLIST.md - Setup guide"
echo "   • DATABASE_ARCHITECTURE.md - Technical details"
echo "   • ASSIGNMENT_DATABASE_SUMMARY.md - Assignment overview"
echo ""
echo "🚀 To view detailed comparison:"
echo "   node scripts/database-comparison.js"
echo ""
