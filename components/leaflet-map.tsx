'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Search, Navigation, Layers, ZoomIn, ZoomOut } from 'lucide-react';

// Import Leaflet types only (not the library itself)
import type L from 'leaflet';

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

interface LeafletMapProps {
  markers?: MapMarker[];
  center?: { lat: number; lng: number };
  onMarkerClick?: (marker: MapMarker) => void;
  showFilters?: boolean;
  showHotspots?: boolean;
}

// Leaflet CSS injection
const injectLeafletCSS = () => {
  if (typeof document !== 'undefined' && !document.getElementById('leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);
  }
};

export default function LeafletMapComponent({ 
  markers = [], 
  center = { lat: 12.9716, lng: 77.5946 }, // Default to Bangalore
  onMarkerClick,
  showFilters = true,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [leaflet, setLeaflet] = useState<typeof L | null>(null);
  const [filteredMarkers, setFilteredMarkers] = useState<MapMarker[]>(markers);
  const [searchRadius, setSearchRadius] = useState<string>('all');
  const [markerType, setMarkerType] = useState<string>('all');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);

  // Load Leaflet
  useEffect(() => {
    injectLeafletCSS();
    
    const loadLeaflet = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const leafletModule = await import('leaflet');
        // Fix default icon paths for Leaflet
        delete (leafletModule.default.Icon.Default.prototype as any)._getIconUrl;
        leafletModule.default.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
        setLeaflet(leafletModule.default);
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load Leaflet:', error);
      }
    };

    if (typeof window !== 'undefined') {
      loadLeaflet();
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !leaflet || !mapContainerRef.current || mapRef.current) return;

    // Create map
    const map = leaflet.map(mapContainerRef.current, {
      center: [center.lat, center.lng],
      zoom: 12,
      zoomControl: false, // We'll add custom controls
    });

    // Add OpenStreetMap tiles
    leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Create markers layer group
    markersLayerRef.current = leaflet.layerGroup().addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isLoaded, leaflet, center]);

  // Update markers on map
  useEffect(() => {
    if (!mapRef.current || !leaflet || !markersLayerRef.current) return;

    // Clear existing markers
    markersLayerRef.current.clearLayers();

    // Custom icon factory
    const createIcon = (type: 'donor' | 'receiver') => {
      const color = type === 'donor' ? '#10b981' : '#3b82f6';
      const svgIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
          <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
          <circle cx="12" cy="12" r="4" fill="white"/>
        </svg>
      `;
      return leaflet.divIcon({
        html: svgIcon,
        className: 'custom-marker-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });
    };

    // Add markers
    filteredMarkers.forEach(marker => {
      const icon = createIcon(marker.type);
      const leafletMarker = leaflet.marker([marker.position.lat, marker.position.lng], { icon })
        .addTo(markersLayerRef.current!);

      // Create popup content
      const popupContent = `
        <div style="min-width: 200px; padding: 8px;">
          <h3 style="font-weight: 600; font-size: 14px; margin-bottom: 4px; color: #1f2937;">
            ${marker.info.name}
          </h3>
          <p style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">
            ${marker.info.description}
          </p>
          ${marker.info.contact ? `
            <p style="font-size: 12px; color: #3b82f6; margin-top: 6px;">
              📞 ${marker.info.contact}
            </p>
          ` : ''}
          <span style="display: inline-block; margin-top: 6px; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 500; background: ${marker.type === 'donor' ? '#d1fae5' : '#dbeafe'}; color: ${marker.type === 'donor' ? '#065f46' : '#1e40af'};">
            ${marker.type === 'donor' ? '🍽️ Donor' : '🏢 Receiver'}
          </span>
        </div>
      `;

      leafletMarker.bindPopup(popupContent);
      
      leafletMarker.on('click', () => {
        setSelectedMarker(marker);
        if (onMarkerClick) {
          onMarkerClick(marker);
        }
      });
    });

    // Fit bounds to show all markers
    if (filteredMarkers.length > 0) {
      const bounds = leaflet.latLngBounds(filteredMarkers.map(m => [m.position.lat, m.position.lng] as [number, number]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [filteredMarkers, leaflet, onMarkerClick]);

  // Update filtered markers when source markers change
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
          
          if (mapRef.current && leaflet) {
            mapRef.current.setView([location.lat, location.lng], 14);
            
            // Add user location marker
            const userIcon = leaflet.divIcon({
              html: `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                  <circle cx="12" cy="12" r="8" fill="#ef4444" stroke="white" stroke-width="3"/>
                  <circle cx="12" cy="12" r="3" fill="white"/>
                </svg>
              `,
              className: 'user-location-icon',
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            });
            
            leaflet.marker([location.lat, location.lng], { icon: userIcon })
              .addTo(mapRef.current)
              .bindPopup('📍 You are here');
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Unable to get your location. Please check your browser permissions.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const calculateDistance = (
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number => {
    const R = 6371;
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

    if (markerType !== 'all') {
      filtered = filtered.filter(marker => marker.type === markerType);
    }

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

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MapPin className="h-5 w-5" />
          <span>Location Map</span>
          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-normal">
            OpenStreetMap
          </span>
        </CardTitle>
        {showFilters && (
          <div className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={getCurrentLocation}
                className="flex items-center space-x-2"
              >
                <Navigation className="h-4 w-4" />
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
        <div className="relative">
          {/* Map Container */}
          <div 
            ref={mapContainerRef} 
            className="w-full h-96 rounded-lg border overflow-hidden"
            style={{ background: '#e5e7eb' }}
          >
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Loading map...</p>
                </div>
              </div>
            )}
          </div>

          {/* Custom Zoom Controls */}
          {isLoaded && (
            <div className="absolute top-4 right-4 flex flex-col gap-1 z-[1000]">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-white shadow-md"
                onClick={handleZoomIn}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-white shadow-md"
                onClick={handleZoomOut}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Markers Summary */}
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-600">
              Donors: {filteredMarkers.filter(m => m.type === 'donor').length}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-600">
              Receivers: {filteredMarkers.filter(m => m.type === 'receiver').length}
            </span>
          </div>
          {userLocation && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-600">Your Location</span>
            </div>
          )}
        </div>

        {/* Locations List */}
        {filteredMarkers.length > 0 && (
          <div className="mt-4 max-h-48 overflow-y-auto border rounded-lg">
            <div className="divide-y">
              {filteredMarkers.map((marker) => (
                <div 
                  key={marker.id} 
                  className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedMarker?.id === marker.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => {
                    setSelectedMarker(marker);
                    if (mapRef.current) {
                      mapRef.current.setView([marker.position.lat, marker.position.lng], 15);
                    }
                    if (onMarkerClick) {
                      onMarkerClick(marker);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      marker.type === 'donor' ? 'bg-green-100' : 'bg-blue-100'
                    }`}>
                      <MapPin className={`h-4 w-4 ${
                        marker.type === 'donor' ? 'text-green-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {marker.info.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {marker.info.description}
                      </p>
                      {userLocation && (
                        <p className="text-xs text-blue-600 mt-1">
                          📍 {calculateDistance(userLocation, marker.position).toFixed(1)} km away
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      marker.type === 'donor' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {marker.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Add custom CSS for Leaflet icons */}
      <style jsx global>{`
        .custom-marker-icon, .user-location-icon {
          background: transparent;
          border: none;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }
        .leaflet-popup-content {
          margin: 8px;
        }
      `}</style>
    </Card>
  );
}
