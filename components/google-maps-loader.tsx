'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

interface GoogleMapsLoaderProps {
  children: React.ReactNode;
}

export default function GoogleMapsLoader({ children }: GoogleMapsLoaderProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
      setIsLoaded(true);
    }
  }, []);

  const hasApiKey = Boolean(
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && 
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY' &&
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.trim() !== ''
  );

  return (
    <>
      {hasApiKey && !isLoaded && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          onLoad={() => {
            console.log('Google Maps API loaded');
            setIsLoaded(true);
          }}
          onError={() => {
            console.error('Failed to load Google Maps API');
          }}
          strategy="afterInteractive"
        />
      )}
      {children}
    </>
  );
}
