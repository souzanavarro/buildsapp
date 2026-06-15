export const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY ||
  "") as string;

export const FALLBACK_GOOGLE_MAPS_API_KEY = (import.meta.env
  .VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY || "") as string;

export const GOOGLE_MAPS_MAP_ID = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ||
  "a84502ede9d1e4bf1a7bdabe") as string;

const CHANNEL = (import.meta.env.VITE_GOOGLE_MAPS_TRACKING_ID ||
  import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID) as string;

let loaderPromise: Promise<any> | null = null;
const CALLBACK_NAME = "__rotaCertaInitGoogleMaps";

export function loadGoogleMaps(forceFallback: boolean = false): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));

  const shouldFallback =
    forceFallback || localStorage.getItem("google_maps_use_fallback") === "true";
  const apiKey =
    shouldFallback && FALLBACK_GOOGLE_MAPS_API_KEY
      ? FALLBACK_GOOGLE_MAPS_API_KEY
      : GOOGLE_MAPS_API_KEY;

  if (!apiKey) return Promise.reject(new Error("Google Maps API key not configured"));
  if ((window as any).google?.maps && !forceFallback) return Promise.resolve((window as any).google);
  if (loaderPromise && !forceFallback) return loaderPromise;

  const tryLoad = (key: string, isFallback: boolean = false): Promise<any> =>
    new Promise((resolve, reject) => {
      (window as any)[CALLBACK_NAME] = () => resolve((window as any).google);

      const script = document.createElement("script");
      const channelParam = CHANNEL ? `&channel=${CHANNEL}` : "";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=${CALLBACK_NAME}${channelParam}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;

      script.onerror = () => {
        if (!isFallback && FALLBACK_GOOGLE_MAPS_API_KEY) {
          if (script.parentNode) script.parentNode.removeChild(script);
          tryLoad(FALLBACK_GOOGLE_MAPS_API_KEY, true).then(resolve).catch(reject);
        } else {
          loaderPromise = null;
          reject(new Error("Falha ao carregar Google Maps (todas as chaves falharam)"));
        }
      };

      document.head.appendChild(script);
    });

  loaderPromise = tryLoad(apiKey, shouldFallback);
  return loaderPromise;
}
