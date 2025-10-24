'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Database, MapPin, Users, Building } from 'lucide-react';
import HeaderBar from '@/components/header-bar';
import { toast } from 'sonner';

export default function AdminSetupPage() {
  const [loading, setLoading] = useState(false);
  const [dataStatus, setDataStatus] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const checkDataStatus = async () => {
    setCheckingStatus(true);
    try {
      const response = await fetch('/api/seed-mock-data');
      const data = await response.json();
      setDataStatus(data);
      toast.success('Status checked successfully');
    } catch (error) {
      console.error('Error checking status:', error);
      toast.error('Failed to check data status');
    } finally {
      setCheckingStatus(false);
    }
  };

  const seedMockData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/seed-mock-data', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to seed data');
      }

      const result = await response.json();
      
      if (result.error) {
        toast.error(`Failed to seed data: ${result.error}`);
        console.error('Seeding errors:', result.errors);
      } else {
        toast.success(`Successfully seeded ${result.donorsCount} donors, ${result.ngosCount} NGOs, ${result.foodDonationsCount} food items, and ${result.requirementsCount} requirements!`);
      }
      
      // Refresh status
      await checkDataStatus();
    } catch (error: any) {
      console.error('Error seeding data:', error);
      toast.error(error.message || 'Failed to seed mock data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderBar />
      
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Setup Panel</h1>
            <p className="text-gray-600">Initialize your FoodBridge AI application with mock data</p>
          </div>

          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Database Status</span>
              </CardTitle>
              <CardDescription>Check current data in the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={checkDataStatus}
                disabled={checkingStatus}
                variant="outline"
              >
                {checkingStatus ? 'Checking...' : 'Check Status'}
              </Button>

              {dataStatus && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold">Donors</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{dataStatus.donorsCount}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Building className="h-5 w-5 text-green-600" />
                      <span className="font-semibold">NGOs</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{dataStatus.ngosCount}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Database className="h-5 w-5 text-orange-600" />
                      <span className="font-semibold">Food Items</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">{dataStatus.foodDonationsCount || 0}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <MapPin className="h-5 w-5 text-purple-600" />
                      <span className="font-semibold">Requests</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">{dataStatus.requirementsCount || 0}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Seed Mock Data Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Pan-India Mock Data</span>
              </CardTitle>
              <CardDescription>
                Add realistic donors, NGOs, food donations, and requirements from major Indian cities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  This will add 50 donors, 50 NGOs, 50+ food donations, and 50 food requirements with realistic locations across India.
                  The data includes names, addresses, phone numbers, GPS coordinates, and transaction history.
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <h4 className="font-semibold">What will be added:</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>✅ 50 Donors (Restaurants, Hotels, Caterers) from 7 cities</li>
                  <li>✅ 50 NGOs (Food Distribution, Child Welfare, Community Service)</li>
                  <li>✅ 50+ Food Donations (available & completed with various dates)</li>
                  <li>✅ 50 Active Food Requirements from NGOs</li>
                  <li>✅ Realistic names, addresses, and contact information</li>
                  <li>✅ GPS coordinates for accurate map display</li>
                  <li>✅ Service capacity and organization details</li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">📍 Cities Covered:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
                  <div>🏙️ Bangalore (Karnataka)</div>
                  <div>🏙️ Mumbai (Maharashtra)</div>
                  <div>🏙️ Delhi (NCR)</div>
                  <div>🏙️ Chennai (Tamil Nadu)</div>
                  <div>🏙️ Kolkata (West Bengal)</div>
                  <div>🏙️ Hyderabad (Telangana)</div>
                  <div>🏙️ Pune (Maharashtra)</div>
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  Data includes past 15 days of activity to show platform history
                </p>
              </div>

              <Button 
                onClick={seedMockData}
                disabled={loading}
                size="lg"
                className="w-full"
              >
                {loading ? 'Seeding Data...' : 'Seed Mock Data'}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Note: This operation is safe to run multiple times. 
                Existing data with the same IDs will be updated.
              </p>
            </CardContent>
          </Card>

          {/* Google Maps Setup Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Google Maps Setup</span>
              </CardTitle>
              <CardDescription>
                Enable maps to see donor and NGO locations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  Make sure you have enabled the following APIs in Google Cloud Console:
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <h4 className="font-semibold">Required Google Cloud APIs:</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>✅ Maps JavaScript API</li>
                  <li>✅ Geocoding API</li>
                  <li>✅ Places API</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-900 mb-2">⚙️ Setup Instructions:</h4>
                <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                  <li>Go to Google Cloud Console</li>
                  <li>Enable the required APIs listed above</li>
                  <li>Create or use existing API key</li>
                  <li>Update NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local</li>
                  <li>Restart the development server</li>
                </ol>
              </div>

              <Button 
                onClick={() => window.open('https://console.cloud.google.com/apis/library', '_blank')}
                variant="outline"
                className="w-full"
              >
                Open Google Cloud Console
              </Button>
            </CardContent>
          </Card>

          {/* Success Message */}
          {dataStatus?.hasData && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Setup Complete!</strong> Your application is ready to use.
                You can now visit the donor and receiver dashboards to see the mock data on the map.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}
