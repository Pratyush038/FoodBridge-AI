'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Search, Filter } from 'lucide-react';
import { initializeMap, addMarkersToMap, MapMarker, findNearbyMatches } from '@/lib/maps';

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

  useEffect(() => {
    if (mapRef.current && !map) {
      initializeMap(mapRef.current, center).then(setMap);
    }
  }, [center, map]);

  useEffect(() => {
    if (map && filteredMarkers.length > 0) {
      addMarkersToMap(map, filteredMarkers);
    }
  }, [map, filteredMarkers]);

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
          setUserLocation(location);
          if (map) {
            map.setCenter(location);
            map.setZoom(14);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const applyFilters = () => {
    let filtered = markers;

    // Filter by type
    if (markerType !== 'all') {
      filtered = filtered.filter(marker => marker.type === markerType);
    }

    // Filter by distance if user location is available
    if (userLocation && searchRadius !== 'all') {
      const radiusKm = parseInt(searchRadius);
      // Map filtered to objects with a location property
      const filteredWithLocation = filtered.map(m => ({ ...m, location: m.position }));
      const nearby = findNearbyMatches(
        userLocation,
        filteredWithLocation,
        radiusKm
      );
      // Map back to original MapMarker objects
      filtered = nearby.map((item: any) => {
        const { location, ...rest } = item;
        return rest as MapMarker;
      });
    }

    setFilteredMarkers(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [markerType, searchRadius, userLocation, markers, applyFilters]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MapPin className="h-5 w-5" />
          <span>Location Map</span>
        </CardTitle>
        {showFilters && (
          <div className="flex flex-wrap gap-4 mt-4">
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
        )}
      </CardHeader>
      <CardContent>
        <div 
          ref={mapRef} 
          className="w-full h-96 rounded-lg border"
          style={{ minHeight: '400px' }}
        />
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredMarkers.length} of {markers.length} locations
        </div>
      </CardContent>
    </Card>
  );
}