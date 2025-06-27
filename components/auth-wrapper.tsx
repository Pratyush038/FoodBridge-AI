'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface AuthWrapperProps {
  children: React.ReactNode;
  requiredRole?: 'donor' | 'receiver' | 'admin';
  redirectTo?: string;
}

export default function AuthWrapper({ 
  children, 
  requiredRole, 
  redirectTo = '/login' 
}: AuthWrapperProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (status === 'loading' || isTransitioning) {
      return;
    }

    const userRole = session?.user ? (session.user as any)?.role : null;

    console.log('🔍 AuthWrapper debug:', {
      hasSession: !!session,
      userRole: userRole,
      requiredRole,
      status,
      isTransitioning
    });

    if (!session) {
      console.log('❌ No session, redirecting to:', redirectTo);
      router.push(redirectTo);
      return;
    }

    if (requiredRole && session?.user) {
      if (userRole !== requiredRole) {
        console.log('🔄 Role mismatch detected. User role:', userRole, 'Required:', requiredRole);
        
        // Set transitioning state to show loading
        setIsTransitioning(true);
        
        // Quick redirect without long delays
        setTimeout(() => {
          console.log('🔄 Redirecting to correct role');
          switch (userRole) {
            case 'donor':
              router.push('/donor');
              break;
            case 'receiver':
              router.push('/receiver');
              break;
            case 'admin':
              router.push('/admin');
              break;
            default:
              console.log('⚠️ Unknown role, redirecting to home');
              router.push('/');
          }
        }, 100); // Much shorter delay
        
        return;
      }
    }

    console.log('✅ AuthWrapper: Access granted');
    setIsTransitioning(false);
  }, [session, status, requiredRole, router, redirectTo, isTransitioning]);

  if (status === 'loading' || isTransitioning) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{isTransitioning ? 'Switching roles...' : 'Loading...'}</span>
        </div>
      </div>
    );
  }

  if (!session) {
    console.log('❌ AuthWrapper: No session, showing nothing');
    return null;
  }

  if (requiredRole && session?.user) {
    const userRole = (session.user as any)?.role;
    
    if (userRole !== requiredRole) {
      console.log('❌ AuthWrapper: Role mismatch, showing loading. User role:', userRole, 'Required:', requiredRole);
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Switching to {requiredRole} view...</span>
          </div>
        </div>
      );
    }
  }

  console.log('✅ AuthWrapper: Rendering children');
  return <>{children}</>;
}