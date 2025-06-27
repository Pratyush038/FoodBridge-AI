'use client';

import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import HeaderBar from '@/components/header-bar';
import AuthWrapper from '@/components/auth-wrapper';
import { useRouter } from 'next/navigation';

export default function TestRoleSwitch() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();

  const handleRoleSwitch = async (newRole: string) => {
    if (!session?.user) return;

    console.log('🔄 Testing role switch to:', newRole);
    
    try {
      // Update session directly for testing
      await updateSession({ 
        ...session, 
        user: { 
          ...session.user, 
          role: newRole 
        } 
      });
      
      console.log('✅ Session updated to role:', newRole);
    } catch (error) {
      console.error('❌ Error updating session:', error);
    }
  };

  const handleDirectNavigation = (path: string) => {
    console.log('🚀 Direct navigation to:', path);
    router.push(path);
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50 pt-16">
        <HeaderBar />
        <div className="container mx-auto p-8">
          <Card>
            <CardHeader>
              <CardTitle>Role Switch Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p><strong>Current User:</strong> {session?.user?.name}</p>
                <p><strong>Current Role:</strong> {(session?.user as any)?.role || 'none'}</p>
                <p><strong>User ID:</strong> {(session?.user as any)?.id || 'none'}</p>
              </div>
              
              <div className="flex space-x-4">
                <Button 
                  onClick={() => handleRoleSwitch('donor')}
                  variant={((session?.user as any)?.role === 'donor') ? 'default' : 'outline'}
                >
                  Switch to Donor
                </Button>
                <Button 
                  onClick={() => handleRoleSwitch('receiver')}
                  variant={((session?.user as any)?.role === 'receiver') ? 'default' : 'outline'}
                >
                  Switch to Receiver
                </Button>
                <Button 
                  onClick={() => handleRoleSwitch('admin')}
                  variant={((session?.user as any)?.role === 'admin') ? 'default' : 'outline'}
                >
                  Switch to Admin
                </Button>
              </div>
              
              <div className="mt-8 space-y-2">
                <h3 className="font-semibold">Direct Navigation (Bypass Auth):</h3>
                <div className="flex space-x-4">
                  <Button variant="outline" onClick={() => handleDirectNavigation('/donor')}>
                    Go to Donor Dashboard
                  </Button>
                  <Button variant="outline" onClick={() => handleDirectNavigation('/receiver')}>
                    Go to Receiver Dashboard
                  </Button>
                  <Button variant="outline" onClick={() => handleDirectNavigation('/admin')}>
                    Go to Admin Dashboard
                  </Button>
                </div>
              </div>

              <div className="mt-8 space-y-2">
                <h3 className="font-semibold">Force Navigation (Window Location):</h3>
                <div className="flex space-x-4">
                  <Button variant="outline" onClick={() => window.location.href = '/donor'}>
                    Force Go to Donor
                  </Button>
                  <Button variant="outline" onClick={() => window.location.href = '/receiver'}>
                    Force Go to Receiver
                  </Button>
                  <Button variant="outline" onClick={() => window.location.href = '/admin'}>
                    Force Go to Admin
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthWrapper>
  );
} 