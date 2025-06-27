import mapboxgl from 'mapbox-gl';

// Set Mapbox access token with fallback
const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY || 'pk.eyJ1IjoiYmFubmVyeiIsImEiOiJjbHd6aHo4MHkwN2U2MmpxcGQ3M2w5eWd5In0.iSjrMliSYCJbQZl_dsyERQ';
mapboxgl.accessToken = mapboxToken;

// Check if we have a valid Mapbox token
const hasValidMapboxToken = mapboxToken !== 'pk.eyJ1IjoiYmFubmVyeiIsImEiOiJjbHd6aHo4MHkwN2U2MmpxcGQ3M2w5eWd5In0.iSjrMliSYCJbQZl_dsyERQ';

if (!hasValidMapboxToken) {
  console.warn('⚠️ Mapbox API key not found. Using demo token.');
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
): Promise<mapboxgl.Map> => {
  const map = new mapboxgl.Map({
    container: mapElement,
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [center.lng, center.lat],
    zoom: 12
  });

  // Add navigation controls
  map.addControl(new mapboxgl.NavigationControl());
  
  return map;
};

export const addMarkersToMap = (
  map: mapboxgl.Map,
  markers: MapMarker[]
): mapboxgl.Marker[] => {
  return markers.map(marker => {
    // Create a custom marker element
    const el = document.createElement('div');
    el.className = 'marker';
    el.style.width = '30px';
    el.style.height = '30px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = marker.type === 'donor' ? '#10b981' : '#3b82f6';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
    el.style.cursor = 'pointer';

    // Create popup content
    const popupContent = `
      <div class="p-3 max-w-xs">
        <h3 class="font-semibold text-lg">${marker.info.name}</h3>
        <p class="text-sm text-gray-600 mt-1">${marker.info.description}</p>
        ${marker.info.contact ? `<p class="text-sm text-blue-600 mt-2">${marker.info.contact}</p>` : ''}
      </div>
    `;

    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent);

    // Create and add marker
    const mapMarker = new mapboxgl.Marker(el)
      .setLngLat([marker.position.lng, marker.position.lat])
      .setPopup(popup)
      .addTo(map);

    return mapMarker;
  });
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
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxgl.accessToken}&limit=1`
    );
    
    if (!response.ok) {
      throw new Error('Geocoding request failed');
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
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

export const initializeAutocomplete = async (
  inputElement: HTMLInputElement,
  onPlaceSelected: (location: Location) => void
): Promise<any> => {
  // Create a simple autocomplete using Mapbox Geocoding API
  let timeoutId: NodeJS.Timeout;
  
  const handleInput = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const query = target.value.trim();
    
    if (query.length < 3) return;
    
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&limit=5&types=address`
        );
        
        if (!response.ok) return;
        
        const data = await response.json();
        
        // Clear existing suggestions
        const existingList = document.getElementById('autocomplete-suggestions');
        if (existingList) {
          existingList.remove();
        }
        
        if (data.features && data.features.length > 0) {
          // Create suggestions dropdown
          const suggestionsList = document.createElement('ul');
          suggestionsList.id = 'autocomplete-suggestions';
          suggestionsList.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-top: none;
            border-radius: 0 0 4px 4px;
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            list-style: none;
            margin: 0;
            padding: 0;
          `;
          
          data.features.forEach((feature: any) => {
            const li = document.createElement('li');
            li.textContent = feature.place_name;
            li.style.cssText = `
              padding: 8px 12px;
              cursor: pointer;
              border-bottom: 1px solid #eee;
            `;
            
            li.addEventListener('click', () => {
              const location: Location = {
                address: feature.place_name,
                lat: feature.center[1],
                lng: feature.center[0]
              };
              
              inputElement.value = feature.place_name;
              suggestionsList.remove();
              onPlaceSelected(location);
            });
            
            li.addEventListener('mouseenter', () => {
              li.style.backgroundColor = '#f5f5f5';
            });
            
            li.addEventListener('mouseleave', () => {
              li.style.backgroundColor = 'white';
            });
            
            suggestionsList.appendChild(li);
          });
          
          inputElement.parentElement?.appendChild(suggestionsList);
        }
      } catch (error) {
        console.error('Autocomplete error:', error);
      }
    }, 300);
  };
  
  inputElement.addEventListener('input', handleInput);
  
  // Remove suggestions when clicking outside
  document.addEventListener('click', (event) => {
    const suggestionsList = document.getElementById('autocomplete-suggestions');
    if (suggestionsList && !inputElement.contains(event.target as Node)) {
      suggestionsList.remove();
    }
  });
  
  return { destroy: () => {
    inputElement.removeEventListener('input', handleInput);
    clearTimeout(timeoutId);
  }};
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