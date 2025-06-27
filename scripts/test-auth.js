const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    
    envLines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          process.env[key] = value;
        }
      }
    });
  }
}

// Load environment variables
loadEnvFile();

console.log('🧪 Testing Authentication Flow...\n');

// Test 1: Check if server is running
try {
  const response = execSync('curl -s http://localhost:3000', { encoding: 'utf8' });
  console.log('✅ Server is running on http://localhost:3000');
} catch (error) {
  console.log('❌ Server is not running. Please start with: npm run dev');
  process.exit(1);
}

// Test 2: Check environment variables
console.log('\n🔧 Environment Variables Check:');
const envVars = [
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_FIREBASE_DATABASE_URL'
];

envVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    const displayValue = value.length > 20 ? `${value.substring(0, 20)}...` : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  } else {
    console.log(`❌ ${varName}: Not set`);
  }
});

// Test 3: Check if .env.local exists
if (fs.existsSync('.env.local')) {
  console.log('\n✅ .env.local file exists');
} else {
  console.log('\n❌ .env.local file missing. Run: node scripts/setup.js');
}

console.log('\n📋 Manual Testing Instructions:');
console.log('1. Open http://localhost:3000 in your browser');
console.log('2. Go to http://localhost:3000/test-auth to debug session state');
console.log('3. Try registering a new account with different roles');
console.log('4. Try logging in with existing accounts');
console.log('5. Check browser console for debug logs');
console.log('6. Verify redirects work properly');

console.log('\n🔍 Debug URLs:');
console.log('- Test Auth: http://localhost:3000/test-auth');
console.log('- Login: http://localhost:3000/login');
console.log('- Register: http://localhost:3000/register');
console.log('- Donor Dashboard: http://localhost:3000/donor');
console.log('- Receiver Dashboard: http://localhost:3000/receiver');
console.log('- Admin Dashboard: http://localhost:3000/admin');

console.log('\n🎯 Expected Behavior:');
console.log('- Registration should create account and redirect to appropriate dashboard');
console.log('- Login should authenticate and redirect to appropriate dashboard');
console.log('- Each role should only access their designated dashboard');
console.log('- Session should persist across page refreshes'); 