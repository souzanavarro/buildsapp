import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useTelemetry } from '@/hooks/useTelemetry';
import { useAuth } from '@/hooks/use-auth';

interface LocationContextType {
  location: {
    latitude: number;
    longitude: number;
    heading: number | null;
    speed: number | null;
    accuracy: number;
    timestamp: number;
  } | null;
  requestAllPermissions: () => Promise<void>;
  permissions: {
    location: string;
    camera: string;
  };
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { location, startTracking, stopTracking, requestAllPermissions, permissions } = useTelemetry();

  useEffect(() => {
    // Only track if user is logged in
    if (auth.user) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [auth.user, startTracking, stopTracking]);

  return (
    <LocationContext.Provider value={{ location, requestAllPermissions, permissions }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
