'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Heart, Mail, Lock, User, Building, Loader2 } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: '',
    organizationName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { data: session, status, update } = useSession();

  // Handle redirect when session is available
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      console.log('🎯 Session authenticated, checking user role:', session.user);
      const userRole = (session.user as any)?.role;
      console.log('👤 User role:', userRole);
      
      // Determine redirect path based on role
      let redirectPath = '/';
      switch (userRole) {
        case 'donor':
          redirectPath = '/donor';
          break;
        case 'receiver':
          redirectPath = '/receiver';
          break;
        case 'admin':
          redirectPath = '/admin';
          break;
        default:
          redirectPath = '/';
      }
      
      console.log('🔄 Redirecting to:', redirectPath);
      router.push(redirectPath);
    }
  }, [session, status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate required fields
    if (!formData.name || !formData.email || !formData.password || !formData.userType) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    // Add a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.log('⏰ Registration timeout reached');
      setLoading(false);
      setError('Registration is taking longer than expected. Please try again.');
    }, 15000); // 15 second timeout

    try {
      console.log('🔐 Attempting registration for:', formData.email);
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.userType,
        organizationName: formData.organizationName || '', // Send empty string if not provided
        action: 'register',
        redirect: false
      });

      clearTimeout(loadingTimeout);
      console.log('🔐 Registration result:', result);

      if (result?.error) {
        console.error('❌ Registration error:', result.error);
        setError(result.error);
        setLoading(false);
      } else if (result?.ok) {
        console.log('✅ Registration successful, updating session');
        // Force session update and let useEffect handle redirect
        await update();
        // Keep loading true until redirect happens
      }
    } catch (error) {
      clearTimeout(loadingTimeout);
      console.error('❌ Unexpected error during registration:', error);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  // Show loading if checking session or during registration
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{loading ? 'Creating account...' : 'Loading...'}</span>
        </div>
      </div>
    );
  }

  // Don't show register form if already authenticated
  if (status === 'authenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Redirecting...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <Heart className="h-8 w-8 text-green-600 mr-2" />
            <span className="text-2xl font-bold text-gray-900">FoodBridge AI</span>
          </div>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>
            Join our community and start making a difference today
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userType">I am a *</Label>
              <Select 
                value={formData.userType} 
                onValueChange={(value) => setFormData({...formData, userType: value})}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="donor">Food Donor</SelectItem>
                  <SelectItem value="receiver">Food Receiver (NGO/Shelter)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization Name</Label>
              <div className="relative">
                <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="organizationName"
                  type="text"
                  placeholder="Enter organization name (optional)"
                  value={formData.organizationName}
                  onChange={(e) => setFormData({...formData, organizationName: e.target.value})}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <div className="text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-green-600 hover:text-green-700 font-medium">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}