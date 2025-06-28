import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://demo-project-default-rtdb.firebaseio.com/',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789012:web:demo'
};

// Check if we have proper Firebase configuration
const hasValidConfig = firebaseConfig.apiKey !== 'demo-api-key' && 
                      firebaseConfig.projectId !== 'demo-project';

if (!hasValidConfig) {
  console.log('🔧 Running in demo mode with mock data');
}

// Initialize Firebase only if not already initialized
let app: FirebaseApp;
if (typeof window !== 'undefined' && getApps().length === 0) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (error) {
    console.warn('Firebase initialization failed, using mock mode:', error);
    app = {} as FirebaseApp;
  }
} else if (typeof window !== 'undefined') {
  app = getApps()[0];
} else {
  app = {} as FirebaseApp;
}

// Initialize Firebase services with error handling
let database: Database;
let auth: Auth;
let storage: FirebaseStorage;

try {
  if (typeof window !== 'undefined' && hasValidConfig) {
    database = getDatabase(app);
    auth = getAuth(app);
    storage = getStorage(app);
  } else {
    // Create mock objects to prevent crashes
    database = {} as Database;
    auth = {} as Auth;
    storage = {} as FirebaseStorage;
  }
} catch (error) {
  console.warn('Firebase services initialization failed, using mock mode:', error);
  database = {} as Database;
  auth = {} as Auth;
  storage = {} as FirebaseStorage;
}

export { database, auth, storage };
export default app;