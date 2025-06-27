'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
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
import { Upload, History, TrendingUp, Users, MapPin, Clock, Bell, Plus, ExternalLink, Phone, Search, Filter } from 'lucide-react';
import { getDonationsByDonor, listenToActiveRequirements, FoodDonation } from '@/lib/firebase-service';
import { MapMarker } from '@/lib/maps';
import { toast } from 'sonner';

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

  const stats = {
    totalDonations: donations.length,
    mealsProvided: donations.reduce((acc, d) => acc + parseInt(d.quantity) || 0, 0),
    organizationsHelped: new Set(donations.filter(d => d.matchedWith).map(d => d.matchedWith)).size,
    impactScore: donations.filter(d => d.status === 'completed').length / Math.max(donations.length, 1) * 100
  };

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
    if (session?.user) {
      const userId = (session.user as any).id || session.user.email || 'current-user';
      console.log('🔄 Refreshing donor data for user:', userId);
      getDonationsByDonor(userId, (donationData) => {
        console.log('📦 Donations refreshed:', donationData.length);
        setDonations(donationData);
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

    fetchDonorData();

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
    toast.success('🎉 Donation Posted Successfully!', {
      description: 'Your donation has been added to the history and is now visible to organizations.',
      duration: 4000,
    });
    // Refresh the donations data
    fetchDonorData();
  };

  const handleContactOrganization = (requirement: any) => { // Changed FoodRequirement to any as FoodRequirement is removed
    toast.success(`Contacting ${requirement.organizationName}...`);
    // In a real app, this would open a chat or contact form
    console.log('Contacting organization:', requirement.organizationName);
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

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    // <AuthWrapper requiredRole="donor">
      <div className="min-h-screen bg-gray-50 pt-16">
        <HeaderBar />
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
          <h1 className="text-3xl font-bold mb-6">Donor Dashboard</h1>
          
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Donations</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalDonations}</p>
                    </div>
                    <Upload className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Meals Provided</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.mealsProvided}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Organizations Helped</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.organizationsHelped}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Impact Score</p>
                      <p className="text-3xl font-bold text-gray-900">{Math.round(stats.impactScore)}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-orange-600" />
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
                      Organizations looking for food donations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {activeRequirements.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No active requirements at the moment</p>
                        <p className="text-sm text-gray-500 mt-2">Check back later for new opportunities</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activeRequirements.slice(0, 5).map((requirement) => (
                          <div key={requirement.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{requirement.title}</h4>
                                <p className="text-sm text-gray-600 mt-1">{requirement.organizationName}</p>
                                <div className="flex items-center space-x-4 mt-2">
                                  <span className="text-sm text-gray-500">
                                    {requirement.quantity} {requirement.unit} of {requirement.foodType}
                                  </span>
                                  <Badge className={getStatusColor(requirement.status)}>
                                    {requirement.status}
                                  </Badge>
                                  <Badge className={getUrgencyColor(requirement.urgency)}>
                                    {requirement.urgency} urgency
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mt-2">{requirement.description}</p>
                                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                                  <div className="flex items-center space-x-1">
                                    <MapPin className="h-4 w-4" />
                                    <span>{requirement.location.address}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Clock className="h-4 w-4" />
                                    <span>Needed by {new Date(requirement.neededBy).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleContactOrganization(requirement)}
                                className="ml-4"
                              >
                                <Phone className="h-4 w-4 mr-2" />
                                Contact
                              </Button>
                            </div>
                          </div>
                        ))}
                        {activeRequirements.length > 5 && (
                          <div className="text-center pt-4">
                            <Button variant="outline" onClick={handleViewAllOpportunities}>
                              View All {activeRequirements.length} Opportunities
                            </Button>
                          </div>
                        )}
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
                    {donations.length === 0 ? (
                      <div className="text-center py-8">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No donations yet</p>
                        <p className="text-sm text-gray-500 mt-2">Start by uploading your first food donation</p>
                        <Button 
                          onClick={() => {
                            const uploadTab = document.querySelector('[data-value="upload"]') as HTMLElement;
                            if (uploadTab) uploadTab.click();
                          }}
                          className="mt-4"
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
                                          📅 {new Date(donation.pickupTime).toLocaleDateString()} at {new Date(donation.pickupTime).toLocaleTimeString()}
                                        </p>
                                      </div>
                                    )}
                                    {donation.expiryDate && (
                                      <div>
                                        <p className="text-sm font-medium text-gray-700">Expiry Date</p>
                                        <p className="text-sm text-red-600">
                                          ⏰ {new Date(donation.expiryDate).toLocaleDateString()}
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {donation.matchedWith && (
                                    <div className="mb-3 p-3 bg-green-50 rounded-lg">
                                      <p className="text-sm font-medium text-green-800">✓ Matched Successfully</p>
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
                                      <img 
                                        src={donation.imageUrl} 
                                        alt={donation.foodType}
                                        className="w-24 h-24 object-cover rounded-lg border"
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
      </div>
    // </AuthWrapper>
  );
}