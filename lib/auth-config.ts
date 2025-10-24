import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  getAuth 
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
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        action: { label: 'Action', type: 'text' }, // 'login' or 'register'
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
            
            // Try to save user data to database, but don't fail if database is not available
            try {
              await set(ref(database, `users/${userCredential.user.uid}`), userData);
              console.log('✅ User data saved to database');
            } catch (dbError) {
              console.warn('⚠️ Database not available, user created in Auth only:', dbError);
              // Continue without database - user is still created in Firebase Auth
            }
            
            const returnUser = {
              id: userData.id,
              email: userData.email,
              name: userData.name,
              role: userData.role
            };
            
            console.log('🎉 Registration successful, returning user:', returnUser);
            return returnUser;
          } else {
            console.log('🔑 Logging in user:', credentials.email);
            
            // Sign in existing user
            const userCredential = await signInWithEmailAndPassword(
              auth,
              credentials.email,
              credentials.password
            );
            
            console.log('✅ Firebase Auth login successful');
            
            // Try to get user data from database, but don't fail if database is not available
            let userData: User | null = null;
            try {
              const userSnapshot = await get(ref(database, `users/${userCredential.user.uid}`));
              userData = userSnapshot.val() as User;
              console.log('✅ User data retrieved from database:', userData);
            } catch (dbError) {
              console.warn('⚠️ Database not available, using basic user info:', dbError);
              // Create basic user data if database is not available
              userData = {
                id: userCredential.user.uid,
                email: userCredential.user.email || credentials.email,
                name: userCredential.user.displayName || 'User',
                role: 'donor', // Default role
                verified: false,
                createdAt: new Date().toISOString()
              };
            }
            
            if (!userData) {
              console.log('⚠️ No user data found, creating default user data');
              // Create default user data if none exists
              userData = {
                id: userCredential.user.uid,
                email: userCredential.user.email || credentials.email,
                name: userCredential.user.displayName || 'User',
                role: 'donor', // Default role
                verified: false,
                createdAt: new Date().toISOString()
              };
            }
            
            const returnUser = {
              id: userData.id,
              email: userData.email,
              name: userData.name,
              role: userData.role
            };
            
            console.log('🎉 Login successful, returning user:', returnUser);
            return returnUser;
          }
        } catch (error: any) {
          console.error('❌ Authentication error:', error);
          if (error.code === 'auth/user-not-found') {
            throw new Error('User not found. Please check your email and password.');
          } else if (error.code === 'auth/wrong-password') {
            throw new Error('Incorrect password. Please try again.');
          } else if (error.code === 'auth/email-already-in-use') {
            throw new Error('An account with this email already exists.');
          } else if (error.code === 'auth/weak-password') {
            throw new Error('Password is too weak. Please choose a stronger password.');
          } else if (error.code === 'auth/invalid-email') {
            throw new Error('Invalid email address.');
          } else if (error.code === 'auth/network-request-failed') {
            throw new Error('Network error. Please check your internet connection and try again.');
          } else {
            throw new Error(error.message || 'Authentication failed. Please try again.');
          }
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'demo-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'demo-client-secret',
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
        (user as any).role = 'donor'; // Default role for Google users
      }
      
      return true;
    },
    async jwt({ token, user, account }) {
      console.log('🔄 JWT callback:', { token: token.sub, user: user?.email, provider: account?.provider });
      
      if (user) {
        // Ensure user has a role, default to 'donor' if none
        const userRole = (user as any).role || 'donor';
        token.role = userRole;
        console.log('✅ Role added to token:', token.role);
      }
      
      // For Google OAuth, ensure role is set even if not in user object
      if (account?.provider === 'google' && !token.role) {
        token.role = 'donor';
        console.log('✅ Default role set for Google user:', token.role);
      }
      
      return token;
    },
    async session({ session, token }) {
      console.log('🔄 Session callback:', { 
        sessionUser: session.user?.email, 
        tokenRole: token.role,
        tokenSub: token.sub,
        hasUser: !!session.user
      });
      
      if (session.user) {
        (session.user as any).id = token.sub;
        
        // Use the role from the token, default to 'donor'
        const userRole = token.role || 'donor';
        (session.user as any).role = userRole;
        
        console.log('✅ Session updated with user data:', {
          id: (session.user as any).id,
          email: session.user.email,
          name: session.user.name,
          role: (session.user as any).role
        });
      } else {
        console.warn('⚠️ Session callback: No user in session object');
      }
      
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt'
  },
  debug: process.env.NODE_ENV === 'development'
};

// IMPORTANT: In Google Cloud Console, set the OAuth redirect URI to:
// https://food-bridge-ai.vercel.app/api/auth/callback/google