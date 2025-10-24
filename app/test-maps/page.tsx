'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function MapTestPage() {
  const [tests, setTests] = useState({
    apiKey: { status: 'pending', message: '' },
    scriptLoad: { status: 'pending', message: '' },
    googleObject: { status: 'pending', message: '' },
    mapRender: { status: 'pending', message: '' },
  });

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    // Test 1: Check API Key
    if (apiKey && apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY') {
      setTests(prev => ({
        ...prev,
        apiKey: {
          status: 'success',
          message: `API Key found: ${apiKey.substring(0, 20)}...`
        }
      }));
    } else {
      setTests(prev => ({
        ...prev,
        apiKey: {
          status: 'error',
          message: 'API Key not configured or invalid'
        }
      }));
    }
  }, [apiKey]);

  const handleScriptLoad = () => {
    setTests(prev => ({
      ...prev,
      scriptLoad: {
        status: 'success',
        message: 'Google Maps script loaded successfully'
      }
    }));

    // Test 3: Check google object
    setTimeout(() => {
      if (typeof window !== 'undefined' && (window as any).google?.maps) {
        setTests(prev => ({
          ...prev,
          googleObject: {
            status: 'success',
            message: 'window.google.maps is available'
          }
        }));

        // Test 4: Try to create a map
        try {
          const mapElement = document.getElementById('test-map');
          if (mapElement) {
            const google = (window as any).google;
            const map = new google.maps.Map(mapElement, {
              center: { lat: 12.9716, lng: 77.5946 },
              zoom: 12
            });

            setTests(prev => ({
              ...prev,
              mapRender: {
                status: 'success',
                message: 'Map created successfully! Maps are working! 🎉'
              }
            }));
          }
        } catch (error: any) {
          setTests(prev => ({
            ...prev,
            mapRender: {
              status: 'error',
              message: `Map creation failed: ${error.message}`
            }
          }));
        }
      } else {
        setTests(prev => ({
          ...prev,
          googleObject: {
            status: 'error',
            message: 'window.google.maps is not available'
          }
        }));
      }
    }, 1000);
  };

  const handleScriptError = () => {
    setTests(prev => ({
      ...prev,
      scriptLoad: {
        status: 'error',
        message: 'Failed to load Google Maps script. Check API key and restrictions.'
      }
    }));
  };

  const getIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'pending':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {apiKey && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`}
          onLoad={handleScriptLoad}
          onError={handleScriptError}
          strategy="afterInteractive"
        />
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Google Maps Diagnostic Test</h1>
          <p className="text-gray-600">Testing your Google Maps configuration</p>
        </div>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(tests).map(([key, test]) => (
              <Alert key={key} className={getStatusColor(test.status)}>
                <div className="flex items-start space-x-3">
                  {getIcon(test.status)}
                  <div className="flex-1">
                    <h4 className="font-semibold capitalize mb-1">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <AlertDescription>{test.message}</AlertDescription>
                  </div>
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>

        {/* Map Test Container */}
        <Card>
          <CardHeader>
            <CardTitle>Map Render Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              id="test-map"
              className="w-full h-96 rounded-lg border-2 border-gray-300"
              style={{ minHeight: '400px' }}
            />
            <p className="text-sm text-gray-600 mt-2">
              If maps are working, you should see a map of Bangalore above.
            </p>
          </CardContent>
        </Card>

        {/* Troubleshooting Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">If Script Load Fails:</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Check API key restrictions in Google Cloud Console</li>
                <li>Add <code>http://localhost:3000/*</code> to allowed referrers</li>
                <li>Enable billing on your Google Cloud project</li>
                <li>Wait 1-2 minutes after making changes</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-2">Required APIs:</h4>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                <li>Maps JavaScript API</li>
                <li>Geocoding API</li>
                <li>Places API</li>
              </ul>
              <p className="text-sm text-yellow-800 mt-2">
                Enable at: <a href="https://console.cloud.google.com/apis/library" target="_blank" rel="noopener noreferrer" className="underline">
                  Google Cloud Console
                </a>
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">If All Tests Pass:</h4>
              <p className="text-sm text-green-800">
                Your Google Maps is configured correctly! Maps should work on your donor and receiver pages.
              </p>
              <div className="flex gap-2 mt-3">
                <a href="/donor" className="text-sm bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                  Go to Donor Dashboard
                </a>
                <a href="/receiver" className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  Go to Receiver Dashboard
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Browser Console Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Pro Tip:</strong> Open browser DevTools (F12) and check the Console tab for any error messages.
            Type <code>window.google</code> in the console to verify Google Maps loaded.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
