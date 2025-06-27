'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Siren, MapPin, Users, Clock, Phone, Zap } from 'lucide-react';
import { disasterService, DisasterAlert, EmergencyRequest } from '@/lib/disaster-service';

export default function DisasterMode() {
  const [activeAlerts, setActiveAlerts] = useState<DisasterAlert[]>([]);
  const [emergencyRequests, setEmergencyRequests] = useState<EmergencyRequest[]>([]);
  const [disasterStats, setDisasterStats] = useState({
    activeAlerts: 0,
    emergencyRequests: 0,
    peopleAffected: 0,
    responseTime: 0
  });
  const [loading, setLoading] = useState(false);
  const [newAlert, setNewAlert] = useState({
    type: 'flood' as 'flood' | 'fire' | 'earthquake' | 'hurricane' | 'emergency',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    title: '',
    description: '',
    address: '',
    radius: 10,
    priorityRouting: true
  });

  useEffect(() => {
    loadDisasterData();
  }, []);

  const loadDisasterData = async () => {
    setLoading(true);
    try {
      const alerts = await disasterService.getActiveAlerts();
      const requests = await disasterService.getEmergencyRequests();
      const stats = await disasterService.getDisasterStatistics();
      
      setActiveAlerts(alerts);
      setEmergencyRequests(requests);
      setDisasterStats(stats);
    } catch (error) {
      console.error('Error loading disaster data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueAlert = async () => {
    if (!newAlert.title || !newAlert.description || !newAlert.address) {
      return;
    }

    setLoading(true);
    try {
      await disasterService.issueDisasterAlert({
        type: newAlert.type,
        severity: newAlert.severity,
        location: {
          lat: 40.7128, // In real app, geocode the address
          lng: -74.0060,
          radius: newAlert.radius,
          address: newAlert.address
        },
        title: newAlert.title,
        description: newAlert.description,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        priorityRouting: newAlert.priorityRouting,
        emergencyContacts: ['+1-800-EMERGENCY', 'disaster@foodbridge.ai']
      });

      await loadDisasterData();
      
      // Reset form
      setNewAlert({
        type: 'flood',
        severity: 'medium',
        title: '',
        description: '',
        address: '',
        radius: 10,
        priorityRouting: true
      });
    } catch (error) {
      console.error('Error issuing alert:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateFlood = async () => {
    setLoading(true);
    try {
      await disasterService.simulateFloodAlert();
      await loadDisasterData();
    } catch (error) {
      console.error('Error simulating flood:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateFire = async () => {
    setLoading(true);
    try {
      await disasterService.simulateFireAlert();
      await loadDisasterData();
    } catch (error) {
      console.error('Error simulating fire:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'flood': return '🌊';
      case 'fire': return '🔥';
      case 'earthquake': return '🌍';
      case 'hurricane': return '🌪️';
      default: return '⚠️';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'immediate': return 'bg-red-100 text-red-800';
      case 'urgent': return 'bg-orange-100 text-orange-800';
      case 'high': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Emergency Header */}
      <Alert className="border-red-200 bg-red-50">
        <Siren className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>Disaster Mode Active:</strong> Priority routing enabled for emergency food distribution. 
          All donations and volunteers are being coordinated for disaster response.
        </AlertDescription>
      </Alert>

      {/* Stats Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <span>Emergency Response Dashboard</span>
          </CardTitle>
          <CardDescription>
            Real-time coordination for disaster relief and emergency food distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-600">{disasterStats.activeAlerts}</div>
              <div className="text-sm text-red-700">Active Alerts</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
              <Users className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-600">{disasterStats.emergencyRequests}</div>
              <div className="text-sm text-orange-700">Emergency Requests</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <Users className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-600">{disasterStats.peopleAffected}</div>
              <div className="text-sm text-yellow-700">People Affected</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">{disasterStats.responseTime}min</div>
              <div className="text-sm text-blue-700">Avg Response Time</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
          <TabsTrigger value="requests">Emergency Requests</TabsTrigger>
          <TabsTrigger value="issue">Issue Alert</TabsTrigger>
          <TabsTrigger value="simulate">Simulate Disaster</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Active Disaster Alerts</CardTitle>
              <CardDescription>
                Current emergency situations requiring immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeAlerts.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No active disaster alerts at the moment.</p>
                  </div>
                ) : (
                  activeAlerts.map((alert) => (
                    <div key={alert.id} className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{getTypeIcon(alert.type)}</span>
                          <div>
                            <h3 className="font-semibold text-lg">{alert.title}</h3>
                            <p className="text-sm opacity-80">{alert.description}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          {alert.priorityRouting && (
                            <Badge className="bg-purple-100 text-purple-800">
                              Priority Routing
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center space-x-2 text-sm">
                          <MapPin className="h-4 w-4" />
                          <span>{alert.location.address}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Clock className="h-4 w-4" />
                          <span>Issued: {new Date(alert.issuedAt).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 mb-4">
                        <span className="text-sm font-medium">Affected Radius: {alert.location.radius}km</span>
                        <span className="text-sm font-medium">
                          Expires: {new Date(alert.expiresAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex space-x-2">
                        <Button size="sm" className="bg-red-600 hover:bg-red-700">
                          Coordinate Response
                        </Button>
                        <Button size="sm" variant="outline">
                          View on Map
                        </Button>
                        <Button size="sm" variant="outline">
                          Send Update
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Emergency Food Requests</CardTitle>
              <CardDescription>
                Urgent requests from disaster-affected areas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {emergencyRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No emergency requests at the moment.</p>
                  </div>
                ) : (
                  emergencyRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4 bg-orange-50 border-orange-200">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{request.organizationName}</h3>
                          <p className="text-sm text-gray-600">{request.location.address}</p>
                        </div>
                        <Badge className={getUrgencyColor(request.urgencyLevel)}>
                          {request.urgencyLevel.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <span className="text-sm font-medium">People Affected:</span>
                          <span className="text-lg font-bold text-orange-600 ml-2">{request.peopleAffected}</span>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Contact:</span>
                          <div className="text-sm">
                            <div>{request.contactPerson.name}</div>
                            <div className="flex items-center space-x-2">
                              <Phone className="h-3 w-3" />
                              <span>{request.contactPerson.phone}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <span className="text-sm font-medium">Immediate Needs:</span>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                          {request.needs.map((need, index) => (
                            <div key={index} className="bg-white p-2 rounded border">
                              <div className="font-medium text-sm">{need.foodType}</div>
                              <div className="text-xs text-gray-600">{need.quantity} units</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {request.specialRequirements.length > 0 && (
                        <div className="mb-4">
                          <span className="text-sm font-medium">Special Requirements:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {request.specialRequirements.map((req) => (
                              <Badge key={req} variant="outline">
                                {req}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                          <Zap className="h-4 w-4 mr-1" />
                          Priority Match
                        </Button>
                        <Button size="sm" variant="outline">
                          Assign Volunteers
                        </Button>
                        <Button size="sm" variant="outline">
                          Contact Organization
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issue">
          <Card>
            <CardHeader>
              <CardTitle>Issue Disaster Alert</CardTitle>
              <CardDescription>
                Create and broadcast emergency alerts to all platform users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="alert-type">Disaster Type</Label>
                    <Select value={newAlert.type} onValueChange={(value: any) => setNewAlert({...newAlert, type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select disaster type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flood">🌊 Flood</SelectItem>
                        <SelectItem value="fire">🔥 Fire</SelectItem>
                        <SelectItem value="earthquake">🌍 Earthquake</SelectItem>
                        <SelectItem value="hurricane">🌪️ Hurricane</SelectItem>
                        <SelectItem value="emergency">⚠️ General Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="severity">Severity Level</Label>
                    <Select value={newAlert.severity} onValueChange={(value: any) => setNewAlert({...newAlert, severity: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alert-title">Alert Title</Label>
                  <Input
                    id="alert-title"
                    placeholder="e.g., Flash Flood Warning - Downtown Area"
                    value={newAlert.title}
                    onChange={(e) => setNewAlert({...newAlert, title: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alert-description">Description</Label>
                  <Textarea
                    id="alert-description"
                    placeholder="Provide detailed information about the emergency situation"
                    value={newAlert.description}
                    onChange={(e) => setNewAlert({...newAlert, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="alert-address">Affected Area</Label>
                    <Input
                      id="alert-address"
                      placeholder="Enter address or area description"
                      value={newAlert.address}
                      onChange={(e) => setNewAlert({...newAlert, address: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="alert-radius">Affected Radius (km)</Label>
                    <Input
                      id="alert-radius"
                      type="number"
                      min="1"
                      max="100"
                      value={newAlert.radius}
                      onChange={(e) => setNewAlert({...newAlert, radius: parseInt(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="priority-routing"
                    checked={newAlert.priorityRouting}
                    onChange={(e) => setNewAlert({...newAlert, priorityRouting: e.target.checked})}
                    className="rounded"
                  />
                  <Label htmlFor="priority-routing">Enable Priority Routing</Label>
                </div>

                <Button 
                  onClick={handleIssueAlert} 
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  {loading ? 'Issuing Alert...' : 'Issue Emergency Alert'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulate">
          <Card>
            <CardHeader>
              <CardTitle>Disaster Simulation</CardTitle>
              <CardDescription>
                Test emergency response systems with simulated disaster scenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    These simulations help test and improve our emergency response capabilities. 
                    All users will receive test alerts marked as simulations.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-3xl">🌊</span>
                      <div>
                        <h3 className="font-semibold">Flash Flood Simulation</h3>
                        <p className="text-sm text-gray-600">Simulate flooding in downtown area</p>
                      </div>
                    </div>
                    <ul className="text-sm space-y-1 mb-4">
                      <li>• Multiple shelters need immediate assistance</li>
                      <li>• Priority routing for emergency vehicles</li>
                      <li>• Volunteer coordination for evacuations</li>
                      <li>• Real-time SOS alerts to all users</li>
                    </ul>
                    <Button 
                      onClick={handleSimulateFlood}
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Simulate Flood Emergency
                    </Button>
                  </div>

                  <div className="border rounded-lg p-4 bg-orange-50">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-3xl">🔥</span>
                      <div>
                        <h3 className="font-semibold">Wildfire Simulation</h3>
                        <p className="text-sm text-gray-600">Simulate wildfire emergency</p>
                      </div>
                    </div>
                    <ul className="text-sm space-y-1 mb-4">
                      <li>• Evacuation centers need emergency supplies</li>
                      <li>• Displaced families require immediate food</li>
                      <li>• Air quality concerns for food safety</li>
                      <li>• Coordination with fire departments</li>
                    </ul>
                    <Button 
                      onClick={handleSimulateFire}
                      disabled={loading}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                    >
                      Simulate Fire Emergency
                    </Button>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Simulation Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium">Alert System</h4>
                      <ul className="space-y-1 text-gray-600">
                        <li>• Push notifications to all users</li>
                        <li>• SMS alerts to emergency contacts</li>
                        <li>• In-app emergency banners</li>
                        <li>• Email notifications to organizations</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium">Response Coordination</h4>
                      <ul className="space-y-1 text-gray-600">
                        <li>• Automatic priority routing</li>
                        <li>• Volunteer mobilization</li>
                        <li>• Emergency request processing</li>
                        <li>• Real-time status updates</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}