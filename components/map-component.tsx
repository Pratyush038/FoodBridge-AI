'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Search, Loader2 } from 'lucide-react';

// Declare global Google Maps types
declare global {
  interface Window {
    google: any;
  }
}

export interface MapMarker {
  id: string;
  position: { lat: number; lng: number };
  title: string;
  type: 'donor' | 'receiver';
  info: {
    name: string;
    description: string;
    contact?: string;
  };
}

interface MapComponentProps {
  markers?: MapMarker[];
  center?: { lat: number; lng: number };
  onMarkerClick?: (marker: MapMarker) => void;
  showFilters?: boolean;
}

export default function MapComponent({ 
  markers = [], 
  center = { lat: 12.9716, lng: 77.5946 }, // Default to Bangalore, India
  onMarkerClick,
  showFilters = true
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [filteredMarkers, setFilteredMarkers] = useState<MapMarker[]>(markers);
  const [searchRadius, setSearchRadius] = useState<string>('all');
  const [markerType, setMarkerType] = useState<string>('all');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [googleMarkers, setGoogleMarkers] = useState<any[]>([]);
  const [searchBox, setSearchBox] = useState<any>(null);
  const [userLocationMarker, setUserLocationMarker] = useState<any>(null);
  const [manualZoom, setManualZoom] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Check for API key
  const hasApiKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && 
                     process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY' &&
                     process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.trim() !== '');

  // Load Google Maps
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).google?.maps) {
      setGoogleMapsLoaded(true);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!googleMapsLoaded || !mapRef.current || map) return;

    const google = (window as any).google;
    const newMap = new google.maps.Map(mapRef.current, {
      center,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    });

    setMap(newMap);

    // Initialize search box if we have the input element
    if (searchInputRef.current) {
      const searchBoxInstance = new google.maps.places.SearchBox(searchInputRef.current);
      newMap.addListener('bounds_changed', () => {
        searchBoxInstance.setBounds(newMap.getBounds());
      });

      searchBoxInstance.addListener('places_changed', () => {
        const places = searchBoxInstance.getPlaces();
        if (!places || places.length === 0) return;

        const place = places[0];
        if (!place.geometry || !place.geometry.location) return;

        newMap.setCenter(place.geometry.location);
        newMap.setZoom(15);

        // Add a temporary marker for the searched location
        new google.maps.Marker({
          map: newMap,
          position: place.geometry.location,
          title: place.name,
          animation: google.maps.Animation.DROP,
        });
      });

      setSearchBox(searchBoxInstance);
    }
  }, [googleMapsLoaded, center, map]);

  // Update markers
  useEffect(() => {
    if (!map || !googleMapsLoaded) return;

    const google = (window as any).google;

    // Clear existing markers
    googleMarkers.forEach((marker: any) => marker.setMap(null));

    // Add new markers
    const newMarkers = filteredMarkers.map(marker => {
      const googleMarker = new google.maps.Marker({
        map,
        position: marker.position,
        title: marker.title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: marker.type === 'donor' ? '#10b981' : '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        animation: google.maps.Animation.DROP,
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; max-width: 250px;">
            <h3 style="font-weight: 600; font-size: 16px; margin-bottom: 8px; color: #1f2937;">
              ${marker.info.name}
            </h3>
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">
              ${marker.info.description}
            </p>
            ${marker.info.contact ? `
              <p style="font-size: 14px; color: #3b82f6; margin-top: 8px;">
                ${marker.info.contact}
              </p>
            ` : ''}
          </div>
        `,
      });

      googleMarker.addListener('click', () => {
        infoWindow.open(map, googleMarker);
        if (onMarkerClick) {
          onMarkerClick(marker);
        }
      });

      return googleMarker;
    });

    setGoogleMarkers(newMarkers);

    // Fit bounds to show all markers (but not if user manually zoomed)
    if (newMarkers.length > 0 && !manualZoom) {
      const bounds = new google.maps.LatLngBounds();
      filteredMarkers.forEach(marker => {
        bounds.extend(marker.position);
      });
      map.fitBounds(bounds);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, filteredMarkers, googleMapsLoaded, manualZoom]);

  // Update filtered markers
  useEffect(() => {
    setFilteredMarkers(markers);
  }, [markers]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          console.log('User location detected:', location);
          setUserLocation(location);
          
          if (map) {
            const google = (window as any).google;
            
            // Remove existing user location marker if it exists
            if (userLocationMarker) {
              userLocationMarker.setMap(null);
            }
            
            // Mark as manual zoom to prevent auto-fit from overriding
            setManualZoom(true);
            
            // Center the map on user's location
            map.setCenter(location);
            map.setZoom(14);

            // Create info window for user's location
            const infoWindow = new google.maps.InfoWindow({
              content: `
                <div style="padding: 12px; max-width: 250px;">
                  <h3 style="font-weight: 600; font-size: 16px; margin-bottom: 8px; color: #1f2937;">
                    Your Location
                  </h3>
                  <p style="font-size: 14px; color: #6b7280;">
                    Latitude: ${location.lat.toFixed(6)}<br/>
                    Longitude: ${location.lng.toFixed(6)}
                  </p>
                </div>
              `,
            });

            // Add a pulsing marker for user's location
            const newUserMarker = new google.maps.Marker({
              map,
              position: location,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#ef4444',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
              },
              title: 'Your Location',
              animation: google.maps.Animation.DROP,
            });

            // Add click listener to show info
            newUserMarker.addListener('click', () => {
              infoWindow.open(map, newUserMarker);
            });

            // Auto-open the info window
            infoWindow.open(map, newUserMarker);
            
            setUserLocationMarker(newUserMarker);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          let errorMessage = 'Unable to get your location. ';
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Please enable location services in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage += 'The request to get your location timed out.';
              break;
            default:
              errorMessage += 'An unknown error occurred.';
          }
          
          alert(errorMessage);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const calculateDistance = (
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const applyFilters = useCallback(() => {
    let filtered = [...markers];

    // Filter by type
    if (markerType !== 'all') {
      filtered = filtered.filter(marker => marker.type === markerType);
    }

    // Filter by distance if user location is available
    if (userLocation && searchRadius !== 'all') {
      const radiusKm = parseInt(searchRadius);
      filtered = filtered.filter(marker => {
        const distance = calculateDistance(userLocation, marker.position);
        return distance <= radiusKm;
      }).sort((a, b) => {
        const distanceA = calculateDistance(userLocation, a.position);
        const distanceB = calculateDistance(userLocation, b.position);
        return distanceA - distanceB;
      });
    }

    setFilteredMarkers(filtered);
  }, [markerType, searchRadius, userLocation, markers]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  return (
    <>
      {hasApiKey && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          onLoad={() => setGoogleMapsLoaded(true)}
          onError={() => setLoadError(true)}
          strategy="afterInteractive"
        />
      )}
      
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Location Map</span>
          </CardTitle>
          {showFilters && (
            <div className="space-y-4 mt-4">
              {/* Search Box */}
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search for a location..."
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filter Controls */}
              <div className="flex flex-wrap gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={getCurrentLocation}
                  className="flex items-center space-x-2"
                >
                  <Search className="h-4 w-4" />
                  <span>Find My Location</span>
                </Button>
                
                <Select value={markerType} onValueChange={setMarkerType}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    <SelectItem value="donor">Donors Only</SelectItem>
                    <SelectItem value="receiver">Receivers Only</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={searchRadius} onValueChange={setSearchRadius}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Search radius" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Distances</SelectItem>
                    <SelectItem value="5">Within 5 km</SelectItem>
                    <SelectItem value="10">Within 10 km</SelectItem>
                    <SelectItem value="25">Within 25 km</SelectItem>
                    <SelectItem value="50">Within 50 km</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!hasApiKey ? (
            <div className="w-full h-96 rounded-lg border bg-yellow-50 flex items-center justify-center">
              <div className="text-center p-8">
                <MapPin className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                <p className="text-yellow-800 font-semibold mb-2">Google Maps API Key Required</p>
                <p className="text-sm text-yellow-700">
                  Please add your Google Maps API key to the environment variables.
                </p>
              </div>
            </div>
          ) : loadError ? (
            <div className="w-full h-96 rounded-lg border bg-red-50 flex items-center justify-center">
              <div className="text-center p-8">
                <MapPin className="h-12 w-12 text-red-600 mx-auto mb-4" />
                <p className="text-red-800 font-semibold mb-2">Failed to Load Google Maps</p>
                <p className="text-sm text-red-700">
                  Please check your API key and internet connection.
                </p>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : !googleMapsLoaded ? (
            <div className="w-full h-96 rounded-lg border bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-gray-600">Loading map...</p>
              </div>
            </div>
          ) : (
            <div 
              ref={mapRef} 
              className="w-full h-96 rounded-lg border"
              style={{ minHeight: '400px' }}
            />
          )}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredMarkers.length} of {markers.length} locations
            {markers.length === 0 && (
              <span className="text-orange-600 ml-2">
                • No locations to display yet
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}