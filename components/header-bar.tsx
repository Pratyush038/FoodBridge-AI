'use client';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, User, LogOut, Loader2, UserCheck, Settings } from 'lucide-react';
import { useState } from 'react';
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
  const userRole = (session?.user as any)?.role || 'User';
  const pathname = usePathname();
  const router = useRouter();

  // Landing page style
  const isLanding = pathname === '/';

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
          ? `fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[96vw] max-w-7xl rounded-full bg-[rgba(24,28,38,0.85)] shadow-xl backdrop-blur-2xl flex items-center justify-between px-10 py-3 border border-white/10 transition-all`
          : `fixed top-0 left-0 right-0 z-50 w-full bg-white shadow-sm flex items-center justify-between px-6 py-1 border-b border-gray-200`
      }
      style={isLanding ? { boxShadow: '0 6px 32px 0 rgba(24,28,38,0.10)' } : {}}
    >
      {/* Logo and About Us */}
      <div className="flex items-center space-x-6">
        <Link href="/" className="flex items-center space-x-2">
          <Heart className={`h-7 w-7 ${isLanding ? 'text-green-500' : 'text-green-600'}`} />
          <span className={`text-2xl font-extrabold ${isLanding ? 'text-white' : 'text-gray-900'} tracking-tight`}>FoodBridge AI</span>
        </Link>
        <Link href="/about" className={`text-lg font-semibold ${isLanding ? 'text-gray-200' : 'text-gray-700'} hover:text-green-500 transition-colors px-3 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400/50`}>About Us</Link>
      </div>

      {/* User Profile & Role Switcher */}
      <div className="flex items-center">
        {session?.user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 px-4 py-1 rounded-full bg-gray-100/70">
                <User className={`h-5 w-5 ${isLanding ? 'text-gray-200' : 'text-gray-500'}`} />
                <span className={`text-base font-semibold ${isLanding ? 'text-white' : 'text-gray-900'}`}>{session.user.name}</span>
                <Badge variant="outline" className={`capitalize ${isLanding ? 'bg-white/20 text-white border-white/30' : 'bg-gray-200 text-gray-700 border-gray-300'} px-3 py-1 text-sm font-medium`}>
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
              <Button variant="ghost" size="sm" className={isLanding ? 'text-white' : 'text-gray-900'}>Sign In</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white">Get Started</Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
} 