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
  console.warn('⚠️ Firebase configuration not found. Using mock data mode.');
}

// Initialize Firebase only if not already initialized
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase services with error handling
let database: Database;
let auth: Auth;
let storage: FirebaseStorage;

try {
  database = getDatabase(app);
  auth = getAuth(app);
  storage = getStorage(app);
} catch (error) {
  console.error('Error initializing Firebase services:', error);
  // Create mock objects to prevent crashes
  database = {} as Database;
  auth = {} as Auth;
  storage = {} as FirebaseStorage;
}

export { database, auth, storage };
export default app;