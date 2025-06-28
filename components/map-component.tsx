'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Search, Filter, AlertCircle, Loader2 } from 'lucide-react';
import { initializeMap, addMarkersToMap, MapMarker, findNearbyMatches, isMapsAvailable, getMapStatus } from '@/lib/maps';

interface MapComponentProps {
  markers: MapMarker[];
  center?: { lat: number; lng: number };
  onMarkerClick?: (marker: MapMarker) => void;
  showFilters?: boolean;
}

export default function MapComponent({ 
  markers, 
  center = { lat: 40.7128, lng: -74.0060 },
  onMarkerClick,
  showFilters = true
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [filteredMarkers, setFilteredMarkers] = useState<MapMarker[]>(markers);
  const [searchRadius, setSearchRadius] = useState<string>('10');
  const [markerType, setMarkerType] = useState<string>('all');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);

  const mapStatus = getMapStatus();

  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return;
      
      setLoading(true);
      setError(null);

      try {
        if (!isMapsAvailable()) {
          setError('Map functionality requires a Mapbox API key');
          setLoading(false);
          return;
        }

        const mapInstance = await initializeMap(mapRef.current, center);
        if (mapInstance) {
          setMap(mapInstance);
          console.log('✅ Map component initialized successfully');
        } else {
          setError('Failed to initialize map');
        }
      } catch (err) {
        console.error('❌ Error initializing map:', err);
        setError('Failed to load map');
      } finally {
        setLoading(false);
      }
    };

    initMap();

    // Cleanup function
    return () => {
      if (map) {
        try {
          map.remove();
        } catch (err) {
          console.warn('Error removing map:', err);
        }
      }
    };
  }, [center]); // Only depend on center, not map

  useEffect(() => {
    if (map && filteredMarkers.length > 0 && isMapsAvailable()) {
      try {
        // Remove existing markers
        mapMarkers.forEach(marker => {
          try {
            marker.remove();
          } catch (err) {
            console.warn('Error removing marker:', err);
          }
        });

        // Add new markers
        const newMarkers = addMarkersToMap(map, filteredMarkers);
        setMapMarkers(newMarkers);

        // Fit map to markers if there are any
        if (filteredMarkers.length > 0) {
          const bounds = new mapboxgl.LngLatBounds();
          filteredMarkers.forEach(marker => {
            bounds.extend([marker.position.lng, marker.position.lat]);
          });
          
          // Add some padding and animate to bounds
          map.fitBounds(bounds, {
            padding: 50,
            maxZoom: 15,
            duration: 1000
          });
        }
      } catch (err) {
        console.error('❌ Error updating markers:', err);
      }
    }
  }, [map, filteredMarkers]);

  useEffect(() => {
    setFilteredMarkers(markers);
  }, [markers]);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(location);
        
        if (map && isMapsAvailable()) {
          try {
            map.flyTo({
              center: [location.lng, location.lat],
              zoom: 14,
              duration: 2000
            });
          } catch (err) {
            console.error('Error moving map to user location:', err);
          }
        }
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error getting location:', error);
        setError('Unable to get your location');
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  }, [map]);

  const applyFilters = useCallback(() => {
    try {
      let filtered = [...markers];

      // Filter by type
      if (markerType !== 'all') {
        filtered = filtered.filter(marker => marker.type === markerType);
      }

      // Filter by distance if user location is available
      if (userLocation && searchRadius !== 'all') {
        const radiusKm = parseInt(searchRadius);
        if (!isNaN(radiusKm)) {
          const markersWithLocation = filtered.map(m => ({ 
            ...m, 
            location: m.position 
          }));
          
          const nearby = findNearbyMatches(
            userLocation,
            markersWithLocation,
            radiusKm
          );
          
          filtered = nearby.map(item => {
            const { location, ...rest } = item;
            return rest as MapMarker;
          });
        }
      }

      setFilteredMarkers(filtered);
    } catch (err) {
      console.error('❌ Error applying filters:', err);
      setFilteredMarkers(markers); // Fallback to all markers
    }
  }, [markerType, searchRadius, userLocation, markers]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Render error state
  if (error && !isMapsAvailable()) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Location Map</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-center p-8">
              <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Map Unavailable</h3>
              <p className="text-yellow-700 mb-2">{mapStatus.message}</p>
              <p className="text-sm text-yellow-600">
                The map feature requires a Mapbox API key to function properly.
              </p>
              <div className="mt-4 text-sm text-gray-600">
                <p>Showing {markers.length} locations</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MapPin className="h-5 w-5" />
          <span>Location Map</span>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        </CardTitle>
        {showFilters && (
          <div className="flex flex-wrap gap-4 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
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

            <Select value={searchRadius} onValueChange={setSearchRadius} disabled={!userLocation}>
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
        )}
      </CardHeader>
      <CardContent>
        <div 
          ref={mapRef} 
          className="w-full h-96 rounded-lg border bg-gray-100"
          style={{ minHeight: '400px' }}
        />
        
        <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
          <span>
            Showing {filteredMarkers.length} of {markers.length} locations
          </span>
          {userLocation && (
            <span className="text-green-600">
              📍 Your location detected
            </span>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          </div>
        )}

        {!isMapsAvailable() && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span className="text-blue-700 text-sm">
                Add NEXT_PUBLIC_MAPBOX_API_KEY to your environment variables to enable full map functionality
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}