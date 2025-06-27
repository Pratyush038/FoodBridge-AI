'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export default function TestAuth() {
  const { data: session, status } = useSession();

  useEffect(() => {
    console.log('🔍 TestAuth Debug Info:', {
      status,
      hasSession: !!session,
      user: session?.user,
      userRole: session?.user ? (session.user as any)?.role : 'none',
      timestamp: new Date().toISOString()
    });
  }, [session, status]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Authentication Test Page</h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Session Status</h2>
            <p className="text-gray-600">Status: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{status}</span></p>
          </div>

          {session?.user && (
            <div>
              <h2 className="text-xl font-semibold mb-2">User Information</h2>
              <div className="space-y-2">
                <p><strong>Email:</strong> {session.user.email}</p>
                <p><strong>Name:</strong> {session.user.name}</p>
                <p><strong>ID:</strong> {(session.user as any)?.id || 'Not set'}</p>
                <p><strong>Role:</strong> <span className="font-mono bg-blue-100 px-2 py-1 rounded">{(session.user as any)?.role || 'Not set'}</span></p>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xl font-semibold mb-2">Expected Redirects</h2>
            <div className="space-y-2">
              <p>• <strong>Donor role:</strong> Should redirect to <code>/donor</code></p>
              <p>• <strong>Receiver role:</strong> Should redirect to <code>/receiver</code></p>
              <p>• <strong>Admin role:</strong> Should redirect to <code>/admin</code></p>
              <p>• <strong>No role:</strong> Should redirect to <code>/</code></p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Debug Actions</h2>
            <div className="space-y-2">
              <button 
                onClick={() => {
                  console.log('🔍 Manual session check:', {
                    status,
                    session,
                    userRole: session?.user ? (session.user as any)?.role : 'none'
                  });
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Log Session to Console
              </button>
            </div>
          </div>

          {status === 'unauthenticated' && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              <p><strong>Not authenticated.</strong> Please sign in to test the redirect functionality.</p>
            </div>
          )}

          {status === 'authenticated' && session?.user && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <p><strong>Authenticated!</strong> Check the console for debug information and verify the redirect logic.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 