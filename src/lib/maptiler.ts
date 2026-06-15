// src/lib/maptiler.ts - Using CDN with Fallback and detailed logging
let _sdk: any = null;

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY || "Ok823KpV0slQnqrfSW5M";
const SDK_URL = "https://cdn.maptiler.com/maptiler-sdk-js/v2.3.0/maptiler-sdk.umd.min.js";
const CSS_URL = "https://cdn.maptiler.com/maptiler-sdk-js/v2.3.0/maptiler-sdk.css";

// Provider status for monitoring
export const mapProviderStatus = {
  initialized: false,
  provider: 'none' as 'maptiler' | 'leaflet' | 'none',
  version: 'unknown',
  error: null as string | null
};

export async function getMapTilerSDK() {
  if (typeof window === "undefined") return null;
  
  console.log("[MapLoader] Requesting SDK. Current status:", mapProviderStatus);
  
  if (_sdk) {
    console.log("[MapLoader] Returning cached SDK:", mapProviderStatus.provider);
    return _sdk;
  }
  
  if ((window as any).maptilersdk) {
    console.log("[MapLoader] MapTiler SDK already found on window.");
    _sdk = (window as any).maptilersdk;
    _sdk.config.apiKey = MAPTILER_KEY;
    mapProviderStatus.initialized = true;
    mapProviderStatus.provider = 'maptiler';
    mapProviderStatus.version = _sdk.version || 'v2.x';
    return _sdk;
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.error("[MapLoader] MapTiler load timeout after 8s. Forcing fallback.");
      mapProviderStatus.error = "Timeout loading MapTiler";
      resolve(null);
    }, 8000);

    // Load CSS
    if (!document.querySelector(`link[href="${CSS_URL}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = CSS_URL;
      document.head.appendChild(link);
    }

    // Load Script
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => {
      clearTimeout(timeout);
      const sdk = (window as any).maptilersdk;
      if (sdk) {
        console.log("[MapLoader] MapTiler SDK loaded successfully via CDN. Version:", sdk.version);
        sdk.config.apiKey = MAPTILER_KEY;
        _sdk = sdk;
        mapProviderStatus.initialized = true;
        mapProviderStatus.provider = 'maptiler';
        mapProviderStatus.version = sdk.version || 'v2.x';
        resolve(sdk);
      } else {
        console.error("[MapLoader] MapTiler SDK not found on window after script.onload");
        mapProviderStatus.error = "SDK not found after load";
        resolve(null);
      }
    };
    script.onerror = (e) => {
      clearTimeout(timeout);
      console.error("[MapLoader] Failed to load MapTiler script from CDN:", e);
      mapProviderStatus.error = "CDN script error";
      resolve(null);
    };
    document.head.appendChild(script);
  });
}

export interface GeocodeResult {
  address: string;
  lat: number;
  lng: number;
  id: string;
  quality: "exact" | "approximate" | "zipcode";
}

export async function searchAddress(query: string, components?: {
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  zipcode?: string | null;
}): Promise<GeocodeResult[]> {
  if (!query || typeof window === "undefined") return [];

  try {
    const sdk = await getMapTilerSDK();
    if (!sdk || !sdk.geocoding) {
      console.warn("[MapLoader] Geocoding fallback: SDK not available");
      return [];
    }

    let results = await performGeocode(sdk, query);
    if (results.length > 0) return results.map((r: any) => ({ ...r, quality: "exact" }));

    if (components) {
      const { street, neighborhood, city, zipcode } = components;

      if (street && (neighborhood || city)) {
        const fallbackQuery = [street, neighborhood, city, "Brasil"].filter(Boolean).join(", ");
        results = await performGeocode(sdk, fallbackQuery);
        if (results.length > 0) return results.map((r: any) => ({ ...r, quality: "approximate" }));
      }

      if (zipcode || (neighborhood && city)) {
        const lastResortQuery = [zipcode, neighborhood, city, "Brasil"].filter(Boolean).join(", ");
        results = await performGeocode(sdk, lastResortQuery);
        if (results.length > 0) return results.map((r: any) => ({ ...r, quality: "zipcode" }));
      }
    }
  } catch (err) {
    console.error("[MapLoader] searchAddress error:", err);
  }

  return [];
}

async function performGeocode(sdk: any, query: string) {
  try {
    const results = await sdk.geocoding.forward(query, {
      country: ["br"],
      limit: 3,
    });

    return (results.features || []).map((f: any) => ({
      address: f.place_name,
      lat: f.geometry.type === 'Point' ? f.geometry.coordinates[1] : 0,
      lng: f.geometry.type === 'Point' ? f.geometry.coordinates[0] : 0,
      id: f.id
    })).filter((r: any) => r.lat !== 0 && r.lng !== 0);
  } catch (error) {
    console.error("[MapLoader] Geocoding fetch error:", error);
    return [];
  }
}
