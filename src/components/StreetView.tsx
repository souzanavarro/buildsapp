import React, { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/lib/google-maps";

interface StreetViewProps {
  latitude: number;
  longitude: number;
  className?: string;
  heading?: number;
  pitch?: number;
}

export function StreetView({ latitude, longitude, className, heading = 0, pitch = 0 }: StreetViewProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !latitude || !longitude) return;

    let cancelled = false;

    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !ref.current) return;

        new google.maps.StreetViewPanorama(ref.current, {
          position: { lat: latitude, lng: longitude },
          pov: { heading, pitch },
          zoom: 0,
          addressControl: false,
          showRoadLabels: false,
          zoomControl: false,
          panControl: false,
          enableCloseButton: false,
        });
      })
      .catch((err) => {
        console.error("Erro ao carregar Street View:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, heading, pitch]);

  return (
    <div 
      ref={ref} 
      className={className} 
      style={{ minHeight: "150px", backgroundColor: "#f1f5f9" }} 
    />
  );
}
