'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

interface GoogleMapsLoaderProps {
  children: React.ReactNode;
}

// Check if Google Maps is explicitly disabled or if there's no valid API key
export const isGoogleMapsDisabled = (): boolean => {
  // Set NEXT_PUBLIC_DISABLE_GOOGLE_MAPS=true in .env.local to disable
  if (process.env.NEXT_PUBLIC_DISABLE_GOOGLE_MAPS === 'true') {
    return true;
  }
  // Also disable if no API key is configured
  const hasApiKey = Boolean(
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && 
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY' &&
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.trim() !== ''
  );
  return !hasApiKey;
};

export default function GoogleMapsLoader({ children }: GoogleMapsLoaderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const disabled = isGoogleMapsDisabled();

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (!disabled && typeof window !== 'undefined' && (window as any).google?.maps?.places) {
      setIsLoaded(true);
    }
  }, [disabled]);

  // Don't load the script if disabled
  if (disabled) {
    return <>{children}</>;
  }

  return (
    <>
      {!isLoaded && (
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
