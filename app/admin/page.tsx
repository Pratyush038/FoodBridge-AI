'use client';

import { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import HeaderBar from '@/components/header-bar';
import AuthWrapper from '@/components/auth-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, Users, Heart, TrendingUp, Clock, AlertCircle, Download, Loader2 } from 'lucide-react';
import { getAnalyticsData, FoodDonation, FoodRequirement, Match } from '@/lib/firebase-service';
import { DateRange } from 'react-day-picker';
import { subDays, isWithinInterval, parseISO } from 'date-fns';

// Lazy load heavy components
const StatsCharts = dynamic(() => import('@/components/stats-charts'), {
  loading: () => (
    <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="flex items-center space-x-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Loading charts...</span>
      </div>
    </div>
  ),
  ssr: false
});

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [donations, setDonations] = useState<FoodDonation[]>([]);
  const [requirements, setRequirements] = useState<FoodRequirement[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Memoized data processing
  const processedData = useMemo(() => {
    if (loading) return { 
      filteredDonations: [], 
      filteredRequirements: [], 
      systemStats: null, 
      recentActivity: [], 
      topDonors: [], 
      topReceivers: [] 
    };

    const filteredDonations = donations.filter(donation => {
      const donationDate = parseISO(donation.createdAt);
      const withinDateRange = !dateRange?.from || !dateRange?.to || 
        isWithinInterval(donationDate, { start: dateRange.from, end: dateRange.to });
      const matchesStatus = statusFilter === 'all' || donation.status === statusFilter;
      return withinDateRange && matchesStatus;
    });

    const filteredRequirements = requirements.filter(requirement => {
      const requirementDate = parseISO(requirement.createdAt);
      const withinDateRange = !dateRange?.from || !dateRange?.to || 
        isWithinInterval(requirementDate, { start: dateRange.from, end: dateRange.to });
      const matchesStatus = statusFilter === 'all' || requirement.status === statusFilter;
      return withinDateRange && matchesStatus;
    });

    const systemStats = {
      totalUsers: new Set([...donations.map(d => d.donorId), ...requirements.map(r => r.receiverId)]).size,
      activeDonations: filteredDonations.filter(d => d.status === 'pending').length,
      matchingRate: filteredDonations.length > 0 ? 
        (filteredDonations.filter(d => d.status === 'matched' || d.status === 'completed').length / filteredDonations.length * 100) : 0,
      wasteReduction: filteredDonations.reduce((acc, d) => acc + parseFloat(d.quantity) || 0, 0) / 1000
    };

    const recentActivity = [
      ...filteredDonations.slice(0, 10).map(d => ({
        id: d.id!,
        type: 'donation',
        user: d.donorName,
        action: `donated ${d.quantity} ${d.unit} of ${d.foodType}`,
        time: new Date(d.createdAt).toLocaleString(),
        status: d.status
      })),
      ...filteredRequirements.slice(0, 10).map(r => ({
        id: r.id!,
        type: 'request',
        user: r.organizationName,
        action: `requested ${r.quantity} ${r.unit} of ${r.foodType}`,
        time: new Date(r.createdAt).toLocaleString(),
        status: r.status
      }))
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 20);

    const donorStats = donations.reduce((acc, donation) => {
      if (!acc[donation.donorName]) {
        acc[donation.donorName] = { donations: 0, impact: 0 };
      }
      acc[donation.donorName].donations++;
      acc[donation.donorName].impact += parseFloat(donation.quantity) || 0;
      return acc;
    }, {} as Record<string, { donations: number; impact: number }>);

    const topDonors = Object.entries(donorStats)
      .map(([name, stats]) => ({
        name,
        donations: stats.donations,
        impact: `${Math.round(stats.impact)} portions`
      }))
      .sort((a, b) => b.donations - a.donations)
      .slice(0, 5);

    const receiverStats = requirements.reduce((acc, requirement) => {
      if (!acc[requirement.organizationName]) {
        acc[requirement.organizationName] = { received: 0, served: 0 };
      }
      acc[requirement.organizationName].received++;
      acc[requirement.organizationName].served += parseFloat(requirement.servingSize) || 0;
      return acc;
    }, {} as Record<string, { received: number; served: number }>);

    const topReceivers = Object.entries(receiverStats)
      .map(([name, stats]) => ({
        name,
        received: stats.received,
        served: `${Math.round(stats.served)} people`
      }))
      .sort((a, b) => b.received - a.received)
      .slice(0, 5);

    return {
      filteredDonations,
      filteredRequirements,
      systemStats,
      recentActivity,
      topDonors,
      topReceivers
    };
  }, [donations, requirements, dateRange, statusFilter, loading]);

  // Load analytics data with timeout
  const loadAnalyticsData = useCallback(async () => {
    const timeout = setTimeout(() => {
      console.log('⏰ Analytics data loading timeout, showing with available data');
      setLoading(false);
    }, 5000);

    try {
      console.log('📊 Loading analytics data...');
      const data = await getAnalyticsData();
      setDonations(data.donations || []);
      setRequirements(data.requirements || []);
      setMatches(data.matches || []);
      console.log('✅ Analytics data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading analytics data:', error);
      setDonations([]);
      setRequirements([]);
      setMatches([]);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const getActivityIcon = useCallback((type: string) => {
    switch (type) {
      case 'donation': return <Heart className="h-4 w-4 text-green-600" />;
      case 'request': return <Users className="h-4 w-4 text-blue-600" />;
      case 'match': return <TrendingUp className="h-4 w-4 text-purple-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'matched': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'fulfilled': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const exportData = useCallback(() => {
    const csvData = [
      ['Type', 'Date', 'User', 'Food Type', 'Quantity', 'Status'],
      ...processedData.filteredDonations.map(d => ['Donation', d.createdAt, d.donorName, d.foodType, `${d.quantity} ${d.unit}`, d.status]),
      ...processedData.filteredRequirements.map(r => ['Requirement', r.createdAt, r.organizationName, r.foodType, `${r.quantity} ${r.unit}`, r.status])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `foodbridge-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }, [processedData]);

  if (loading) {
    return (
      <AuthWrapper requiredRole="admin">
        <div className="min-h-screen bg-gray-50 pt-16">
          <HeaderBar />
          <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
            
            {/* Loading skeleton */}
            <div className="space-y-8">
              {/* Stats skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                          <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                        </div>
                        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Content skeleton */}
              <Card>
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-32 animate-pulse mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                          <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                        </div>
                        <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper requiredRole="admin">
      <div className="min-h-screen bg-gray-50 pt-16">
        <HeaderBar />
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
          <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
          
          <div className="space-y-8">
            {/* Stats Overview */}
            {processedData.systemStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Users</p>
                        <p className="text-3xl font-bold text-gray-900">{processedData.systemStats.totalUsers}</p>
                      </div>
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Donations</p>
                        <p className="text-3xl font-bold text-gray-900">{processedData.systemStats.activeDonations}</p>
                      </div>
                      <Heart className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Matching Rate</p>
                        <p className="text-3xl font-bold text-gray-900">{Math.round(processedData.systemStats.matchingRate)}%</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Waste Reduced</p>
                        <p className="text-3xl font-bold text-gray-900">{Math.round(processedData.systemStats.wasteReduction)} tons</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="donations">Donations</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Donors */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Donors</CardTitle>
                      <CardDescription>Most active food donors</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {processedData.topDonors.map((donor, index) => (
                          <div key={donor.name} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-green-800">{index + 1}</span>
                              </div>
                              <div>
                                <p className="font-medium">{donor.name}</p>
                                <p className="text-sm text-gray-500">{donor.donations} donations</p>
                              </div>
                            </div>
                            <Badge variant="secondary">{donor.impact}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Receivers */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Receivers</CardTitle>
                      <CardDescription>Most active organizations</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {processedData.topReceivers.map((receiver, index) => (
                          <div key={receiver.name} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-800">{index + 1}</span>
                              </div>
                              <div>
                                <p className="font-medium">{receiver.name}</p>
                                <p className="text-sm text-gray-500">{receiver.received} requests</p>
                              </div>
                            </div>
                            <Badge variant="secondary">{receiver.served}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="donations" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">All Donations</h3>
                  <Button onClick={exportData} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
                <div className="space-y-4">
                  {processedData.filteredDonations.map((donation) => (
                    <Card key={donation.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{donation.donorName}</p>
                            <p className="text-sm text-gray-500">
                              {donation.quantity} {donation.unit} of {donation.foodType}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(donation.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={getStatusColor(donation.status)}>
                            {donation.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                <Suspense fallback={
                  <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span>Loading analytics...</span>
                    </div>
                  </div>
                }>
                  <StatsCharts 
                    donations={processedData.filteredDonations}
                    requirements={processedData.filteredRequirements}
                    matches={matches}
                  />
                </Suspense>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Recent Activity</h3>
                  <Button onClick={exportData} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
                <div className="space-y-4">
                  {processedData.recentActivity.map((activity) => (
                    <Card key={activity.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          {getActivityIcon(activity.type)}
                          <div className="flex-1">
                            <p className="font-medium">{activity.user}</p>
                            <p className="text-sm text-gray-500">{activity.action}</p>
                            <p className="text-xs text-gray-400">{activity.time}</p>
                          </div>
                          <Badge className={getStatusColor(activity.status)}>
                            {activity.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}