import NextAuth, { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'donor' | 'receiver' | 'ngo' | 'admin';
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: 'donor' | 'receiver' | 'ngo' | 'admin';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'donor' | 'receiver' | 'ngo' | 'admin';
  }
}
