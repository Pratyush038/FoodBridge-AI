'use client';

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import HeaderBar from '@/components/header-bar';
import AuthWrapper from '@/components/auth-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Heart, Search, CheckCircle, Users, MapPin, Clock, Phone, Bell, Plus, ExternalLink, Filter } from 'lucide-react';
import { 
  FoodDonation, 
  FoodRequirement, 
  listenToAvailableDonations, 
  getRequirementsByReceiver,
  updateDonationStatus,
  createMatch,
  createRequirement
} from '@/lib/firebase-service';
import { ensureUserInSupabase } from '@/lib/user-service';
import { MapMarker } from '@/components/map-component';
import { toast } from 'sonner';

// Lazy load heavy components
const RequirementsForm = dynamic(() => import('@/components/requirements-form'), {
  loading: () => <div className="p-4 text-center">Loading form...</div>,
  ssr: false
});

const MapComponent = dynamic(() => import('@/components/map-component'), {
  loading: () => <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">Loading map...</div>,
  ssr: false
});

export default function ReceiverDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [availableDonations, setAvailableDonations] = useState<FoodDonation[]>([]);
  const [myRequirements, setMyRequirements] = useState<FoodRequirement[]>([]);
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [ngoId, setNgoId] = useState<string | null>(null);
  const [donationsSort, setDonationsSort] = useState('expiry');
  const [selectedDonation, setSelectedDonation] = useState<FoodDonation | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  // Calculate stats using useMemo to ensure they update when data changes
  const stats = useMemo(() => {
    const now = new Date();
    
    // Unfulfilled requests (active)
    const unfulfilledRequests = myRequirements.filter(r => r.status === 'active').length;
    
    // Available donations nearby (can pick up)
    const availableNearby = availableDonations.filter(d => 
      d.status === 'pending'
    ).length;
    
    // Urgent needs (high urgency active requests)
    const urgentNeeds = myRequirements.filter(r => 
      r.status === 'active' && r.urgency === 'high'
    ).length;
    
    // Fulfilled this month
    const fulfilledThisMonth = myRequirements.filter(r => {
      if (r.status !== 'fulfilled') return false;
      const fulfilledDate = r.matchedAt ? new Date(r.matchedAt) : new Date(r.createdAt);
      return fulfilledDate.getMonth() === now.getMonth() && 
             fulfilledDate.getFullYear() === now.getFullYear();
    }).length;
    
    const calculatedStats = {
      unfulfilledRequests,
      availableNearby,
      urgentNeeds,
      fulfilledThisMonth
    };
    
    console.log('📊 Receiver stats updated:', calculatedStats);
    return calculatedStats;
  }, [myRequirements, availableDonations]);

  // Filter requirements based on search and filters
  const filteredRequirements = myRequirements.filter(requirement => {
    const matchesSearch = searchTerm === '' || 
      requirement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      requirement.foodType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      requirement.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      requirement.organizationName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || requirement.status === statusFilter;
    const matchesUrgency = urgencyFilter === 'all' || requirement.urgency === urgencyFilter;
    
    return matchesSearch && matchesStatus && matchesUrgency;
  });

  const fetchReceiverData = useCallback(() => {
    if (session?.user && ngoId) {
      console.log('🔄 Refreshing receiver data for user:', ngoId);
      getRequirementsByReceiver(ngoId, (requirements) => {
        console.log('Requirements refreshed:', requirements.length);
        setMyRequirements(requirements);
      });
    }
  }, [session?.user, ngoId]);

  // Ensure user exists in Supabase
  useEffect(() => {
    if (session?.user && !ngoId) {
      const initializeUser = async () => {
        const user = session.user!;
        const userInfo = {
          id: (user as any).id || user.email || 'temp-id',
          email: user.email || '',
          name: user.name || 'Anonymous Receiver',
          role: 'receiver' as const,
          organizationName: (user as any).organizationName || user.name || 'Organization',
        };
        
        const { ngoId: supabaseNgoId } = await ensureUserInSupabase(userInfo);
        console.log('✅ User ensured in Supabase with NGO ID:', supabaseNgoId);
        setNgoId(supabaseNgoId || userInfo.id);
      };
      
      initializeUser();
    }
  }, [session?.user, ngoId]);

  useEffect(() => {
    if (status === 'loading') {
      return; // Still loading session
    }

    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.log('Loading timeout reached, showing dashboard with available data');
      setLoading(false);
    }, 5000); // 5 second timeout

    if (session?.user && ngoId) {
      console.log('🔍 Loading receiver data for NGO:', ngoId);
      
      // Fetch map data (donors and NGOs)
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
      
      // Listen to available donations
      const unsubscribeDonations = listenToAvailableDonations((donations) => {
        console.log('Available donations loaded:', donations.length);
        setAvailableDonations(donations);
        clearTimeout(loadingTimeout);
        setLoading(false);
      });

      // Get user's requirements - this returns a Promise
      let unsubscribeRequirements: (() => void) | undefined;
      getRequirementsByReceiver(ngoId, (requirements) => {
        console.log('Requirements loaded:', requirements.length);
        setMyRequirements(requirements);
      }).then((unsub) => {
        unsubscribeRequirements = unsub;
      });

      return () => {
        clearTimeout(loadingTimeout);
        unsubscribeDonations();
        if (unsubscribeRequirements) {
          unsubscribeRequirements();
        }
      };
    } else {
      // If no session or no ngoId yet, still show the page
      console.log('No session or NGO ID not initialized yet');
      clearTimeout(loadingTimeout);
      setLoading(false);
    }
  }, [session, status, ngoId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'available': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
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

  const handleConfirmPickup = async (donation: FoodDonation) => {
    if (!session?.user || !ngoId) {
      toast.error('Please wait while we verify your session...');
      return;
    }

    // Optimistically remove from UI immediately
    setAvailableDonations(prev => prev.filter(d => d.id !== donation.id));

    try {
      toast.loading('Confirming pickup...', { id: 'confirm-pickup' });
      
      const organizationName = (session.user as any).organizationName || session.user.name;
      
      // Create a requirement record that is fulfilled by this donation
      const newRequirementId = await createRequirement({
        receiverId: ngoId,
        receiverName: organizationName,
        organizationName: organizationName,
        title: `Picked up: ${donation.foodType}`,
        foodType: donation.foodType,
        quantity: donation.quantity,
        unit: donation.unit,
        description: `Picked up from ${donation.donorName}`,
        location: donation.location,
        neededBy: donation.expiryDate,
        urgency: 'low',
        servingSize: donation.quantity,
        status: 'fulfilled' as const,
        matchedWith: donation.donorName,
        matchedAt: new Date().toISOString()
      });
      
      console.log('✅ Created requirement with ID:', newRequirementId);
      
      // Update the donation status
      await updateDonationStatus(donation.id!, 'completed', organizationName);
      
      // Try to create a match record (optional - non-blocking)
      try {
        await createMatch({
          donationId: donation.id!,
          requirementId: newRequirementId,
          donorId: donation.donorId,
          receiverId: ngoId,
          status: 'confirmed',
          distance: 0,
          matchScore: 100
        }, parseFloat(donation.quantity)); // Pass actual quantity
        console.log('✅ Match record created');
      } catch (matchError) {
        console.warn('⚠️ Failed to create match record (non-critical):', matchError);
      }
      
      // Refresh data to update statistics
      fetchReceiverData();
      
      toast.success('Pickup confirmed! Requirement created and statistics updated.', { 
        id: 'confirm-pickup',
        duration: 4000 
      });
    } catch (error) {
      console.error('Error confirming pickup:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to confirm pickup: ${errorMessage}`, { id: 'confirm-pickup' });
      
      // Add back to list if it failed (Firebase listener will update eventually)
      setAvailableDonations(prev => [...prev, donation]);
    }
  };

  const handleRequirementSuccess = () => {
    toast.success('Requirement Posted Successfully!', {
      description: 'Your requirement has been added to the requests and is now visible to donors.',
      duration: 4000,
    });
    // Refresh the requirements data
    fetchReceiverData();
  };

  const handleViewContactDetails = (donation: FoodDonation) => {
    setSelectedDonation(donation);
    setShowContactModal(true);
  };

  const handleViewAllMatches = () => {
    // Switch to matches tab
    const matchesTab = document.querySelector('[data-value="matches"]') as HTMLElement;
    if (matchesTab) {
      matchesTab.click();
    }
  };

  const handleViewMap = () => {
    // Switch to map tab
    const mapTab = document.querySelector('[data-value="map"]') as HTMLElement;
    if (mapTab) {
      mapTab.click();
    }
  };

  const handleViewRequests = () => {
    // Switch to requests tab
    const requestsTab = document.querySelector('[data-value="requests"]') as HTMLElement;
    if (requestsTab) {
      requestsTab.click();
    }
  };

  // Sort available donations based on selected criteria
  const sortDonations = (donations: FoodDonation[]) => {
    const sorted = [...donations];
    
    switch (donationsSort) {
      case 'expiry':
        return sorted.sort((a, b) => 
          new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
        );
      
      case 'posted':
        return sorted.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      
      case 'quantity':
        return sorted.sort((a, b) => parseInt(b.quantity) - parseInt(a.quantity));
      
      case 'distance':
        // For now, sort by latitude (simple proximity estimation)
        // TODO: Implement proper Haversine distance calculation with user location
        return sorted.sort((a, b) => {
          const userLat = session?.user ? 12.9716 : 0; // Default to Bangalore center, update with actual NGO location
          const distA = Math.abs(a.location.lat - userLat);
          const distB = Math.abs(b.location.lat - userLat);
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
    // <AuthWrapper requiredRole="receiver">
      <div className="min-h-screen bg-gray-50 pt-16">
        <HeaderBar />
        <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
          <h1 className="text-4xl font-bold mb-2 tracking-tight text-gray-900">Receiver Dashboard</h1>
          <p className="text-gray-600 mb-8 text-lg">Manage your food requirements and connect with donors</p>
          
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-up" key={`stats-${myRequirements.length}-${availableDonations.length}`}>
              <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border-l-4 border-l-red-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Unfulfilled Requests</p>
                      <p className="text-3xl font-bold text-gray-900 tracking-tight">{stats.unfulfilledRequests}</p>
                      <p className="text-xs text-gray-500 mt-1">Still need donors</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-full">
                      <Heart className="h-8 w-8 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border-l-4 border-l-green-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Available Nearby</p>
                      <p className="text-3xl font-bold text-gray-900 tracking-tight">{stats.availableNearby}</p>
                      <p className="text-xs text-gray-500 mt-1">Ready for pickup</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-full">
                      <MapPin className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border-l-4 border-l-orange-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Urgent Needs</p>
                      <p className="text-3xl font-bold text-gray-900 tracking-tight">{stats.urgentNeeds}</p>
                      <p className="text-xs text-gray-500 mt-1">High priority</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-full">
                      <Bell className="h-8 w-8 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border-l-4 border-l-blue-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Fulfilled This Month</p>
                      <p className="text-3xl font-bold text-gray-900 tracking-tight">{stats.fulfilledThisMonth}</p>
                      <p className="text-xs text-gray-500 mt-1">Successfully received</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-full">
                      <CheckCircle className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="requirements" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="requirements">Post Requirements</TabsTrigger>
                <TabsTrigger value="matches">Available Donations</TabsTrigger>
                <TabsTrigger value="requests">My Requests</TabsTrigger>
                <TabsTrigger value="map">Map</TabsTrigger>
              </TabsList>

              <TabsContent value="requirements" className="space-y-6">
                <RequirementsForm onSuccess={handleRequirementSuccess} />
              </TabsContent>

              <TabsContent value="matches" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Search className="h-5 w-5" />
                      <span>Available Donations</span>
                    </CardTitle>
                    <CardDescription>
                      Food donations available for pickup in your area - {availableDonations.length} available
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading available donations...</p>
                      </div>
                    ) : availableDonations.length === 0 ? (
                      <div className="text-center py-12 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
                        <Search className="h-16 w-16 text-green-400 mx-auto mb-4" />
                        <p className="text-lg font-semibold text-gray-800 mb-2">No Available Donations</p>
                        <p className="text-sm text-gray-600 mb-4">
                          There are no food donations available for pickup in your area at the moment
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
                          <Select value={donationsSort} onValueChange={setDonationsSort}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="expiry">Expiry (Soonest First)</SelectItem>
                              <SelectItem value="distance">Distance (Nearest First)</SelectItem>
                              <SelectItem value="quantity">Quantity (Largest First)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {sortDonations(availableDonations).map((donation) => (
                          <div 
                            key={donation.id} 
                            className="border border-gray-200 rounded-xl p-6 hover:border-green-400 hover:shadow-lg transition-all duration-300 bg-white group"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-3">
                                  <h4 className="font-bold text-gray-900 text-lg tracking-tight group-hover:text-green-600 transition-colors">{donation.foodType}</h4>
                                  <Badge className={getStatusColor(donation.status)}>
                                    {donation.status === 'pending' ? '✅ Available' : donation.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 font-medium mb-3">{donation.donorName}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                  <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 font-medium">
                                    {donation.quantity} {donation.unit}
                                  </Badge>
                                  {donation.description && (
                                    <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 font-medium">
                                      {donation.description}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-600">
                                  <div className="flex items-center space-x-1.5">
                                    <MapPin className="h-4 w-4 text-green-600" />
                                    <span>{donation.location.address}</span>
                                  </div>
                                  <div className="flex items-center space-x-1.5">
                                    <Clock className="h-4 w-4 text-orange-600" />
                                    <span>Pickup: {new Date(donation.pickupTime).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="ml-4 flex flex-col gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleViewContactDetails(donation)}
                                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                  <Phone className="h-4 w-4 mr-2" />
                                  Contact Donor
                                </Button>
                                {donation.status !== 'matched' && donation.status !== 'completed' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleConfirmPickup(donation)}
                                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all duration-200"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Confirm Pickup
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="text-center pt-4 border-t">
                          <p className="text-sm text-gray-600 mb-2">
                            Showing all {availableDonations.length} available donations
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="requests" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Heart className="h-5 w-5" />
                      <span>My Requirements History</span>
                    </CardTitle>
                    <CardDescription>
                      Track your posted requirements and their impact on your organization
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {myRequirements.length === 0 ? (
                      <div className="text-center py-8">
                        <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No requirements posted yet</p>
                        <p className="text-sm text-gray-500 mt-2">Start by posting your first food requirement</p>
                        <Button 
                          onClick={() => {
                            const requirementsTab = document.querySelector('[data-value="requirements"]') as HTMLElement;
                            if (requirementsTab) requirementsTab.click();
                          }}
                          className="mt-4"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Post First Requirement
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* History Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600">
                              {myRequirements.filter(r => r.status === 'active').length}
                            </p>
                            <p className="text-sm text-gray-600">Active</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">
                              {myRequirements.filter(r => r.status === 'matched').length}
                            </p>
                            <p className="text-sm text-gray-600">Matched</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-purple-600">
                              {myRequirements.filter(r => r.status === 'fulfilled').length}
                            </p>
                            <p className="text-sm text-gray-600">Fulfilled</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-orange-600">
                              {myRequirements.reduce((acc, r) => acc + parseInt(r.servingSize) || 0, 0)}
                            </p>
                            <p className="text-sm text-gray-600">People Served</p>
                          </div>
                        </div>

                        {/* Requirements List */}
                        <div className="space-y-4">
                          {/* Search and Filter Controls */}
                          <div className="flex flex-col md:flex-row gap-4 p-4 bg-white border rounded-lg">
                            <div className="flex-1">
                              <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                  placeholder="Search requirements by title, food type, or organization..."
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
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="matched">Matched</SelectItem>
                                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                                </SelectContent>
                              </Select>
                              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Urgency" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Urgency</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="low">Low</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Results Count */}
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-600">
                              Showing {filteredRequirements.length} of {myRequirements.length} requirements
                            </p>
                            {(searchTerm || statusFilter !== 'all' || urgencyFilter !== 'all') && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSearchTerm('');
                                  setStatusFilter('all');
                                  setUrgencyFilter('all');
                                }}
                              >
                                Clear Filters
                              </Button>
                            )}
                          </div>

                          {filteredRequirements
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .map((requirement) => (
                            <div key={requirement.id} className="border rounded-lg p-6 hover:bg-gray-50 transition-colors">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <h4 className="font-semibold text-gray-900 text-lg">{requirement.title}</h4>
                                    <Badge className={getStatusColor(requirement.status)}>
                                      {requirement.status}
                                    </Badge>
                                    <Badge className={getUrgencyColor(requirement.urgency)}>
                                      {requirement.urgency} urgency
                                    </Badge>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                    <div>
                                      <p className="text-sm font-medium text-gray-700">Organization & Food Type</p>
                                      <p className="text-sm text-gray-600">
                                        {requirement.organizationName} • {requirement.foodType}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-700">Posted</p>
                                      <p className="text-sm text-gray-600">
                                        {new Date(requirement.createdAt).toLocaleDateString()} at {new Date(requirement.createdAt).toLocaleTimeString()}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                    <div>
                                      <p className="text-sm font-medium text-gray-700">Quantity & Serving Size</p>
                                      <p className="text-sm text-gray-600">
                                        {requirement.quantity} {requirement.unit} • {requirement.servingSize} people
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-700">Location</p>
                                      <p className="text-sm text-gray-600">
                                        {requirement.location.address}
                                      </p>
                                    </div>
                                  </div>

                                  {requirement.description && (
                                    <div className="mb-3">
                                      <p className="text-sm font-medium text-gray-700">Description</p>
                                      <p className="text-sm text-gray-600">{requirement.description}</p>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                    <div>
                                      <p className="text-sm font-medium text-gray-700">Needed By</p>
                                      <p className="text-sm text-red-600">
                                        {new Date(requirement.neededBy).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-700">Last Updated</p>
                                      <p className="text-sm text-gray-600">
                                        {new Date(requirement.updatedAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>

                                  {requirement.matchedWith && (
                                    <div className="mb-3 p-3 bg-green-50 rounded-lg">
                                      <p className="text-sm font-medium text-green-800">Successfully Matched</p>
                                      <p className="text-sm text-green-700">
                                        Donor: {requirement.matchedWith}
                                      </p>
                                      {requirement.matchedAt && (
                                        <p className="text-sm text-green-600">
                                          Matched on: {new Date(requirement.matchedAt).toLocaleDateString()}
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {/* Action Buttons */}
                                  <div className="flex space-x-2 mt-4">
                                    {requirement.status === 'active' && (
                                      <Button size="sm" variant="outline">
                                        <Phone className="h-4 w-4 mr-2" />
                                        Contact Donors
                                      </Button>
                                    )}
                                    {requirement.status === 'matched' && (
                                      <Button size="sm" variant="outline">
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Confirm Pickup
                                      </Button>
                                    )}
                                    <Button size="sm" variant="outline">
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      View Details
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Export/Share Options */}
                        <div className="flex justify-center pt-4 border-t">
                          <Button variant="outline" className="mr-2">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Export Requirements
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
                      View available donations and your organization&apos;s location
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
              <DialogTitle>Donor Contact Details</DialogTitle>
              <DialogDescription>
                Contact information for the matched donation
              </DialogDescription>
            </DialogHeader>
            {selectedDonation && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-2">
                    {selectedDonation.donorName || 'Donor'}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 mr-2 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-700">Pickup Address:</p>
                        <p className="text-gray-600">{selectedDonation.location.address}</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Clock className="h-4 w-4 mr-2 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-700">Pickup Time:</p>
                        <p className="text-gray-600">
                          {new Date(selectedDonation.pickupTime).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-green-200 mt-3">
                      <p className="font-medium text-gray-700 mb-1">Donation Details:</p>
                      <p className="text-gray-600">
                        {selectedDonation.quantity} {selectedDonation.unit} - {selectedDonation.foodType}
                      </p>
                      {selectedDonation.description && (
                        <p className="text-gray-600 text-xs mt-1">{selectedDonation.description}</p>
                      )}
                    </div>
                    <div className="pt-2 border-t border-green-200 mt-3">
                      <p className="text-xs text-gray-500">
                        Please coordinate with the donor at the pickup address during the scheduled time.
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