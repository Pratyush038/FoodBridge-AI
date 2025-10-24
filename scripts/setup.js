#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🚀 FoodBridge AI Setup Script');
console.log('=============================\n');

// Generate a random secret for NextAuth
const generateSecret = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('⚠️  .env.local already exists. Backing up to .env.local.backup');
  fs.copyFileSync(envPath, envPath + '.backup');
}

// Create .env.local template
const envTemplate = `# NextAuth Configuration
NEXTAUTH_SECRET=${generateSecret()}
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (for Google sign-in) - Optional
# GOOGLE_CLIENT_ID=your-google-client-id
# GOOGLE_CLIENT_SECRET=your-google-client-secret

# Firebase Configuration - Required for full functionality
# NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
# NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://foodbridge-ai-038-default-rtdb.asia-southeast1.firebasedatabase.app
# NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
# NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
# NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
# NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Google Maps API Key - Required for maps and location autocomplete
# Get your API key from: https://console.cloud.google.com/google/maps-apis
# Enable: Maps JavaScript API & Places API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
`;

fs.writeFileSync(envPath, envTemplate);

console.log('✅ Created .env.local with default configuration');
console.log('✅ Generated secure NEXTAUTH_SECRET');
console.log('\n📋 Next Steps:');
console.log('1. Update .env.local with your Firebase configuration');
console.log('2. Run "npm install" to install dependencies');
console.log('3. Run "npm run dev" to start the development server');
console.log('\n📚 For detailed setup instructions, see README.md');
console.log('\n🔧 The app will work with mock data if Firebase is not configured'); 