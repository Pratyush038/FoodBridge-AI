import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

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

// Mock user database for demo
const mockUsers: Record<string, User> = {
  'donor@demo.com': {
    id: 'donor-1',
    email: 'donor@demo.com',
    name: 'Demo Donor',
    role: 'donor',
    organizationName: 'Green Restaurant',
    verified: true,
    createdAt: new Date().toISOString()
  },
  'receiver@demo.com': {
    id: 'receiver-1',
    email: 'receiver@demo.com',
    name: 'Demo Receiver',
    role: 'receiver',
    organizationName: 'Community Shelter',
    verified: true,
    createdAt: new Date().toISOString()
  },
  'admin@demo.com': {
    id: 'admin-1',
    email: 'admin@demo.com',
    name: 'Demo Admin',
    role: 'admin',
    organizationName: 'FoodBridge AI',
    verified: true,
    createdAt: new Date().toISOString()
  }
};

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
            
            // Check if user already exists
            if (mockUsers[credentials.email]) {
              throw new Error('User already exists');
            }
            
            const userData: User = {
              id: `user-${Date.now()}`,
              email: credentials.email,
              name: credentials.name || '',
              role: (credentials.role as 'donor' | 'receiver' | 'admin') || 'donor',
              organizationName: credentials.organizationName || undefined,
              verified: true,
              createdAt: new Date().toISOString()
            };
            
            // Save to mock database
            mockUsers[credentials.email] = userData;
            console.log('✅ User registered:', userData);
            
            return {
              id: userData.id,
              email: userData.email,
              name: userData.name,
              role: userData.role
            };
          } else {
            console.log('🔑 Logging in user:', credentials.email);
            
            // Check mock users first
            const mockUser = mockUsers[credentials.email];
            if (mockUser && credentials.password === 'demo123') {
              console.log('✅ Mock user login successful:', mockUser);
              return {
                id: mockUser.id,
                email: mockUser.email,
                name: mockUser.name,
                role: mockUser.role
              };
            }
            
            // For any other email/password combination, create a demo user
            if (credentials.password === 'demo123') {
              const newUser: User = {
                id: `user-${Date.now()}`,
                email: credentials.email,
                name: credentials.email.split('@')[0],
                role: 'donor',
                verified: true,
                createdAt: new Date().toISOString()
              };
              
              mockUsers[credentials.email] = newUser;
              console.log('✅ Demo user created and logged in:', newUser);
              
              return {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                role: newUser.role
              };
            }
            
            throw new Error('Invalid credentials. Use password: demo123');
          }
        } catch (error: any) {
          console.error('❌ Authentication error:', error);
          throw new Error(error.message || 'Authentication failed');
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
        (user as any).role = 'donor';
        
        // Save Google user to mock database
        if (user.email) {
          mockUsers[user.email] = {
            id: user.id || `google-${Date.now()}`,
            email: user.email,
            name: user.name || '',
            role: 'donor',
            verified: true,
            createdAt: new Date().toISOString()
          };
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
};