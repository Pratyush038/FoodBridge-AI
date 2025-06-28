import mapboxgl from 'mapbox-gl';

// Set Mapbox access token with fallback
const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY || 'pk.eyJ1IjoiZGVtby11c2VyIiwiYSI6ImRlbW8tdG9rZW4ifQ.demo-signature';

// Check if we have a valid Mapbox token
const hasValidMapboxToken = mapboxToken !== 'pk.eyJ1IjoiZGVtby11c2VyIiwiYSI6ImRlbW8tdG9rZW4ifQ.demo-signature' && 
                           mapboxToken.startsWith('pk.');

if (!hasValidMapboxToken) {
  console.warn('⚠️ Mapbox API key not found or invalid. Map functionality will be limited.');
} else {
  mapboxgl.accessToken = mapboxToken;
}

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

export const initializeMap = async (
  mapElement: HTMLElement,
  center: { lat: number; lng: number } = { lat: 40.7128, lng: -74.0060 }
): Promise<mapboxgl.Map | null> => {
  try {
    if (!hasValidMapboxToken) {
      console.warn('Cannot initialize map without valid Mapbox token');
      // Create a placeholder div
      mapElement.innerHTML = `
        <div class="flex items-center justify-center h-full bg-gray-100 rounded-lg">
          <div class="text-center p-8">
            <div class="text-4xl mb-4">🗺️</div>
            <h3 class="text-lg font-semibold text-gray-700 mb-2">Map View</h3>
            <p class="text-gray-500">Map functionality requires a Mapbox API key</p>
            <p class="text-sm text-gray-400 mt-2">Add NEXT_PUBLIC_MAPBOX_API_KEY to your environment</p>
          </div>
        </div>
      `;
      return null;
    }

    const map = new mapboxgl.Map({
      container: mapElement,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [center.lng, center.lat],
      zoom: 12,
      attributionControl: true
    });

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    
    // Add geolocate control
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      }),
      'top-right'
    );

    // Wait for map to load
    await new Promise((resolve) => {
      map.on('load', resolve);
    });

    console.log('✅ Map initialized successfully');
    return map;
  } catch (error) {
    console.error('❌ Error initializing map:', error);
    // Create error placeholder
    mapElement.innerHTML = `
      <div class="flex items-center justify-center h-full bg-red-50 rounded-lg border border-red-200">
        <div class="text-center p-8">
          <div class="text-4xl mb-4">⚠️</div>
          <h3 class="text-lg font-semibold text-red-700 mb-2">Map Error</h3>
          <p class="text-red-600">Failed to load map</p>
          <p class="text-sm text-red-500 mt-2">Please check your Mapbox configuration</p>
        </div>
      </div>
    `;
    return null;
  }
};

export const addMarkersToMap = (
  map: mapboxgl.Map | null,
  markers: MapMarker[]
): mapboxgl.Marker[] => {
  if (!map || !hasValidMapboxToken) {
    console.warn('Cannot add markers: map not available');
    return [];
  }

  try {
    return markers.map(marker => {
      // Create a custom marker element
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.cssText = `
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background-color: ${marker.type === 'donor' ? '#10b981' : '#3b82f6'};
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: white;
        font-weight: bold;
      `;
      
      // Add icon based on type
      el.textContent = marker.type === 'donor' ? '🍽️' : '🏠';

      // Create popup content
      const popupContent = `
        <div class="p-3 max-w-xs">
          <h3 class="font-semibold text-lg text-gray-900">${marker.info.name}</h3>
          <p class="text-sm text-gray-600 mt-1">${marker.info.description}</p>
          ${marker.info.contact ? `<p class="text-sm text-blue-600 mt-2">${marker.info.contact}</p>` : ''}
          <div class="mt-2">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              marker.type === 'donor' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-blue-100 text-blue-800'
            }">
              ${marker.type === 'donor' ? 'Food Donor' : 'Food Receiver'}
            </span>
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({ 
        offset: 25,
        closeButton: true,
        closeOnClick: false
      }).setHTML(popupContent);

      // Create and add marker
      const mapMarker = new mapboxgl.Marker(el)
        .setLngLat([marker.position.lng, marker.position.lat])
        .setPopup(popup)
        .addTo(map);

      // Add click event
      el.addEventListener('click', () => {
        console.log('Marker clicked:', marker.title);
      });

      return mapMarker;
    });
  } catch (error) {
    console.error('❌ Error adding markers to map:', error);
    return [];
  }
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
  if (!hasValidMapboxToken) {
    console.warn('Cannot geocode address: Mapbox token not available');
    // Return a mock location for demo purposes
    return {
      address: address,
      lat: 40.7128 + (Math.random() - 0.5) * 0.1,
      lng: -74.0060 + (Math.random() - 0.5) * 0.1
    };
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxgl.accessToken}&limit=1`
    );
    
    if (!response.ok) {
      throw new Error(`Geocoding request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      return {
        address: feature.place_name,
        lat: feature.center[1],
        lng: feature.center[0]
      };
    }
    
    console.warn('No geocoding results found for:', address);
    return null;
  } catch (error) {
    console.error('❌ Geocoding error:', error);
    // Return a mock location as fallback
    return {
      address: address,
      lat: 40.7128 + (Math.random() - 0.5) * 0.1,
      lng: -74.0060 + (Math.random() - 0.5) * 0.1
    };
  }
};

export const initializeAutocomplete = (
  inputElement: HTMLInputElement,
  onPlaceSelected: (location: Location) => void
): any => {
  if (!hasValidMapboxToken) {
    console.warn('Cannot initialize autocomplete: Mapbox token not available');
    // Add a simple placeholder behavior
    inputElement.placeholder = 'Enter address (Mapbox API key required for suggestions)';
    
    // Simple fallback - just use the entered text
    const handleEnter = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        const address = inputElement.value.trim();
        if (address) {
          // Create a mock location
          const mockLocation: Location = {
            address: address,
            lat: 40.7128 + (Math.random() - 0.5) * 0.1,
            lng: -74.0060 + (Math.random() - 0.5) * 0.1
          };
          onPlaceSelected(mockLocation);
        }
      }
    };
    
    inputElement.addEventListener('keydown', handleEnter);
    
    return {
      destroy: () => {
        inputElement.removeEventListener('keydown', handleEnter);
      }
    };
  }

  // Full autocomplete implementation with Mapbox
  let timeoutId: NodeJS.Timeout;
  let currentSuggestionsList: HTMLElement | null = null;
  
  const handleInput = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const query = target.value.trim();
    
    // Clear existing suggestions
    if (currentSuggestionsList) {
      currentSuggestionsList.remove();
      currentSuggestionsList = null;
    }
    
    if (query.length < 3) return;
    
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&limit=5&types=address,poi`
        );
        
        if (!response.ok) return;
        
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
          // Create suggestions dropdown
          const suggestionsList = document.createElement('ul');
          suggestionsList.id = 'autocomplete-suggestions';
          suggestionsList.className = 'absolute top-full left-0 right-0 bg-white border border-gray-300 border-t-0 rounded-b-md max-h-60 overflow-y-auto z-50 shadow-lg';
          suggestionsList.style.listStyle = 'none';
          suggestionsList.style.margin = '0';
          suggestionsList.style.padding = '0';
          
          data.features.forEach((feature: any, index: number) => {
            const li = document.createElement('li');
            li.className = 'px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0';
            li.innerHTML = `
              <div class="font-medium text-gray-900">${feature.text}</div>
              <div class="text-sm text-gray-500">${feature.place_name}</div>
            `;
            
            li.addEventListener('click', () => {
              const location: Location = {
                address: feature.place_name,
                lat: feature.center[1],
                lng: feature.center[0]
              };
              
              inputElement.value = feature.place_name;
              suggestionsList.remove();
              currentSuggestionsList = null;
              onPlaceSelected(location);
            });
            
            suggestionsList.appendChild(li);
          });
          
          // Position the suggestions list
          const inputRect = inputElement.getBoundingClientRect();
          const parentElement = inputElement.parentElement;
          
          if (parentElement) {
            parentElement.style.position = 'relative';
            parentElement.appendChild(suggestionsList);
            currentSuggestionsList = suggestionsList;
          }
        }
      } catch (error) {
        console.error('❌ Autocomplete error:', error);
      }
    }, 300);
  };
  
  const handleClickOutside = (event: Event) => {
    if (currentSuggestionsList && !inputElement.contains(event.target as Node) && !currentSuggestionsList.contains(event.target as Node)) {
      currentSuggestionsList.remove();
      currentSuggestionsList = null;
    }
  };
  
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && currentSuggestionsList) {
      currentSuggestionsList.remove();
      currentSuggestionsList = null;
    }
  };
  
  inputElement.addEventListener('input', handleInput);
  document.addEventListener('click', handleClickOutside);
  inputElement.addEventListener('keydown', handleKeyDown);
  
  return {
    destroy: () => {
      inputElement.removeEventListener('input', handleInput);
      document.removeEventListener('click', handleClickOutside);
      inputElement.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeoutId);
      if (currentSuggestionsList) {
        currentSuggestionsList.remove();
      }
    }
  };
};

export const findNearbyMatches = <T extends { location: { lat: number; lng: number } }>(
  userLocation: { lat: number; lng: number },
  items: T[],
  radiusKm: number = 10
): T[] => {
  try {
    return items
      .filter(item => {
        const distance = calculateDistance(userLocation, item.location);
        return distance <= radiusKm;
      })
      .sort((a, b) => {
        const distanceA = calculateDistance(userLocation, a.location);
        const distanceB = calculateDistance(userLocation, b.location);
        return distanceA - distanceB;
      });
  } catch (error) {
    console.error('❌ Error finding nearby matches:', error);
    return items; // Return all items if there's an error
  }
};

// Utility function to check if maps are available
export const isMapsAvailable = (): boolean => {
  return hasValidMapboxToken;
};

// Get map status for UI display
export const getMapStatus = (): { available: boolean; message: string } => {
  if (hasValidMapboxToken) {
    return {
      available: true,
      message: 'Maps are fully functional'
    };
  } else {
    return {
      available: false,
      message: 'Add NEXT_PUBLIC_MAPBOX_API_KEY to enable maps'
    };
  }
};