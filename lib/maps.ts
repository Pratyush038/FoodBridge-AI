// Google Maps utility functions for FoodBridge AI
// This file provides location services using Google Maps Platform APIs
// With fallbacks for when API is unavailable

export interface Location {
  address: string;
  lat: number;
  lng: number;
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

// Check if Google Maps is disabled via environment variable
export const isGoogleMapsDisabled = (): boolean => {
  if (process.env.NEXT_PUBLIC_DISABLE_GOOGLE_MAPS === 'true') {
    return true;
  }
  const hasApiKey = Boolean(
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && 
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY' &&
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.trim() !== ''
  );
  return !hasApiKey;
};

// Check if Google Maps API is available
export const isGoogleMapsAvailable = (): boolean => {
  if (isGoogleMapsDisabled()) return false;
  return typeof window !== 'undefined' && !!(window as any).google?.maps;
};

// Check if Google Places API is available
export const isGooglePlacesAvailable = (): boolean => {
  if (isGoogleMapsDisabled()) return false;
  return typeof window !== 'undefined' && !!(window as any).google?.maps?.places;
};

export const calculateDistance = (
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

export const geocodeAddress = async (address: string): Promise<Location | null> => {
  // Check if running in browser with Google Maps loaded
  if (typeof window === 'undefined' || !(window as any).google?.maps) {
    console.warn('Google Maps API not loaded - using fallback with default coordinates');
    // Return a fallback location with the entered address
    // Uses Bangalore, India as default coordinates (can be overridden by user)
    return {
      address: address,
      lat: 12.9716 + (Math.random() - 0.5) * 0.1, // Add slight randomization
      lng: 77.5946 + (Math.random() - 0.5) * 0.1,
    };
  }

  try {
    const google = (window as any).google;
    const geocoder = new google.maps.Geocoder();
    
    return new Promise((resolve) => {
      geocoder.geocode({ address }, (results: any[], status: string) => {
        if (status === 'OK' && results && results.length > 0) {
          const result = results[0];
          const location: Location = {
            address: result.formatted_address,
            lat: result.geometry.location.lat(),
            lng: result.geometry.location.lng()
          };
          resolve(location);
        } else {
          console.error('Geocoding failed:', status);
          // Fallback: return the address with default coordinates
          resolve({
            address: address,
            lat: 12.9716 + (Math.random() - 0.5) * 0.1,
            lng: 77.5946 + (Math.random() - 0.5) * 0.1,
          });
        }
      });
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    // Fallback on error
    return {
      address: address,
      lat: 12.9716 + (Math.random() - 0.5) * 0.1,
      lng: 77.5946 + (Math.random() - 0.5) * 0.1,
    };
  }
};

export const initializeAutocomplete = async (
  inputElement: HTMLInputElement,
  onPlaceSelected: (location: Location) => void
): Promise<any> => {
  // Check if Google Maps is disabled
  if (isGoogleMapsDisabled()) {
    console.warn('Google Maps is disabled. Address autocomplete disabled.');
    // Return a no-op handler - user can still type address manually
    return { 
      destroy: () => {},
      isAvailable: false 
    };
  }

  // Wait for Google Maps to be loaded
  if (typeof window === 'undefined' || !(window as any).google?.maps?.places) {
    console.warn('Google Maps Places API not loaded yet. Waiting...');
    
    // Poll for Google Maps availability
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds total
      
      const checkInterval = setInterval(() => {
        attempts++;
        if ((window as any).google?.maps?.places) {
          clearInterval(checkInterval);
          resolve(initializeGoogleAutocomplete(inputElement, onPlaceSelected));
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          console.warn('Google Maps Places API failed to load - autocomplete disabled');
          resolve({ destroy: () => {}, isAvailable: false });
        }
      }, 100);
    });
  }
  
  return initializeGoogleAutocomplete(inputElement, onPlaceSelected);
};

const initializeGoogleAutocomplete = (
  inputElement: HTMLInputElement,
  onPlaceSelected: (location: Location) => void
): any => {
  const google = (window as any).google;
  
  // Create autocomplete instance
  const autocomplete = new google.maps.places.Autocomplete(inputElement, {
    types: ['geocode', 'establishment'],
    fields: ['formatted_address', 'geometry', 'name', 'place_id']
  });
  
  // Listen for place selection
  const placeChangedListener = autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    
    if (!place.geometry || !place.geometry.location) {
      console.warn('No geometry found for selected place');
      return;
    }
    
    const location: Location = {
      address: place.formatted_address || place.name || '',
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    };
    
    console.log('Google Place selected:', location);
    onPlaceSelected(location);
  });
  
  return {
    destroy: () => {
      google.maps.event.removeListener(placeChangedListener);
    },
    autocomplete
  };
};

export const findNearbyMatches = (
  userLocation: { lat: number; lng: number },
  items: Array<{ location: { lat: number; lng: number } }>,
  radiusKm: number = 10
) => {
  return items.filter(item => {
    const distance = calculateDistance(userLocation, item.location);
    return distance <= radiusKm;
  }).sort((a, b) => {
    const distanceA = calculateDistance(userLocation, a.location);
    const distanceB = calculateDistance(userLocation, b.location);
    return distanceA - distanceB;
  });
};