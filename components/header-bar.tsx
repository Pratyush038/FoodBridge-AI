'use client';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, User, LogOut, Loader2, UserCheck, Settings, Bot } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export default function HeaderBar() {
  const { data: session, update: updateSession } = useSession();
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userRole = (session?.user as any)?.role || 'User';
  const pathname = usePathname();
  const router = useRouter();

  // Landing page style
  const isLanding = pathname === '/';

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Determine current page role from pathname
  let pageRole = '';
  if (pathname.startsWith('/donor')) pageRole = 'Donor';
  else if (pathname.startsWith('/receiver')) pageRole = 'Receiver';
  else if (pathname.startsWith('/admin')) pageRole = 'Admin';
  else pageRole = userRole;

  // Helper to get lower-case role for comparison
  const pageRoleKey = pageRole.toLowerCase();

  // Reverted role switch handler: only update session in memory
  const handleRoleChange = async (newRole: string) => {
    if (!session?.user || isSwitchingRole || pageRoleKey === newRole) return;
    setIsSwitchingRole(true);
    try {
      await updateSession({
        ...session,
        user: {
          ...session.user,
          role: newRole
        }
      });
      router.push(`/${newRole}`);
    } catch (error) {
      // Optionally handle error
    } finally {
      setIsSwitchingRole(false);
    }
  };

  // Sign out and redirect to landing page
  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ redirect: false });
    setIsSigningOut(false);
    router.push('/');
  };

  return (
    <header
      className={
        isLanding
          ? `fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[96vw] max-w-7xl rounded-full shadow-xl backdrop-blur-2xl flex items-center justify-between px-10 py-3 border transition-all duration-300 ${
              scrolled 
                ? 'bg-green-50/70 border-green-200/50' 
                : 'bg-gradient-to-r from-green-900/80 via-emerald-900/80 to-green-900/80 border-white/10'
            }`
          : `fixed top-0 left-0 right-0 z-50 w-full backdrop-blur-md flex items-center justify-between px-6 py-1 border-b transition-all duration-300 ${
              scrolled
                ? 'bg-green-50/80 border-green-200/50 shadow-md'
                : 'bg-white/95 border-gray-200'
            }`
      }
      style={isLanding && !scrolled ? { boxShadow: '0 6px 32px 0 rgba(5,150,105,0.15)' } : {}}
    >
      {/* Logo and About Us */}
      <div className="flex items-center space-x-6">
        <Link href="/" className="flex items-center space-x-2 group">
          <Heart className={`h-7 w-7 transition-all duration-300 group-hover:scale-110 ${
            isLanding 
              ? (scrolled ? 'text-green-600' : 'text-green-400') 
              : 'text-green-600'
          }`} />
          <span className={`text-2xl font-bold tracking-tight transition-colors duration-300 ${
            isLanding 
              ? (scrolled ? 'text-gray-900' : 'text-white') 
              : 'text-gray-900'
          }`}>FoodBridge AI</span>
        </Link>
        <Link href="/about" className={`text-base font-semibold transition-all duration-200 px-3 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400/50 ${
          isLanding 
            ? (scrolled ? 'text-gray-700 hover:text-green-600' : 'text-green-50 hover:text-white') 
            : 'text-gray-700 hover:text-green-600'
        }`}>About Us</Link>
        {session?.user && (
          <Link href="/chat" className={`text-base font-semibold transition-all duration-200 px-3 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400/50 flex items-center gap-2 ${
            isLanding 
              ? (scrolled ? 'text-gray-700 hover:text-green-600' : 'text-green-50 hover:text-white') 
              : 'text-gray-700 hover:text-green-600'
          }`}>
            <Bot className="h-5 w-5" />
            AI Chat
          </Link>
        )}
      </div>

      {/* User Profile & Role Switcher */}
      <div className="flex items-center">
        {session?.user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={`flex items-center space-x-2 px-4 py-1 rounded-full transition-all duration-300 ${
                isLanding
                  ? (scrolled ? 'bg-green-50 hover:bg-green-100' : 'bg-white/10 hover:bg-white/20')
                  : 'bg-green-50 hover:bg-green-100'
              }`}>
                <User className={`h-5 w-5 transition-colors duration-300 ${
                  isLanding 
                    ? (scrolled ? 'text-green-600' : 'text-green-200') 
                    : 'text-green-600'
                }`} />
                <span className={`text-base font-semibold transition-colors duration-300 ${
                  isLanding 
                    ? (scrolled ? 'text-gray-900' : 'text-white') 
                    : 'text-gray-900'
                }`}>{session.user.name}</span>
                <Badge variant="outline" className={`capitalize px-3 py-1 text-sm font-medium transition-all duration-300 ${
                  isLanding 
                    ? (scrolled ? 'bg-green-100 text-green-700 border-green-300' : 'bg-green-500/20 text-green-100 border-green-400/30') 
                    : 'bg-green-100 text-green-700 border-green-300'
                }`}>
                  {isSwitchingRole ? <Loader2 className="h-3 w-3 animate-spin" /> : pageRole}
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleRoleChange('donor')} disabled={isSwitchingRole || pageRoleKey === 'donor'}>
                <UserCheck className="h-4 w-4 mr-2" />
                Switch to Donor
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleRoleChange('receiver')} disabled={isSwitchingRole || pageRoleKey === 'receiver'}>
                <UserCheck className="h-4 w-4 mr-2" />
                Switch to Receiver
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {(session?.user as any)?.role === 'admin' && (
                <DropdownMenuItem onClick={() => router.push('/admin')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Admin Dashboard
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center space-x-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className={`transition-colors duration-300 ${
                isLanding 
                  ? (scrolled ? 'text-gray-900 hover:text-green-600' : 'text-white hover:text-green-200') 
                  : 'text-gray-900 hover:text-green-600'
              }`}>Sign In</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all duration-300">Get Started</Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
} 