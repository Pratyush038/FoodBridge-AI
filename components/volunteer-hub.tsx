'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, MapPin, Clock, Route, Star, Truck, AlertCircle, Navigation } from 'lucide-react';
import { volunteerService, VolunteerRequest, Volunteer, RouteOptimization } from '@/lib/volunteer-service';

export default function VolunteerHub() {
  const [volunteerRequests, setVolunteerRequests] = useState<VolunteerRequest[]>([]);
  const [nearbyVolunteers, setNearbyVolunteers] = useState<Volunteer[]>([]);
  const [routeOptimization, setRouteOptimization] = useState<RouteOptimization | null>(null);
  const [loading, setLoading] = useState(false);
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    pickupAddress: '',
    deliveryAddress: '',
    scheduledTime: '',
    volunteersNeeded: 1,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'emergency',
    requirements: [] as string[]
  });

  useEffect(() => {
    loadVolunteerData();
  }, []);

  const loadVolunteerData = async () => {
    setLoading(true);
    try {
      // Simulate loading volunteer requests
      const mockRequests: VolunteerRequest[] = [
        {
          id: 'req_1',
          organizationId: 'org_1',
          organizationName: 'Downtown Shelter',
          title: 'Food Pickup from Green Grocers',
          description: 'Pick up 50kg of fresh vegetables and deliver to shelter',
          pickupLocation: {
            address: '123 Market St, Downtown',
            lat: 40.7128,
            lng: -74.0060
          },
          deliveryLocation: {
            address: '456 Shelter Ave, Downtown',
            lat: 40.7150,
            lng: -74.0080
          },
          scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          estimatedDuration: 90,
          volunteersNeeded: 2,
          volunteersAssigned: ['vol_1'],
          status: 'assigned',
          priority: 'high',
          requirements: ['food-handling', 'driving'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      setVolunteerRequests(mockRequests);

      // Load nearby volunteers
      const volunteers = await volunteerService.findNearbyVolunteers(
        { lat: 40.7128, lng: -74.0060 },
        25
      );
      setNearbyVolunteers(volunteers);
    } catch (error) {
      console.error('Error loading volunteer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async () => {
    if (!newRequest.title || !newRequest.pickupAddress || !newRequest.deliveryAddress) {
      return;
    }

    setLoading(true);
    try {
      const requestId = await volunteerService.createVolunteerRequest({
        organizationId: 'current_org',
        organizationName: 'Current Organization',
        title: newRequest.title,
        description: newRequest.description,
        pickupLocation: {
          address: newRequest.pickupAddress,
          lat: 40.7128, // In real app, geocode the address
          lng: -74.0060
        },
        deliveryLocation: {
          address: newRequest.deliveryAddress,
          lat: 40.7150,
          lng: -74.0080
        },
        scheduledTime: newRequest.scheduledTime,
        estimatedDuration: 60,
        volunteersNeeded: newRequest.volunteersNeeded,
        volunteersAssigned: [],
        status: 'open',
        priority: newRequest.priority,
        requirements: newRequest.requirements
      });

      console.log('Created volunteer request:', requestId);
      await loadVolunteerData();
      
      // Reset form
      setNewRequest({
        title: '',
        description: '',
        pickupAddress: '',
        deliveryAddress: '',
        scheduledTime: '',
        volunteersNeeded: 1,
        priority: 'medium',
        requirements: []
      });
    } catch (error) {
      console.error('Error creating request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeRoute = async (volunteerId: string) => {
    setLoading(true);
    try {
      const pickupPoints = [
        { lat: 40.7128, lng: -74.0060, address: '123 Market St' },
        { lat: 40.7200, lng: -74.0100, address: '789 Food Bank Ave' }
      ];
      
      const deliveryPoints = [
        { lat: 40.7150, lng: -74.0080, address: '456 Shelter Ave' },
        { lat: 40.7180, lng: -74.0120, address: '321 Community Center' }
      ];

      const optimization = await volunteerService.optimizeRoute(
        volunteerId,
        pickupPoints,
        deliveryPoints
      );
      
      setRouteOptimization(optimization);
    } catch (error) {
      console.error('Error optimizing route:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-purple-100 text-purple-800';
      case 'open': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-6 w-6 text-blue-600" />
            <span>Volunteer Coordination Hub</span>
          </CardTitle>
          <CardDescription>
            Manage volunteer pickups and deliveries with real-time tracking and route optimization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">{nearbyVolunteers.length}</div>
              <div className="text-sm text-blue-700">Available Volunteers</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{volunteerRequests.filter(r => r.status === 'open').length}</div>
              <div className="text-sm text-green-700">Open Requests</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Route className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">{volunteerRequests.filter(r => r.status === 'in-progress').length}</div>
              <div className="text-sm text-purple-700">Active Routes</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <AlertCircle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-600">{volunteerRequests.filter(r => r.priority === 'emergency').length}</div>
              <div className="text-sm text-orange-700">Emergency Requests</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="requests">Active Requests</TabsTrigger>
          <TabsTrigger value="volunteers">Available Volunteers</TabsTrigger>
          <TabsTrigger value="create">Create Request</TabsTrigger>
          <TabsTrigger value="routes">Route Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Volunteer Requests</CardTitle>
              <CardDescription>
                Manage pickup and delivery requests for volunteers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {volunteerRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No volunteer requests at the moment.</p>
                  </div>
                ) : (
                  volunteerRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{request.title}</h3>
                          <p className="text-sm text-gray-600">{request.organizationName}</p>
                          <p className="text-sm text-gray-500 mt-1">{request.description}</p>
                        </div>
                        <div className="flex space-x-2">
                          <Badge className={getPriorityColor(request.priority)}>
                            {request.priority}
                          </Badge>
                          <Badge className={getStatusColor(request.status)}>
                            {request.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-sm">
                            <MapPin className="h-4 w-4 text-green-600" />
                            <span className="font-medium">Pickup:</span>
                            <span>{request.pickupLocation.address}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm">
                            <MapPin className="h-4 w-4 text-red-600" />
                            <span className="font-medium">Delivery:</span>
                            <span>{request.deliveryLocation.address}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-sm">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">Scheduled:</span>
                            <span>{new Date(request.scheduledTime).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm">
                            <Users className="h-4 w-4 text-purple-600" />
                            <span className="font-medium">Volunteers:</span>
                            <span>{request.volunteersAssigned.length}/{request.volunteersNeeded}</span>
                          </div>
                        </div>
                      </div>

                      {request.requirements.length > 0 && (
                        <div className="mb-4">
                          <span className="text-sm font-medium">Requirements:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {request.requirements.map((req) => (
                              <Badge key={req} variant="outline">
                                {req}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        {request.status === 'open' && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            Assign Volunteer
                          </Button>
                        )}
                        {request.status === 'assigned' && (
                          <Button size="sm" variant="outline">
                            Track Progress
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleOptimizeRoute('vol_1')}
                        >
                          Optimize Route
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volunteers">
          <Card>
            <CardHeader>
              <CardTitle>Available Volunteers</CardTitle>
              <CardDescription>
                Volunteers ready to help with pickups and deliveries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {nearbyVolunteers.map((volunteer) => (
                  <div key={volunteer.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{volunteer.name}</h3>
                        <p className="text-sm text-gray-600">{volunteer.email}</p>
                        <div className="flex items-center space-x-1 mt-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm">{volunteer.rating}</span>
                          <span className="text-sm text-gray-500">({volunteer.completedTasks} tasks)</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Truck className="h-5 w-5 text-gray-600" />
                        <span className="text-sm capitalize">{volunteer.vehicleType}</span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div>
                        <span className="text-sm font-medium">Skills:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {volunteer.skills.map((skill) => (
                            <Badge key={skill} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Available:</span>
                        <span className="text-sm text-gray-600 ml-2">
                          {volunteer.availability.days.join(', ')}
                        </span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        Assign Task
                      </Button>
                      <Button size="sm" variant="outline">
                        View Profile
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create Volunteer Request</CardTitle>
              <CardDescription>
                Request volunteer assistance for food pickup and delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Request Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Food pickup from restaurant"
                      value={newRequest.title}
                      onChange={(e) => setNewRequest({...newRequest, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority Level</Label>
                    <Select value={newRequest.priority} onValueChange={(value: any) => setNewRequest({...newRequest, priority: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what needs to be picked up and delivered"
                    value={newRequest.description}
                    onChange={(e) => setNewRequest({...newRequest, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pickup">Pickup Address</Label>
                    <Input
                      id="pickup"
                      placeholder="Enter pickup location"
                      value={newRequest.pickupAddress}
                      onChange={(e) => setNewRequest({...newRequest, pickupAddress: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery">Delivery Address</Label>
                    <Input
                      id="delivery"
                      placeholder="Enter delivery location"
                      value={newRequest.deliveryAddress}
                      onChange={(e) => setNewRequest({...newRequest, deliveryAddress: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduled">Scheduled Time</Label>
                    <Input
                      id="scheduled"
                      type="datetime-local"
                      value={newRequest.scheduledTime}
                      onChange={(e) => setNewRequest({...newRequest, scheduledTime: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="volunteers">Volunteers Needed</Label>
                    <Input
                      id="volunteers"
                      type="number"
                      min="1"
                      max="10"
                      value={newRequest.volunteersNeeded}
                      onChange={(e) => setNewRequest({...newRequest, volunteersNeeded: parseInt(e.target.value)})}
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleCreateRequest} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Creating Request...' : 'Create Volunteer Request'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Navigation className="h-5 w-5" />
                <span>Route Optimization</span>
              </CardTitle>
              <CardDescription>
                AI-powered route optimization to minimize travel time and costs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {routeOptimization ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <Route className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-blue-600">{routeOptimization.route.totalDistance.toFixed(1)}km</div>
                      <div className="text-sm text-blue-700">Total Distance</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-green-600">{routeOptimization.route.totalDuration}min</div>
                      <div className="text-sm text-green-700">Estimated Time</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <span className="text-2xl">💰</span>
                      <div className="text-2xl font-bold text-purple-600">${routeOptimization.estimatedCost.toFixed(2)}</div>
                      <div className="text-sm text-purple-700">Estimated Cost</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Optimized Route</h3>
                    <div className="space-y-3">
                      {routeOptimization.route.waypoints.map((waypoint, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                            waypoint.type === 'pickup' ? 'bg-green-500' : 'bg-red-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{waypoint.address}</div>
                            <div className="text-sm text-gray-600">
                              {waypoint.type === 'pickup' ? 'Pickup' : 'Delivery'} • 
                              ETA: {new Date(waypoint.estimatedTime).toLocaleTimeString()}
                            </div>
                          </div>
                          <Badge variant="outline">
                            {waypoint.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Send to Volunteer
                    </Button>
                    <Button variant="outline">
                      Export Route
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Navigation className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No route optimization available yet.</p>
                  <Button onClick={() => handleOptimizeRoute('vol_1')}>
                    Generate Sample Route
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}