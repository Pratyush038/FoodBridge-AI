'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
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
import { Heart, Search, CheckCircle, Users, MapPin, Clock, Phone, Bell, Plus, ExternalLink, Filter } from 'lucide-react';
import { 
  FoodDonation, 
  FoodRequirement, 
  listenToAvailableDonations, 
  getRequirementsByReceiver,
  updateDonationStatus,
  createMatch
} from '@/lib/firebase-service';
import { MapMarker, calculateDistance } from '@/lib/maps';
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

  const stats = {
    activeRequests: myRequirements.filter(r => r.status === 'active').length,
    matchedDonations: myRequirements.filter(r => r.status === 'matched').length,
    peopleFed: myRequirements.reduce((acc, r) => acc + parseInt(r.servingSize) || 0, 0),
    partnersConnected: new Set(availableDonations.map(d => d.donorName)).size
  };

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
    if (session?.user) {
      const userId = (session.user as any).id || session.user.email || 'current-user';
      console.log('🔄 Refreshing receiver data for user:', userId);
      getRequirementsByReceiver(userId, (requirements) => {
        console.log('🎯 Requirements refreshed:', requirements.length);
        setMyRequirements(requirements);
      });
    }
  }, [session?.user]);

  useEffect(() => {
    if (status === 'loading') {
      return; // Still loading session
    }

    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.log('⏰ Loading timeout reached, showing dashboard with available data');
      setLoading(false);
    }, 5000); // 5 second timeout

    if (session?.user) {
      const userId = (session.user as any).id || session.user.email || 'current-user';
      console.log('🔍 Loading receiver data for user:', userId);
      
      // Listen to available donations
      const unsubscribeDonations = listenToAvailableDonations((donations) => {
        console.log('📦 Available donations loaded:', donations.length);
        setAvailableDonations(donations);
        
        // Create map markers for donations
        const markers: MapMarker[] = donations.map(donation => ({
          id: donation.id!,
          position: { lat: donation.location.lat, lng: donation.location.lng },
          title: donation.foodType,
          type: 'donor',
          info: {
            name: donation.donorName,
            description: `${donation.quantity} ${donation.unit} of ${donation.foodType}`,
            contact: donation.pickupTime ? `Pickup: ${donation.pickupTime}` : undefined
          }
        }));
        setMapMarkers(markers);
        clearTimeout(loadingTimeout);
        setLoading(false);
      });

      // Get user's requirements
      fetchReceiverData();
      const unsubscribeRequirements = getRequirementsByReceiver(userId, (requirements) => {
        console.log('🎯 Requirements loaded:', requirements.length);
        setMyRequirements(requirements);
      });

      return () => {
        clearTimeout(loadingTimeout);
        unsubscribeDonations();
        unsubscribeRequirements();
      };
    } else {
      // If no session, still show the page with mock data
      console.log('👤 No session, showing mock data');
      clearTimeout(loadingTimeout);
      setLoading(false);
    }
  }, [session, status, fetchReceiverData]);

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
    if (!session?.user) return;

    try {
      const userId = (session.user as any).id;
      const organizationName = (session.user as any).organizationName || session.user.name;
      
      // Update donation status
      await updateDonationStatus(donation.id!, 'matched', organizationName);
      
      // Create match record
      await createMatch({
        donationId: donation.id!,
        requirementId: '', // Could be linked to a specific requirement
        donorId: donation.donorId,
        receiverId: userId,
        status: 'confirmed',
        distance: 0, // Calculate actual distance
        matchScore: 100
      });

      toast.success('Pickup confirmed! You will receive contact details shortly.');
    } catch (error) {
      console.error('Error confirming pickup:', error);
      toast.error('Failed to confirm pickup. Please try again.');
    }
  };

  const handleRequirementSuccess = () => {
    toast.success('🎯 Requirement Posted Successfully!', {
      description: 'Your requirement has been added to the requests and is now visible to donors.',
      duration: 4000,
    });
    // Refresh the requirements data
    fetchReceiverData();
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

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    // <AuthWrapper requiredRole="receiver">
      <div className="min-h-screen bg-gray-50 pt-16">
        <HeaderBar />
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
          <h1 className="text-3xl font-bold mb-6">Receiver Dashboard</h1>
          
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Requests</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.activeRequests}</p>
                    </div>
                    <Heart className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Matched Donations</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.matchedDonations}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">People Fed</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.peopleFed}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Partners Connected</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.partnersConnected}</p>
                    </div>
                    <Users className="h-8 w-8 text-purple-600" />
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
                      Food donations available for pickup in your area
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {availableDonations.length === 0 ? (
                      <div className="text-center py-8">
                        <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No available donations in your area</p>
                        <p className="text-sm text-gray-500 mt-2">Check back later or post a requirement</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {availableDonations.slice(0, 5).map((donation) => (
                          <div key={donation.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{donation.foodType}</h4>
                                <p className="text-sm text-gray-600 mt-1">{donation.donorName}</p>
                                <div className="flex items-center space-x-4 mt-2">
                                  <span className="text-sm text-gray-500">
                                    {donation.quantity} {donation.unit} • {donation.description}
                                  </span>
                                  <Badge className={getStatusColor(donation.status)}>
                                    {donation.status}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                                  <div className="flex items-center space-x-1">
                                    <MapPin className="h-4 w-4" />
                                    <span>{donation.location.address}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Clock className="h-4 w-4" />
                                    <span>Pickup: {new Date(donation.pickupTime).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleConfirmPickup(donation)}
                                className="ml-4"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Confirm Pickup
                              </Button>
                            </div>
                          </div>
                        ))}
                        {availableDonations.length > 5 && (
                          <div className="text-center pt-4">
                            <Button variant="outline" onClick={handleViewAllMatches}>
                              View All {availableDonations.length} Donations
                            </Button>
                          </div>
                        )}
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
                                        📍 {requirement.location.address}
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
                                        ⏰ {new Date(requirement.neededBy).toLocaleDateString()}
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
                                      <p className="text-sm font-medium text-green-800">✓ Successfully Matched</p>
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
      </div>
    // </AuthWrapper>
  );
}