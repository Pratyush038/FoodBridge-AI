import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, database } from './firebase';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'donor' | 'receiver' | 'admin';
  organizationName?: string;
  location?: {
    address: string;
    lat: number;
    lng: number;
  };
  verified: boolean;
  createdAt: string;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development',
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        action: { label: 'Action', type: 'text' },
        name: { label: 'Name', type: 'text' },
        role: { label: 'Role', type: 'text' },
        organizationName: { label: 'Organization', type: 'text' }
      },
      async authorize(credentials) {
        console.log('🔐 Auth attempt:', { 
          action: credentials?.action, 
          email: credentials?.email,
          hasPassword: !!credentials?.password 
        });

        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        try {
          if (credentials.action === 'register') {
            console.log('📝 Registering new user:', credentials.email);
            
            // Create new user
            const userCredential = await createUserWithEmailAndPassword(
              auth,
              credentials.email,
              credentials.password
            );
            
            const userData: User = {
              id: userCredential.user.uid,
              email: credentials.email,
              name: credentials.name || '',
              role: (credentials.role as 'donor' | 'receiver' | 'admin') || 'donor',
              organizationName: credentials.organizationName || undefined,
              verified: false,
              createdAt: new Date().toISOString()
            };
            
            console.log('✅ User created in Firebase Auth:', userData);
            
            // Try to save user data to database
            try {
              if (database && typeof database === 'object') {
                await set(ref(database, `users/${userCredential.user.uid}`), userData);
                console.log('✅ User data saved to database');
              }
            } catch (dbError) {
              console.warn('⚠️ Database not available, user created in Auth only:', dbError);
            }
            
            return {
              id: userData.id,
              email: userData.email,
              name: userData.name,
              role: userData.role
            };
          } else {
            console.log('🔑 Logging in user:', credentials.email);
            
            // Sign in existing user
            const userCredential = await signInWithEmailAndPassword(
              auth,
              credentials.email,
              credentials.password
            );
            
            console.log('✅ Firebase Auth login successful');
            
            // Try to get user data from database
            let userData: User | null = null;
            try {
              if (database && typeof database === 'object') {
                const userSnapshot = await get(ref(database, `users/${userCredential.user.uid}`));
                userData = userSnapshot.val() as User;
                console.log('✅ User data retrieved from database:', userData);
              }
            } catch (dbError) {
              console.warn('⚠️ Database not available, using basic user info:', dbError);
            }
            
            if (!userData) {
              console.log('⚠️ No user data found, creating default user data');
              userData = {
                id: userCredential.user.uid,
                email: userCredential.user.email || credentials.email,
                name: userCredential.user.displayName || 'User',
                role: 'donor',
                verified: false,
                createdAt: new Date().toISOString()
              };
            }
            
            return {
              id: userData.id,
              email: userData.email,
              name: userData.name,
              role: userData.role
            };
          }
        } catch (error: any) {
          console.error('❌ Authentication error:', error);
          
          // Provide user-friendly error messages
          const errorMessages: Record<string, string> = {
            'auth/user-not-found': 'No account found with this email address.',
            'auth/wrong-password': 'Incorrect password. Please try again.',
            'auth/email-already-in-use': 'An account with this email already exists.',
            'auth/weak-password': 'Password should be at least 6 characters.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/network-request-failed': 'Network error. Please check your connection.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
            'auth/user-disabled': 'This account has been disabled.',
            'auth/operation-not-allowed': 'This sign-in method is not enabled.',
          };
          
          const userMessage = errorMessages[error.code] || error.message || 'Authentication failed. Please try again.';
          throw new Error(userMessage);
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('🔐 SignIn callback:', { 
        user: user.email, 
        provider: account?.provider,
        hasRole: !!(user as any).role 
      });
      
      // For Google OAuth users, assign a default role if none exists
      if (account?.provider === 'google' && !(user as any).role) {
        console.log('👤 Assigning default role to Google user');
        (user as any).role = 'donor';
        
        // Try to save Google user to database
        try {
          if (database && typeof database === 'object' && user.id) {
            const userData: User = {
              id: user.id,
              email: user.email || '',
              name: user.name || '',
              role: 'donor',
              verified: true, // Google users are pre-verified
              createdAt: new Date().toISOString()
            };
            
            await set(ref(database, `users/${user.id}`), userData);
            console.log('✅ Google user saved to database');
          }
        } catch (error) {
          console.warn('⚠️ Could not save Google user to database:', error);
        }
      }
      
      return true;
    },
    async jwt({ token, user, account }) {
      console.log('🔄 JWT callback:', { 
        tokenSub: token.sub, 
        userEmail: user?.email, 
        provider: account?.provider 
      });
      
      if (user) {
        const userRole = (user as any).role || 'donor';
        token.role = userRole;
        token.name = user.name;
        token.email = user.email;
        console.log('✅ Role added to token:', token.role);
      }
      
      // Ensure role is always present
      if (!token.role) {
        token.role = 'donor';
        console.log('✅ Default role set in token:', token.role);
      }
      
      return token;
    },
    async session({ session, token }) {
      console.log('🔄 Session callback:', { 
        sessionUser: session.user?.email, 
        tokenRole: token.role,
        tokenSub: token.sub 
      });
      
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role || 'donor';
        
        // Ensure name and email are set
        session.user.name = token.name as string || session.user.name;
        session.user.email = token.email as string || session.user.email;
        
        console.log('✅ Session updated with user data:', {
          id: (session.user as any).id,
          email: session.user.email,
          name: session.user.name,
          role: (session.user as any).role
        });
      }
      
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === 'development',
  events: {
    async signIn(message) {
      console.log('🎉 User signed in:', message.user.email);
    },
    async signOut(message) {
      console.log('👋 User signed out:', message.token?.email);
    },
    async createUser(message) {
      console.log('👤 New user created:', message.user.email);
    },
  },
};