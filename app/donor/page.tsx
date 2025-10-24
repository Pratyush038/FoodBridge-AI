'use client';

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import HeaderBar from '@/components/header-bar';
import AuthWrapper from '@/components/auth-wrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, History, TrendingUp, Users, MapPin, Clock, Bell, Plus, ExternalLink, Phone, Search, Filter, CheckCircle, Heart } from 'lucide-react';
import { getDonationsByDonor, listenToActiveRequirements, FoodDonation, FoodRequirement, updateRequirementStatus, createMatch, createDonation } from '@/lib/firebase-service';
import { ensureUserInSupabase } from '@/lib/user-service';
import { MapMarker } from '@/components/map-component';
import { toast } from 'sonner';
import Image from 'next/image';

// Lazy load heavy components
const FoodUploadForm = dynamic(() => import('@/components/food-upload-form'), {
  loading: () => <p>Loading form...</p>,
});

const MapComponent = dynamic(() => import('@/components/map-component'), {
  loading: () => <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">Loading map...</div>,
  ssr: false
});

export default function DonorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [donations, setDonations] = useState<FoodDonation[]>([]);
  const [activeRequirements, setActiveRequirements] = useState<any[]>([]);
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [donorId, setDonorId] = useState<string | null>(null);
  const [opportunitiesSort, setOpportunitiesSort] = useState('urgency');
  const [selectedRequirement, setSelectedRequirement] = useState<FoodRequirement | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  // Calculate stats using useMemo to ensure they update when data changes
  const stats = useMemo(() => {
    const now = new Date();
    
    // Active donations (not yet completed/expired)
    const activeDonations = donations.filter(d => 
      d.status === 'pending' || d.status === 'matched'
    ).length;
    
    // Completed donations this month
    const completedThisMonth = donations.filter(d => {
      if (d.status !== 'completed') return false;
      const completedDate = d.matchedAt ? new Date(d.matchedAt) : new Date(d.createdAt);
      return completedDate.getMonth() === now.getMonth() && 
             completedDate.getFullYear() === now.getFullYear();
    }).length;
    
    // Donations expiring soon (within 24 hours)
    const expiringSoon = donations.filter(d => {
      if (d.status === 'completed' || d.status === 'expired') return false;
      const expiryDate = new Date(d.expiryDate);
      const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntilExpiry > 0 && hoursUntilExpiry <= 24;
    }).length;
    
    // Available opportunities (active requirements from receivers)
    const availableOpportunities = activeRequirements.filter(r => 
      r.status === 'active'
    ).length;
    
    const calculatedStats = {
      activeDonations,
      completedThisMonth,
      expiringSoon,
      availableOpportunities
    };
    
    console.log('📊 Donor stats updated:', calculatedStats);
    return calculatedStats;
  }, [donations, activeRequirements]);

  // Filter donations based on search and filters
  const filteredDonations = donations.filter(donation => {
    const matchesSearch = searchTerm === '' || 
      donation.foodType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donation.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donation.location.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || donation.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const donationDate = new Date(donation.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - donationDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      switch (dateFilter) {
        case 'today':
          matchesDate = diffDays === 0;
          break;
        case 'week':
          matchesDate = diffDays <= 7;
          break;
        case 'month':
          matchesDate = diffDays <= 30;
          break;
        case 'year':
          matchesDate = diffDays <= 365;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const fetchDonorData = useCallback(() => {
    if (session?.user && donorId) {
      console.log('🔄 Refreshing donor data for user:', donorId);
      getDonationsByDonor(donorId, (donationData) => {
        console.log('Donations refreshed:', donationData.length);
        setDonations(donationData);
      });
    }
  }, [session?.user, donorId]);
  
  // Ensure user exists in Supabase
  useEffect(() => {
    if (session?.user && !donorId) {
      const initializeUser = async () => {
        const user = session.user!;
        const userInfo = {
          id: (user as any).id || user.email || 'temp-id',
          email: user.email || '',
          name: user.name || 'Anonymous Donor',
          role: 'donor' as const,
        };
        
        const { donorId: supabaseDonorId } = await ensureUserInSupabase(userInfo);
        console.log('✅ User ensured in Supabase with donor ID:', supabaseDonorId);
        setDonorId(supabaseDonorId || userInfo.id);
      };
      
      initializeUser();
    }
  }, [session?.user, donorId]);
  
  useEffect(() => {
    if (status === 'loading') {
      return; // Still loading session
    }

    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.log('Loading timeout reached, showing dashboard with available data');
      setLoading(false);
    }, 5000); // 5 second timeout

    fetchDonorData();

    // Fetch NGOs and Donors for map markers
    const fetchMapData = async () => {
      try {
        // Fetch NGOs
        const ngosResponse = await fetch('/api/ngos');
        const ngos = await ngosResponse.json();
        
        // Fetch Donors
        const donorsResponse = await fetch('/api/donors');
        const donors = await donorsResponse.json();
        
        const markers: MapMarker[] = [];
        
        // Add NGO markers
        if (Array.isArray(ngos)) {
          ngos.forEach((ngo: any) => {
            if (ngo.latitude && ngo.longitude) {
              markers.push({
                id: ngo.id,
                position: { lat: ngo.latitude, lng: ngo.longitude },
                title: ngo.name,
                type: 'receiver' as const,
                info: {
                  name: ngo.name,
                  description: `${ngo.organization_type} • Serves ${ngo.serving_capacity || 0} people/day`,
                  contact: ngo.phone
                }
              });
            }
          });
        }
        
        // Add Donor markers
        if (Array.isArray(donors)) {
          donors.forEach((donor: any) => {
            if (donor.latitude && donor.longitude) {
              markers.push({
                id: donor.id,
                position: { lat: donor.latitude, lng: donor.longitude },
                title: donor.organization_name || donor.name,
                type: 'donor' as const,
                info: {
                  name: donor.organization_name || donor.name,
                  description: `${donor.organization_type || 'Donor'} • ${donor.total_donations || 0} donations`,
                  contact: donor.phone
                }
              });
            }
          });
        }
        
        console.log('Map markers loaded:', markers.length);
        setMapMarkers(markers);
      } catch (error) {
        console.error('Error fetching map data:', error);
        // Use mock markers as fallback
        const { getMockMapMarkers } = await import('@/lib/mock-data');
        const mockMarkers = getMockMapMarkers();
        setMapMarkers(mockMarkers);
      }
    };
    
    fetchMapData();

    // Listen to active requirements
    const unsubscribeRequirements = listenToActiveRequirements((requirements) => {
      console.log('📋 Active requirements loaded:', requirements.length);
      setActiveRequirements(requirements);
      
      clearTimeout(loadingTimeout); // Clear timeout once data starts loading
      setLoading(false);
    });

    return () => {
      clearTimeout(loadingTimeout);
      unsubscribeRequirements();
    };
  }, [session, status, fetchDonorData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'matched': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDonationSuccess = () => {
    toast.success('Donation Posted Successfully!', {
      description: 'Your donation has been added to the history and is now visible to organizations.',
      duration: 4000,
    });
    // Refresh the donations data
    fetchDonorData();
  };

  const handleContactOrganization = (requirement: FoodRequirement) => {
    setSelectedRequirement(requirement);
    setShowContactModal(true);
  };

  const handleConfirmDropOff = async (requirement: FoodRequirement) => {
    if (!session?.user || !donorId) {
      toast.error('Please wait while we verify your session...');
      return;
    }

    // Optimistically remove from UI immediately
    setActiveRequirements(prev => prev.filter(r => r.id !== requirement.id));

    try {
      toast.loading('Confirming drop-off...', { id: 'confirm-dropoff' });
      
      const donorName = session.user.name || 'Anonymous Donor';
      
      // Ensure expiry date is in the future to satisfy database constraint
      const now = new Date();
      const requirementNeededBy = new Date(requirement.neededBy);
      // If neededBy is in the past or very close, set expiry to 24 hours from now
      const expiryDate = requirementNeededBy > now 
        ? requirement.neededBy 
        : new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      
      // Create a donation record that fulfills this requirement
      const newDonationId = await createDonation({
        donorId: donorId,
        donorName: donorName,
        foodType: requirement.foodType,
        quantity: requirement.quantity,
        unit: requirement.unit,
        description: `Fulfilling requirement: ${requirement.title}`,
        location: requirement.location,
        pickupTime: new Date().toISOString(),
        expiryDate: expiryDate,
        status: 'completed' as const,
        matchedWith: requirement.organizationName,
        matchedAt: new Date().toISOString()
      });
      
      console.log('✅ Created donation with ID:', newDonationId);
      
      // Update the requirement status
      await updateRequirementStatus(requirement.id!, 'fulfilled', donorName);
      
      // Try to create a match record (optional - non-blocking)
      try {
        await createMatch({
          donationId: newDonationId,
          requirementId: requirement.id!,
          donorId: donorId,
          receiverId: requirement.receiverId,
          status: 'confirmed',
          distance: 0,
          matchScore: 100
        }, parseFloat(requirement.quantity)); // Pass actual quantity
        console.log('✅ Match record created');
      } catch (matchError) {
        console.warn('⚠️ Failed to create match record (non-critical):', matchError);
      }
      
      // Refresh data to update statistics
      fetchDonorData();
      
      toast.success('Drop-off confirmed! Donation created and statistics updated.', { 
        id: 'confirm-dropoff',
        duration: 4000 
      });
    } catch (error) {
      console.error('Error confirming drop-off:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to confirm drop-off: ${errorMessage}`, { id: 'confirm-dropoff' });
      
      // Add back to list if it failed (Firebase listener will update eventually)
      setActiveRequirements(prev => [...prev, requirement]);
    }
  };

  const handleViewAllOpportunities = () => {
    // Switch to opportunities tab
    const opportunitiesTab = document.querySelector('[data-value="opportunities"]') as HTMLElement;
    if (opportunitiesTab) {
      opportunitiesTab.click();
    }
  };

  const handleViewMap = () => {
    // Switch to map tab
    const mapTab = document.querySelector('[data-value="map"]') as HTMLElement;
    if (mapTab) {
      mapTab.click();
    }
  };

  const handleViewHistory = () => {
    // Switch to history tab
    const historyTab = document.querySelector('[data-value="history"]') as HTMLElement;
    if (historyTab) {
      historyTab.click();
    }
  };

  // Sort opportunities based on selected criteria
  const sortOpportunities = (opportunities: any[]) => {
    const sorted = [...opportunities];
    
    switch (opportunitiesSort) {
      case 'urgency':
        return sorted.sort((a, b) => {
          const urgencyOrder = { high: 0, medium: 1, low: 2 };
          return urgencyOrder[a.urgency as keyof typeof urgencyOrder] - urgencyOrder[b.urgency as keyof typeof urgencyOrder];
        });
      
      case 'date':
        return sorted.sort((a, b) => 
          new Date(a.neededBy).getTime() - new Date(b.neededBy).getTime()
        );
      
      case 'quantity':
        return sorted.sort((a, b) => b.quantity - a.quantity);
      
      case 'distance':
        // For now, sort by latitude (simple proximity estimation)
        // TODO: Implement proper Haversine distance calculation with user location
        return sorted.sort((a, b) => {
          const userLat = session?.user ? 12.9716 : 0; // Default to Bangalore center, update with actual donor location
          const distA = Math.abs(a.location.latitude - userLat);
          const distB = Math.abs(b.location.latitude - userLat);
          return distA - distB;
        });
      
      default:
        return sorted;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600 mx-auto"></div>
          <p className="mt-6 text-gray-600 text-lg font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    // <AuthWrapper requiredRole="donor">
      <div className="min-h-screen bg-gray-50 pt-16">
        <HeaderBar />
        <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
          <h1 className="text-4xl font-bold mb-2 tracking-tight text-gray-900">Donor Dashboard</h1>
          <p className="text-gray-600 mb-8 text-lg">Share your surplus food and make an impact</p>
          
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-up" key={`stats-${donations.length}-${activeRequirements.length}`}>
              <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border-l-4 border-l-blue-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Active Donations</p>
                      <p className="text-3xl font-bold text-gray-900 tracking-tight">{stats.activeDonations}</p>
                      <p className="text-xs text-gray-500 mt-1">Currently available</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-full">
                      <Upload className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border-l-4 border-l-green-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Completed This Month</p>
                      <p className="text-3xl font-bold text-gray-900 tracking-tight">{stats.completedThisMonth}</p>
                      <p className="text-xs text-gray-500 mt-1">Successfully delivered</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-full">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border-l-4 border-l-orange-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Expiring Soon</p>
                      <p className="text-3xl font-bold text-gray-900 tracking-tight">{stats.expiringSoon}</p>
                      <p className="text-xs text-gray-500 mt-1">Within 24 hours</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-full">
                      <Bell className="h-8 w-8 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border-l-4 border-l-purple-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Open Opportunities</p>
                      <p className="text-3xl font-bold text-gray-900 tracking-tight">{stats.availableOpportunities}</p>
                      <p className="text-xs text-gray-500 mt-1">Receivers need help</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-full">
                      <Heart className="h-8 w-8 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="upload" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="upload">Upload Food</TabsTrigger>
                <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="map">Map</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-6">
                <FoodUploadForm onSuccess={handleDonationSuccess} />
              </TabsContent>

              <TabsContent value="opportunities" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5" />
                      <span>Active Requirements</span>
                    </CardTitle>
                    <CardDescription>
                      Organizations looking for food donations - {activeRequirements.length} active
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading opportunities...</p>
                      </div>
                    ) : activeRequirements.length === 0 ? (
                      <div className="text-center py-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                        <Users className="h-16 w-16 text-blue-400 mx-auto mb-4" />
                        <p className="text-lg font-semibold text-gray-800 mb-2">No Active Requirements</p>
                        <p className="text-sm text-gray-600 mb-4">
                          There are no organizations requesting food donations at the moment
                        </p>
                        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                          🔄 Refresh
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Sort Controls */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                          <div className="flex items-center space-x-2">
                            <Filter className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-700">Sort by:</span>
                          </div>
                          <Select value={opportunitiesSort} onValueChange={setOpportunitiesSort}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="urgency">Urgency (High to Low)</SelectItem>
                              <SelectItem value="date">Date Needed (Soonest First)</SelectItem>
                              <SelectItem value="quantity">Quantity (Most First)</SelectItem>
                              <SelectItem value="distance">Distance (Nearest First)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {sortOpportunities(activeRequirements).map((requirement) => (
                          <div 
                            key={requirement.id} 
                            className="border border-gray-200 rounded-xl p-6 hover:border-blue-400 hover:shadow-lg transition-all duration-300 bg-white group"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-3">
                                  <h4 className="font-bold text-gray-900 text-lg tracking-tight group-hover:text-blue-600 transition-colors">{requirement.title}</h4>
                                  {requirement.urgency === 'high' && (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 animate-pulse">
                                      URGENT
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 font-medium mb-3">{requirement.organizationName}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 font-medium">
                                    {requirement.quantity} {requirement.unit}
                                  </Badge>
                                  <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 font-medium">
                                    {requirement.foodType}
                                  </Badge>
                                  <Badge className={getUrgencyColor(requirement.urgency)}>
                                    {requirement.urgency.toUpperCase()}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-700 mt-3 leading-relaxed">{requirement.description}</p>
                                <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-600">
                                  <div className="flex items-center space-x-1.5">
                                    <MapPin className="h-4 w-4 text-blue-600" />
                                    <span>{requirement.location.address}</span>
                                  </div>
                                  <div className="flex items-center space-x-1.5">
                                    <Clock className="h-4 w-4 text-orange-600" />
                                    <span>By {new Date(requirement.neededBy).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="ml-4 flex flex-col gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleContactOrganization(requirement)}
                                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                  <Phone className="h-4 w-4 mr-2" />
                                  Contact NGO
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleConfirmDropOff(requirement)}
                                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Confirm Drop-off
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="text-center pt-4 border-t">
                          <p className="text-sm text-gray-600 mb-2">
                            Showing all {activeRequirements.length} opportunities
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <History className="h-5 w-5" />
                      <span>Donation History</span>
                    </CardTitle>
                    <CardDescription>
                      Track your past donations and their impact on the community
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading donation history...</p>
                      </div>
                    ) : donations.length === 0 ? (
                      <div className="text-center py-12 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
                        <Upload className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                        <p className="text-lg font-semibold text-gray-800 mb-2">No Donations Yet</p>
                        <p className="text-sm text-gray-600 mb-4">
                          Start making a difference by uploading your first food donation
                        </p>
                        <Button 
                          onClick={() => {
                            const uploadTab = document.querySelector('[data-value="upload"]') as HTMLElement;
                            if (uploadTab) uploadTab.click();
                          }}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Upload First Donation
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* History Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">
                              {donations.filter(d => d.status === 'completed').length}
                            </p>
                            <p className="text-sm text-gray-600">Completed</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600">
                              {donations.filter(d => d.status === 'matched').length}
                            </p>
                            <p className="text-sm text-gray-600">Matched</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-orange-600">
                              {donations.reduce((acc, d) => acc + parseInt(d.quantity) || 0, 0)}
                            </p>
                            <p className="text-sm text-gray-600">Total Units</p>
                          </div>
                        </div>

                        {/* Donations List */}
                        <div className="space-y-4">
                          {/* Search and Filter Controls */}
                          <div className="flex flex-col md:flex-row gap-4 p-4 bg-white border rounded-lg">
                            <div className="flex-1">
                              <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                  placeholder="Search donations by food type, description, or location..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="pl-10"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Status</SelectItem>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="matched">Matched</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="expired">Expired</SelectItem>
                                </SelectContent>
                              </Select>
                              <Select value={dateFilter} onValueChange={setDateFilter}>
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Date" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Time</SelectItem>
                                  <SelectItem value="today">Today</SelectItem>
                                  <SelectItem value="week">This Week</SelectItem>
                                  <SelectItem value="month">This Month</SelectItem>
                                  <SelectItem value="year">This Year</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Results Count */}
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-600">
                              Showing {filteredDonations.length} of {donations.length} donations
                            </p>
                            {(searchTerm || statusFilter !== 'all' || dateFilter !== 'all') && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSearchTerm('');
                                  setStatusFilter('all');
                                  setDateFilter('all');
                                }}
                              >
                                Clear Filters
                              </Button>
                            )}
                          </div>

                          {filteredDonations
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .map((donation) => (
                            <div key={donation.id} className="border rounded-lg p-6 hover:bg-gray-50 transition-colors">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <h4 className="font-semibold text-gray-900 text-lg">{donation.foodType}</h4>
                                    <Badge className={getStatusColor(donation.status)}>
                                      {donation.status}
                                    </Badge>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                    <div>
                                      <p className="text-sm font-medium text-gray-700">Quantity & Location</p>
                                      <p className="text-sm text-gray-600">
                                        {donation.quantity} {donation.unit} • {donation.location.address}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-700">Posted</p>
                                      <p className="text-sm text-gray-600">
                                        {new Date(donation.createdAt).toLocaleDateString()} at {new Date(donation.createdAt).toLocaleTimeString()}
                                      </p>
                                    </div>
                                  </div>

                                  {donation.description && (
                                    <div className="mb-3">
                                      <p className="text-sm font-medium text-gray-700">Description</p>
                                      <p className="text-sm text-gray-600">{donation.description}</p>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                    {donation.pickupTime && (
                                      <div>
                                        <p className="text-sm font-medium text-gray-700">Pickup Time</p>
                                        <p className="text-sm text-blue-600">
                                          {new Date(donation.pickupTime).toLocaleDateString()} at {new Date(donation.pickupTime).toLocaleTimeString()}
                                        </p>
                                      </div>
                                    )}
                                    {donation.expiryDate && (
                                      <div>
                                        <p className="text-sm font-medium text-gray-700">Expiry Date</p>
                                        <p className="text-sm text-red-600">
                                          {new Date(donation.expiryDate).toLocaleDateString()}
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {donation.matchedWith && (
                                    <div className="mb-3 p-3 bg-green-50 rounded-lg">
                                      <p className="text-sm font-medium text-green-800">Matched Successfully</p>
                                      <p className="text-sm text-green-700">
                                        Organization: {donation.matchedWith}
                                      </p>
                                      {donation.matchedAt && (
                                        <p className="text-sm text-green-600">
                                          Matched on: {new Date(donation.matchedAt).toLocaleDateString()}
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {donation.imageUrl && (
                                    <div className="mt-3">
                                      <p className="text-sm font-medium text-gray-700 mb-2">Donation Image</p>
                                      <Image 
                                        src={donation.imageUrl} 
                                        alt={donation.foodType}
                                        className="w-24 h-24 object-cover rounded-lg border"
                                        width={96}
                                        height={96}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Export/Share Options */}
                        <div className="flex justify-center pt-4 border-t">
                          <Button variant="outline" className="mr-2">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Export History
                          </Button>
                          <Button variant="outline">
                            <Bell className="h-4 w-4 mr-2" />
                            Get Impact Report
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="map" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <MapPin className="h-5 w-5" />
                      <span>Donation Map</span>
                    </CardTitle>
                    <CardDescription>
                      View your donations and nearby opportunities
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MapComponent markers={mapMarkers} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Contact Details Modal */}
        <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>NGO Contact Details</DialogTitle>
              <DialogDescription>
                Contact information for the organization
              </DialogDescription>
            </DialogHeader>
            {selectedRequirement && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    {selectedRequirement.organizationName || 'Organization'}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 mr-2 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-700">Drop-off Address:</p>
                        <p className="text-gray-600">{selectedRequirement.location.address}</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Clock className="h-4 w-4 mr-2 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-700">Needed By:</p>
                        <p className="text-gray-600">
                          {new Date(selectedRequirement.neededBy).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-blue-200 mt-3">
                      <p className="font-medium text-gray-700 mb-1">Requirement Details:</p>
                      <p className="text-gray-600">
                        {selectedRequirement.quantity} {selectedRequirement.unit} - {selectedRequirement.foodType}
                      </p>
                      <p className="text-gray-600 text-xs mt-1">
                        Serving Size: {selectedRequirement.servingSize} people
                      </p>
                      {selectedRequirement.description && (
                        <p className="text-gray-600 text-xs mt-1">{selectedRequirement.description}</p>
                      )}
                    </div>
                    <div className="pt-2 border-t border-blue-200 mt-3">
                      <p className="text-xs text-gray-500">
                        Please coordinate with the organization for the drop-off at the specified address.
                        For additional contact information, please refer to the map view.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowContactModal(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    // </AuthWrapper>
  );
}