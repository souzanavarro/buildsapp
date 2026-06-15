import React, { useEffect, useRef, useState, useMemo, useCallback, memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getMapTilerSDK, mapProviderStatus } from "@/lib/maptiler";
import {
  Maximize2,
  Minimize2,
  Moon,
  Sun,
  LocateFixed,
  Navigation2,
  Volume2,
  VolumeX,
  Globe,
  Box,
  TrafficCone,
  AlertTriangle,
  Eye,
  EyeOff,
  MapPin,
  Building2,
  Filter,
  ChevronUp,
  X,
  ScanLine,
  List as ListIcon,
  Map as MapIconL,
  RotateCcw,
  SkipForward,
  Settings,
  Mic,
  MicOff,
  Zap,
  Wifi,
  WifiOff,
  CheckCircle2,
  Phone,
  Clock,
  Layers,
  Milestone,
} from "lucide-react";
import {
  getNavSettings,
  onNavSettingsChange,
  setNavSettings,
  MAP_RECENTER_EVENT,
  MAP_FIT_ALL_EVENT,
  NavSettings,
  speakInstruction,
} from "@/lib/nav-settings";
import { sendLocalNotification } from "@/lib/native-utils";
import { useAuth } from "@/hooks/use-auth";
import { DrivingModeOverlay } from "@/features/map/DrivingModeOverlay";
import { useTranslation } from "react-i18next";
import throttle from "lodash/throttle";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { cn } from "@/lib/utils";

export interface MapStop {
  id: string;
  latitude: number;
  longitude: number;
  status: string;
  sequence?: number;
  originalSequence?: number;
  destination_address?: string;
  neighborhood?: string;
  isGroup?: boolean;
  totalItems?: number;
  itemsDelivered?: number;
  hasHistoryIssues?: boolean;
  hasCustomerNotes?: boolean;
}

interface MapViewProps {
  stops: MapStop[];
  userLocation?: {
    latitude: number;
    longitude: number;
    heading?: number | null;
    speed?: number | null;
  } | null;
  activeStopIndex?: number;
  focusCenter?: { latitude: number; longitude: number; zoom?: number } | null;
  followUser?: boolean;
  routePhase?: "idle" | "navigating";
  height?: number | string;
  onFilterChange?: (filter: string) => void;
  onStopClick?: (stop: MapStop) => void;
  onMapClick?: () => void;
  onScanClick?: () => void;
  onOpenList?: () => void;
  onAutoArrival?: (stopId: string) => void;
  showDelivered?: boolean;
  onToggleShowDelivered?: () => void;
  children?: React.ReactNode;
}

// Simple internal Error Boundary component for the map
class MapErrorBoundary extends React.Component<{ children: React.ReactNode, fallback: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("MapView Error Boundary caught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export const MapView = memo(function MapView({
  stops = [],
  userLocation,
  activeStopIndex,
  focusCenter,
  followUser,
  routePhase = "idle",
  height = "100%",
  onFilterChange,
  onStopClick,
  onMapClick,
  onScanClick,
  onOpenList,
  onAutoArrival,
  showDelivered = true,
  onToggleShowDelivered,
  children,
}: MapViewProps) {

  const { t } = useTranslation();
  const sdkRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);

  const initLeafletFallback = useCallback(async () => {
    console.log("[MapView] Initializing Leaflet fallback...");
    try {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      
      if (!mapContainerRef.current) return;
      
      const map = L.map(mapContainerRef.current).setView([-23.5505, -46.6333], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      leafletRef.current = map;
      mapRef.current = {
        remove: () => map.remove(),
        flyTo: (opt: any) => map.flyTo([opt.center[1], opt.center[0]], opt.zoom),
        fitBounds: (bounds: any, opt: any) => {
          const b = [[bounds.getSouth(), bounds.getWest()], [bounds.getNorth(), bounds.getEast()]];
          map.fitBounds(b as any, { padding: [opt.padding, opt.padding] });
        },
        on: (evt: string, cb: any) => map.on(evt as any, cb),
        loaded: () => true,
        getBearing: () => 0,
        easeTo: () => {},
        resize: () => map.invalidateSize()
      };
      
      // Setup simplified marker adding
      const originalMarker = sdkRef.current?.Marker;
      sdkRef.current = {
        ...sdkRef.current,
        Marker: class {
          _el: any; _pos: any; _m: any;
          constructor(opt: any) { this._el = opt.element; }
          setLngLat(pos: any) { this._pos = pos; return this; }
          addTo() {
            this._m = L.marker([this._pos[1], this._pos[0]], {
              icon: L.divIcon({ html: this._el.innerHTML, className: this._el.className, iconSize: [32, 32], iconAnchor: [16, 16] })
            }).addTo(map);
            return this;
          }
          remove() { if(this._m) map.removeLayer(this._m); }
          getElement() { return this._el; }
        },
        LngLatBounds: class {
          _bounds: any[] = [];
          extend(pos: any) { this._bounds.push([pos[1], pos[0]]); return this; }
          getSouth() { return Math.min(...this._bounds.map(b => b[0])); }
          getWest() { return Math.min(...this._bounds.map(b => b[1])); }
          getNorth() { return Math.max(...this._bounds.map(b => b[0])); }
          getEast() { return Math.max(...this._bounds.map(b => b[1])); }
        }
      };

      setMapError(null);
      setMapReady(true);
      mapProviderStatus.provider = 'leaflet';
      console.log("[MapView] Leaflet fallback ready.");
    } catch (e) {
      console.error("[MapView] Fallback failed:", e);
      setMapError("Falha total ao carregar serviços de mapa.");
    }
  }, []);
  const containerWrapRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const userMarkerRef = useRef<any>(null);

  const osrmAbortRef = useRef<AbortController | null>(null);
  const userZoomedRef = useRef<boolean>(false);
  const lastNearbyStopRef = useRef<string | null>(null);
  const autoArrivalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestUserLocationRef = useRef(userLocation);

  const { roles } = useAuth();
  const isAdmin = roles?.includes("admin") ?? false;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [navSettings, setNavSettingsState] = useState<NavSettings>(() => getNavSettings());
  const [showTraffic, setShowTraffic] = useState(navSettings.showTraffic);
  const [showLegend, setShowLegend] = useState(false);
  const [bearing, setBearing] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showConfigMenu, setShowConfigMenu] = useState(false);
  const [selectedPreviewStop, setSelectedPreviewStop] = useState<MapStop | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showRightControls, setShowRightControls] = useState(true);
  const didInitialZoomRef = useRef(false);
  const lastFilterRef = useRef<string>("all");



  const validStops = useMemo(() => {
    return (stops || []).filter(s => 
      s && 
      typeof s.latitude === 'number' && !isNaN(s.latitude) && 
      typeof s.longitude === 'number' && !isNaN(s.longitude)
    );
  }, [stops]);

  const isDark = navSettings.darkMap;
  const maptilerKey = import.meta.env.VITE_MAPTILER_API_KEY || "Ok823KpV0slQnqrfSW5M";

  useEffect(() => {
    latestUserLocationRef.current = userLocation;
    if (userMarkerRef.current && userLocation && !isNaN(userLocation.latitude) && !isNaN(userLocation.longitude)) {
      userMarkerRef.current.setLngLat([userLocation.longitude, userLocation.latitude]);
      
      const el = userMarkerRef.current.getElement();
      const arrow = el.querySelector(".user-direction-arrow") as HTMLElement;
      if (arrow && userLocation.heading !== null && userLocation.heading !== undefined) {
        arrow.style.transform = `rotate(${userLocation.heading}deg)`;
        arrow.style.display = "block";
      } else if (arrow) {
        arrow.style.display = "none";
      }
    }
  }, [userLocation]);

  const updateSettings = useCallback((patch: Partial<NavSettings>) => {
    setNavSettingsState((prev) => {
      const next = { ...prev, ...patch };
      setNavSettings(next);
      return next;
    });
  }, []);

  useEffect(() => onNavSettingsChange(setNavSettingsState), []);

  // Sincronização de Modo Noturno (Item 3 - Android Auto)
  useEffect(() => {
    if (!navSettings.autoNightMode) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      updateSettings({ darkMap: e.matches });
    };

    mediaQuery.addEventListener('change', handleChange);
    // Atualização inicial
    if (navSettings.darkMap !== mediaQuery.matches) {
       updateSettings({ darkMap: mediaQuery.matches });
    }
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [navSettings.autoNightMode, navSettings.darkMap, updateSettings]);

  // Initialize MapTiler SDK Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || typeof window === "undefined") return;

    let cancelled = false;

    const initMap = async () => {
      console.log("[MapView] Starting initialization...");
      try {
        const sdk = await getMapTilerSDK();
        sdkRef.current = sdk;
        
        if (cancelled) return;

        if (!sdk) {
          console.error("[MapView] SDK failed to load. Triggering Leaflet fallback.");
          setMapError("Falha ao carregar MapTiler. Iniciando provedor secundário...");
          initLeafletFallback();
          return;
        }
        
        if (!mapContainerRef.current) {
          setMapError("Container do mapa não encontrado.");
          return;
        }

        console.log("[MapView] Using SDK version:", sdk.version || "unknown");

        const MapConstructor = typeof sdk.Map === 'function' ? sdk.Map : (sdk as any).default?.Map;
        if (!MapConstructor) {
          console.error("[MapView] Map constructor not found in SDK object", sdk);
          throw new Error("Map constructor not found");
        }

        // Auto night mode check
        const hour = new Date().getHours();
        const isNight = hour < 6 || hour > 18;
        const initialDark = navSettings.autoNightMode ? isNight : navSettings.darkMap;

        // Defensive MapStyle access
        let initialStyle = sdk.MapStyle?.STREETS;
        if (navSettings.satelliteMode) {
          initialStyle = sdk.MapStyle?.SATELLITE || initialStyle;
        } else if (initialDark) {
          initialStyle = sdk.MapStyle?.DATAVIZ?.DARK || sdk.MapStyle?.STREETS;
        }

        console.log("[MapView] Initializing Map with style:", initialStyle);

        const map = new MapConstructor({
          container: mapContainerRef.current,
          style: initialStyle || 'https://api.maptiler.com/maps/streets/style.json',
          center: [-46.6333, -23.5505],
          zoom: 13,
          geolocateControl: false,
          navigationControl: false,
          terrainControl: false,
          logoPosition: 'bottom-right',
        });

        mapRef.current = map;

        map.on('load', () => {
          console.log("[MapView] Map loaded successfully.");
          if (cancelled) return;
          // Add sources for route lines
          map.addSource('route-pending', {
            type: 'geojson',
            data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
          });

          map.addSource('route-alternatives', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
          });

          // Layer for alternatives (below main)
          map.addLayer({
            id: 'route-alternatives-layer',
            type: 'line',
            source: 'route-alternatives',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#94a3b8',
              'line-width': 4,
              'line-opacity': 0.4,
              'line-dasharray': [2, 1]
            }
          });

          map.addLayer({
            id: 'route-pending-layer',
            type: 'line',
            source: 'route-pending',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': navSettings.colorNav,
              'line-width': 6,
              'line-opacity': 0.8
            }
          });

          // 3D Buildings
          if (navSettings.threeDBuildings) {
            map.addLayer({
              'id': '3d-buildings',
              'source': 'composite',
              'source-layer': 'building',
              'filter': ['==', 'extrude', 'true'],
              'type': 'fill-extrusion',
              'minzoom': 15,
              'paint': {
                'fill-extrusion-color': '#aaa',
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-base': ['get', 'min_height'],
                'fill-extrusion-opacity': 0.6
              }
            }, 'route-pending-layer');
          }

          // Traffic layer placeholder
          if (navSettings.showTraffic) {
            try {
              (map as any).setTraffic(true);
              if (navSettings.threeDBuildings) {
                try {
                  map.setTerrain({ source: 'maptiler-terrain', exaggeration: 1.5 });
                } catch (e) {
                  console.warn("Initial terrain failed", e);
                }
              }
            } catch (e) {
              console.warn("Traffic not supported in this style");
            }
          }
          setMapReady(true);
        });

        map.on('click', (e: any) => {
          const features = map.queryRenderedFeatures(e.point);
          if (features.length === 0) {
            setSelectedPreviewStop(null);
            if (onMapClick) onMapClick();
          }
        });

        map.on('dragstart', () => {
          userZoomedRef.current = true;
        });

        map.on('zoomstart', () => {
          userZoomedRef.current = true;
        });

        map.on('rotate', () => {
          setBearing(map.getBearing());
        });

        // Handle user location marker
        const userEl = document.createElement('div');
        userEl.className = 'user-location-marker';
        userEl.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-8 h-8 bg-blue-500/20 rounded-full animate-ping"></div>
            <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg z-10"></div>
            <div class="user-direction-arrow absolute -top-4 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-blue-600" style="display: none; transform-origin: bottom center;"></div>
          </div>
        `;

        const MarkerConstructor = typeof sdk.Marker === 'function' ? sdk.Marker : (sdk as any).default?.Marker;
        if (!MarkerConstructor) throw new Error("Marker constructor not found");

        userMarkerRef.current = new MarkerConstructor({ element: userEl })
          .setLngLat([0, 0])
          .addTo(map);

      } catch (e: any) {
        console.error("[MapView] Map initialization failed", e);
        if (!cancelled) {
          setMapError("Erro ao inicializar MapTiler. Tentando fallback...");
          initLeafletFallback();
        }
      }
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);



  // Update Map Style when theme/satellite/traffic changes
  useEffect(() => {
    if (!mapRef.current) return;
    
    const updateStyle = async () => {
      const sdk = sdkRef.current;
      if (!sdk || !mapRef.current) return;

      if (navSettings.offlineMode) {
        // Estilo Raster simples para Offline (OpenStreetMap tiles)
        // Usamos tiles do OpenStreetMap que serão cacheados pelo Service Worker
        mapRef.current.setStyle({
          version: 8,
          sources: {
            'raster-tiles': {
              type: 'raster',
              tiles: [
                'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
              ],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [{
            id: 'simple-tiles',
            type: 'raster',
            source: 'raster-tiles',
            minzoom: 0,
            maxzoom: 19
          }]
        });
        return;
      }

      const hour = new Date().getHours();
      const isNight = hour < 6 || hour > 18;
      const currentDark = navSettings.autoNightMode ? isNight : isDark;

      if (mapProviderStatus.provider === 'leaflet') return; // Style not applicable to Leaflet
      const style = navSettings.satelliteMode 

        ? sdk.MapStyle?.SATELLITE 
        : (currentDark ? (sdk.MapStyle?.DATAVIZ?.DARK || sdk.MapStyle?.STREETS) : sdk.MapStyle?.STREETS);
      
      mapRef.current.setStyle(style);
      
      // Update terrain/3D
      if (navSettings.threeDBuildings && mapRef.current.loaded()) {
        try {
          mapRef.current.setTerrain({ source: 'maptiler-terrain', exaggeration: 1.5 });
        } catch (e) {
          console.warn("Terrain not ready", e);
        }
      } else if (mapRef.current.loaded()) {
        try {
          mapRef.current.setTerrain(null);
        } catch (e) {
          // Ignore
        }
      }
    };

    updateStyle();
  }, [isDark, navSettings.satelliteMode, navSettings.autoNightMode, navSettings.threeDBuildings, navSettings.offlineMode]);


  // Update Traffic
  useEffect(() => {
    if (!mapRef.current) return;
    try {
      if (mapRef.current.loaded()) {
        if (navSettings.showTraffic) {
          (mapRef.current as any).setTraffic(true);
        } else {
          (mapRef.current as any).setTraffic(false);
        }
      }
    } catch (e) {
      // Style might not support traffic
    }
  }, [navSettings.showTraffic]);

  // Handle Fullscreen
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(document.fullscreenElement === containerWrapRef.current);
      setTimeout(() => mapRef.current?.resize(), 200);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    const el = containerWrapRef.current as any;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      } else {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        } else if (el.msRequestFullscreen) {
          await el.msRequestFullscreen();
        } else {
          // Fallback CSS-based "pseudo-fullscreen"
          el.classList.toggle("fixed");
          el.classList.toggle("inset-0");
          el.classList.toggle("z-[100]");
          setIsFullscreen((v) => !v);
        }
      }
      
      // Attempt to lock orientation to landscape when entering fullscreen
      const orientation = window.screen?.orientation;
      if (typeof window !== 'undefined' && orientation && 'lock' in orientation) {
        if (!!document.fullscreenElement) {
          try {
            await (window.screen.orientation as any).lock('any');
          } catch (e) {
            console.log("Orientation lock failed:", e);
          }
        } else {
          try {
            (window.screen.orientation as any).unlock();
          } catch (e) {}
        }
      }

      // Force map resize
      setTimeout(() => mapRef.current?.resize(), 300);
    } catch (e) {
      console.warn("Fullscreen toggle error:", e);
    }
  };

  // Recenter and Fit All
  const debouncedDrawRouteLeaflet = useMemo(() => throttle(async (points: [number, number][]) => {
     if (!leafletRef.current) return;
     const L = (window as any).L;
     if (!L) return;
     const polyline = L.polyline(points.map(p => [p[0], p[1]]), { color: navSettings.colorNav }).addTo(leafletRef.current);
     leafletRef.current.fitBounds(polyline.getBounds());
  }, 1000), [navSettings.colorNav]);

  useEffect(() => {
    const handler = () => {
      if (!mapRef.current) return;
      userZoomedRef.current = false;
      const currentLocation = latestUserLocationRef.current;
      if (currentLocation && !isNaN(currentLocation.latitude) && !isNaN(currentLocation.longitude)) {
        mapRef.current.flyTo({
          center: [currentLocation.longitude, currentLocation.latitude],
          zoom: 17,
          duration: 1000,
          essential: true
        });
      } else if (validStops.length > 0) {
        const sdk = sdkRef.current;
        if (!sdk || !mapRef.current) return;
        const BoundsConstructor = typeof sdk.LngLatBounds === 'function' ? sdk.LngLatBounds : (sdk as any).default?.LngLatBounds;
        if (!BoundsConstructor) return;
        const bounds = new BoundsConstructor();
        validStops.forEach(s => bounds.extend([s.longitude, s.latitude]));
        mapRef.current.fitBounds(bounds, { padding: 40, maxZoom: 16 });
      }
    };
    window.addEventListener(MAP_RECENTER_EVENT, handler);
    
    const fitAllHandler = () => {
      if (!mapRef.current || stops.length === 0) return;
      userZoomedRef.current = false;
      const sdk = sdkRef.current;
      if (!sdk || !mapRef.current) return;
      const BoundsConstructor = typeof sdk.LngLatBounds === 'function' ? sdk.LngLatBounds : (sdk as any).default?.LngLatBounds;
      if (!BoundsConstructor) return;
      const bounds = new BoundsConstructor();
      validStops.forEach(s => bounds.extend([s.longitude, s.latitude]));
      mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 15 });
    };

    window.addEventListener(MAP_FIT_ALL_EVENT, fitAllHandler);
    
    return () => {
      window.removeEventListener(MAP_RECENTER_EVENT, handler);
      window.removeEventListener(MAP_FIT_ALL_EVENT, fitAllHandler);
    };
  }, [validStops]);

  // Route drawing
  const debouncedDrawRoute = useMemo(
    () =>
      throttle(async (points: [number, number][], navig: boolean, color: string, showAlts: boolean) => {
        if (!mapRef.current || points.length < 2) return;

        const coords = points.map((p) => `${p[1]},${p[0]}`).join(";");
        const altParam = showAlts ? "&alternatives=true" : "";
        const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true${altParam}`;
        
        try {
          osrmAbortRef.current?.abort();
          osrmAbortRef.current = new AbortController();

          const res = await fetch(url, { signal: osrmAbortRef.current.signal });
          const data = await res.json();
          
          if (!mapRef.current || data.code !== "Ok" || !data.routes?.[0]?.geometry) return;

          const routes = data.routes;
          const mainRoute = routes[0];
          
          const source = mapRef.current.getSource('route-pending');
          if (source) {
            source.setData({
              type: 'Feature',
              properties: {},
              geometry: mainRoute.geometry
            });
            
            if (mapRef.current.getLayer('route-pending-layer')) {
              mapRef.current.setPaintProperty('route-pending-layer', 'line-color', navig ? color : "#3b82f6");
            }
          }

          // Alternativas
          const altSource = mapRef.current.getSource('route-alternatives');
          if (altSource) {
            if (showAlts && routes.length > 1) {
              altSource.setData({
                type: 'FeatureCollection',
                features: routes.slice(1).map((r: any) => ({
                  type: 'Feature',
                  properties: {},
                  geometry: r.geometry
                }))
              });

            } else {
              altSource.setData({ type: 'FeatureCollection', features: [] });
            }
          }

          // Armazenar instruções para navegação por voz
          if (navig && mainRoute.legs?.[0]?.steps) {
            (window as any)._routeSteps = mainRoute.legs[0].steps;
          } else {
            (window as any)._routeSteps = [];
          }
        } catch (e) {
          if ((e as any)?.name !== "AbortError") console.warn("Route draw failed", e);
        }
      }, 800),
    [],
  );

  useEffect(() => {
    if (!mapRef.current || !mapReady || validStops.length === 0) return;
    const pendingStops = validStops.filter((s) => s.status !== "delivered" && s.status !== "problem");

    const routePoints: [number, number][] = [];
    if (userLocation && !isNaN(userLocation.latitude) && !isNaN(userLocation.longitude)) {
      routePoints.push([userLocation.latitude, userLocation.longitude]);
    }
    pendingStops.forEach((s) => routePoints.push([s.latitude, s.longitude]));

    if (routePoints.length < 2) return;
    if (mapProviderStatus.provider === 'leaflet') {
       debouncedDrawRouteLeaflet(routePoints);
       return;
    }
    debouncedDrawRoute(routePoints, routePhase === "navigating", navSettings.colorNav, navSettings.showAlternatives);
  }, [validStops, userLocation, routePhase, navSettings.colorNav, navSettings.showAlternatives, debouncedDrawRoute, mapReady]);

  // Zoom automático: ajusta o mapa ao mudar filtro ou no carregamento inicial
  useEffect(() => {
    if (!mapRef.current || !mapReady || validStops.length === 0) return;
    
    const filterChanged = lastFilterRef.current !== activeFilter;
    const isFirstTime = !didInitialZoomRef.current;
    
    // Só dispara se for a primeira vez ou se o filtro mudou para um escopo específico
    if (!isFirstTime && !filterChanged) return;
    
    lastFilterRef.current = activeFilter;
    didInitialZoomRef.current = true;

    const pending = validStops.filter((s) => s.status !== "delivered" && s.status !== "problem");
    const target = pending.length > 0 ? pending : validStops;
    if (target.length === 0) return;

    if (target.length === 1) {
      const only = target[0];
      mapRef.current.flyTo({
        center: [only.longitude, only.latitude],
        zoom: 16,
        duration: 1200,
        essential: true,
      });
      return;
    }

    const sdk = sdkRef.current;
    if (!sdk || !mapRef.current) return;
    const BoundsConstructor = typeof sdk.LngLatBounds === 'function' ? sdk.LngLatBounds : (sdk as any).default?.LngLatBounds;
    if (!BoundsConstructor) return;
    const bounds = new BoundsConstructor();
    target.forEach((s) => bounds.extend([s.longitude, s.latitude]));
    
    // Se estiver no filtro "all", também considera a posição do usuário para o enquadramento inicial
    if (activeFilter === 'all' && userLocation && !isNaN(userLocation.latitude) && !isNaN(userLocation.longitude)) {
      bounds.extend([userLocation.longitude, userLocation.latitude]);
    }

    mapRef.current.fitBounds(bounds, {
      padding: { top: 80, bottom: 160, left: 60, right: 60 },
      maxZoom: 15,
      duration: 1200,
      essential: true,
    });

  }, [validStops, mapReady, userLocation, activeFilter]);


  // Markers handling
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();

    validStops.forEach((stop, index) => {
      let bg = navSettings.colorIdle;
      if (stop.hasCustomerNotes) bg = "#7f1d1d";
      else if (stop.status === "delivered") bg = navSettings.colorDone;
      else if (stop.status === "problem") bg = "#ef4444";
      else if (stop.isGroup) bg = "#8B5CF6";
      else if (index === activeStopIndex) bg = navSettings.colorNav;

      const el = document.createElement('div');
      el.className = 'custom-marker-container';
      // Added better contrast with a stronger border and shadow
      // Item 2: Legibilidade em modo escuro/claro
      el.innerHTML = `
        <div style="background:${bg};${index === activeStopIndex ? "transform:scale(1.25);z-index:100;" : ""}"
          class="flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-full border-[2.5px] border-white dark:border-slate-900 shadow-[0_4px_12px_rgba(0,0,0,0.4)] text-[12px] font-black text-white transition-all duration-300 relative cursor-pointer hover:scale-110 active:scale-95"
        >
          <span style="text-shadow: 0 1px 2px rgba(0,0,0,0.5)">${stop.sequence}</span>
          ${stop.isGroup ? `<div class="absolute -top-1.5 -right-1.5 bg-primary text-[8px] px-1 rounded-full border border-white dark:border-slate-900 font-bold shadow-sm">${stop.totalItems}</div>` : ''}
          ${stop.hasHistoryIssues ? `<div class="absolute -bottom-1 -right-1 bg-yellow-500 text-[8px] p-0.5 rounded-full border border-white dark:border-slate-900 shadow-sm" title="Histórico de dificuldade">⚠️</div>` : ''}
        </div>
      `;

      const sdk = sdkRef.current;
      if (!sdk || !mapRef.current) return;
      const MarkerConstructor = typeof sdk.Marker === 'function' ? sdk.Marker : (sdk as any).default.Marker;
      const marker = new MarkerConstructor({ element: el })
        .setLngLat([stop.longitude, stop.latitude])
        .addTo(mapRef.current!);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedPreviewStop(stop);
        onStopClick?.(stop);
      });

      markersRef.current.set(stop.id, marker);
    });
  }, [validStops, activeStopIndex, navSettings.colorIdle, navSettings.colorNav, navSettings.colorDone, onStopClick]);

  // Geofencing proximity & Auto-arrival logic
  useEffect(() => {
    if (!userLocation || !validStops.length || isNaN(userLocation.latitude) || isNaN(userLocation.longitude)) return;

    const uLat = userLocation.latitude;
    const uLng = userLocation.longitude;

    const nearest = validStops
      .filter((s) => s.status !== "delivered" && s.status !== "problem")
      .map((s) => {
        const dist = Math.sqrt(Math.pow(uLat - s.latitude, 2) + Math.pow(uLng - s.longitude, 2)) * 111320;
        return { ...s, dist };
      })
      .sort((a, b) => a.dist - b.dist)[0];

    // Se estiver a menos de 100m de um ponto pendente
    if (nearest && nearest.dist < 100) {
      // Feedback inicial ao entrar no raio (apenas uma vez por stop)
      if (lastNearbyStopRef.current !== nearest.id) {
        lastNearbyStopRef.current = nearest.id;
        
        if (navSettings.hapticFeedback && window.navigator.vibrate) {
          window.navigator.vibrate([200, 100, 200]);
        }
        
        const stopNumber = nearest.sequence || "";
        const addressText = nearest.destination_address || "Endereço desconhecido";
        
        // Notificação de Voz
        speakInstruction(`A entrega número ${stopNumber} está por perto.`);
        
        // Notificação de Sistema (Essencial para Android Auto/CarPlay)
        if (navSettings.systemNotifications) {
          sendLocalNotification(
            `Entrega #${stopNumber} Próxima`,
            addressText
          );
        }
        
        setSelectedPreviewStop(nearest);
        toast.info(`Entrega #${stopNumber} próxima!`, {
          description: "Mantenha-se no local para confirmação automática em 1 minuto.",
          icon: <MapPin className="text-primary h-4 w-4" />,
          duration: 5000,
        });

        // Inicia o timer de 1 minuto para auto-baixa se a opção estiver ativa
        if (navSettings.autoArrival && onAutoArrival) {
          if (autoArrivalTimerRef.current) clearTimeout(autoArrivalTimerRef.current);
          
          autoArrivalTimerRef.current = setTimeout(() => {
            speakInstruction(`Entrega número ${stopNumber} finalizada automaticamente.`);
            toast.success(`Entrega #${stopNumber} concluída automaticamente!`, {
              description: "Detectado tempo de permanência no endereço.",
              icon: <CheckCircle2 className="text-white h-4 w-4" />,
              className: "bg-emerald-600 text-white border-none",
            });
            onAutoArrival(nearest.id);
            autoArrivalTimerRef.current = null;
          }, 60000); // 60 segundos
        }
      }
    } else {
      // Se sair do raio, reseta o timer e o rastreio
      if (autoArrivalTimerRef.current) {
        clearTimeout(autoArrivalTimerRef.current);
        autoArrivalTimerRef.current = null;
        toast.dismiss();
      }
      lastNearbyStopRef.current = null;
    }
    
    return () => {
      if (autoArrivalTimerRef.current) {
        clearTimeout(autoArrivalTimerRef.current);
      }
    };
  }, [userLocation, validStops, navSettings.autoArrival, onAutoArrival]);

  // Turn-by-turn logic - Corrigido para garantir instruções claras
  const lastStepRef = useRef<number>(-1);
  const lastDistanceRef = useRef<number>(999999);

  useEffect(() => {
    if (routePhase !== "navigating" || !userLocation || !navSettings.voiceEnabled) {
      lastStepRef.current = -1;
      lastDistanceRef.current = 999999;
      return;
    }

    const steps = (window as any)._routeSteps;
    if (!steps || steps.length === 0) return;

    // Tradução de manobras OSRM melhorada
    const translateManeuver = (step: any) => {
      const type = step.maneuver.type;
      const modifier = step.maneuver.modifier || "";
      const name = step.name || "";
      
      const key = `${type}-${modifier}`.toLowerCase();
      let instruction = "";

      const translations: Record<string, string> = {
        'turn-right': 'Vire à direita',
        'turn-left': 'Vire à esquerda',
        'turn-slight right': 'Mantenha-se à direita',
        'turn-slight left': 'Mantenha-se à esquerda',
        'turn-sharp right': 'Curva acentuada à direita',
        'turn-sharp left': 'Curva acentuada à esquerda',
        'turn-straight': 'Continue em frente',
        'turn-uturn': 'Faça o retorno assim que possível',
        'on ramp-right': 'Pegue a rampa de acesso à direita',
        'on ramp-left': 'Pegue a rampa de acesso à esquerda',
        'off ramp-right': 'Pegue a saída à direita',
        'off ramp-left': 'Pegue a saída à esquerda',
        'fork-right': 'Mantenha-se à direita na bifurcação',
        'fork-left': 'Mantenha-se à esquerda na bifurcação',
        'merge-right': 'Incorpore-se à pista da direita',
        'merge-left': 'Incorpore-se à pista da esquerda',
        'roundabout-right': 'Na rotatória, use a saída à direita',
        'roundabout-left': 'Na rotatória, use a saída à esquerda',
        'arrive-': 'Você está chegando ao destino.',
        'depart-': 'Siga pelo trajeto destacado no mapa',
      };

      instruction = translations[key] || translations[`${type}-`] || `Siga em frente`;
      
      if (name && !instruction.includes('destino')) {
        instruction += ` na ${name}`;
      }
      return instruction;
    };

    // Encontrar o próximo passo relevante baseado na distância
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const [lng, lat] = step.maneuver.location;
      
      // Distância em metros (aproximada)
      const dist = Math.sqrt(Math.pow(userLocation.latitude - lat, 2) + Math.pow(userLocation.longitude - lng, 2)) * 111320;
      
      // Gatilho de voz: quando estamos a menos de 50m da manobra
      // E garantindo que não repetimos a mesma instrução imediatamente
      if (dist < 50 && lastStepRef.current !== i) {
        lastStepRef.current = i;
        const text = translateManeuver(step);
        speakInstruction(text);
        break;
      }
      
      // Aviso antecipado para manobras distantes (ex: a 300 metros)
      if (dist < 300 && dist > 250 && lastStepRef.current < i && lastDistanceRef.current > 300) {
        const text = `Em trezentos metros, ${translateManeuver(step).toLowerCase()}`;
        speakInstruction(text);
        lastDistanceRef.current = dist;
        break;
      }
      
      lastDistanceRef.current = dist;
    }
  }, [userLocation, routePhase, navSettings.voiceEnabled]);

  // Voice Commands Listener - Melhorado para Mobile e Reconhecimento Contínuo
  useEffect(() => {
    if (!navSettings.voiceCommands) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Navegador não suporta reconhecimento de voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      console.log("Comandos de voz ativados...");
    };

    recognition.onend = () => {
      // Reinicia o reconhecimento se ainda estiver ativado nas configurações
      if (navSettings.voiceCommands) {
        try {
          recognition.start();
        } catch (e) {
          // Ignora se já estiver rodando
        }
      } else {
        setIsListening(false);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Erro no reconhecimento de voz:", event.error);
      if (event.error === 'not-allowed') {
        updateSettings({ voiceCommands: false });
        toast.error("Permissão de microfone negada.");
      }
    };

    recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const text = event.results[last][0].transcript.toLowerCase();
      console.log("Comando recebido:", text);
      
      // Comandos Contextuais Hands-Free
      if (text.includes("próxima entrega") || text.includes("proxima entrega")) {
        const pending = validStops.filter(s => s.status !== 'delivered' && s.status !== 'problem');
        if (pending.length > 0) {
          const next = pending[0];
          speakInstruction(`Navegando para ${next.destination_address}`);
          import("@/lib/native-utils").then(mod => mod.openNavigationApp(next.latitude, next.longitude));
        } else {
          speakInstruction("Não há mais entregas pendentes.");
        }
      } 
      else if (text.includes("marcar como entregue") || text.includes("concluir entrega") || text.includes("baixar entrega")) {
        const nearest = validStops
          .filter((s) => s.status !== "delivered" && s.status !== "problem")
          .map((s) => {
            const uLat = latestUserLocationRef.current?.latitude || 0;
            const uLng = latestUserLocationRef.current?.longitude || 0;
            const dist = Math.sqrt(Math.pow(uLat - s.latitude, 2) + Math.pow(uLng - s.longitude, 2)) * 111320;
            return { ...s, dist };
          })
          .sort((a, b) => a.dist - b.dist)[0];

        if (nearest && nearest.dist < 500) {
          if (onAutoArrival) onAutoArrival(nearest.id);
          speakInstruction("Entrega confirmada com sucesso.");
        } else {
          speakInstruction("Você não está perto o suficiente de nenhuma entrega para confirmar por voz.");
        }
      }
      else if (text.includes("centralizar") || text.includes("onde estou")) {
        window.dispatchEvent(new CustomEvent(MAP_RECENTER_EVENT));
        speakInstruction("Centralizando sua posição.");
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Falha ao iniciar reconhecimento:", e);
    }

    return () => {
      recognition.abort();
    };
  }, [navSettings.voiceCommands, updateSettings]);

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
    onFilterChange?.(filter);
    setShowFilterMenu(false);
  };

    return (
      <MapErrorBoundary fallback={
        <div className="flex flex-col items-center justify-center h-full w-full p-6 text-center bg-background border border-border/20 rounded-3xl">
          <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
          <h3 className="font-bold">Falha Crítica no Mapa</h3>
          <p className="text-xs text-muted-foreground mt-1">Houve um erro inesperado ao renderizar os componentes do mapa.</p>
          <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => window.location.reload()}>Recarregar</Button>
        </div>
      }>
        <div ref={containerWrapRef} className="relative w-full h-full overflow-hidden bg-slate-100 dark:bg-black" style={{ height }}>

      {mapError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-[50] bg-background/90 backdrop-blur-sm">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-black">{t("Instabilidade no Mapa", "Instabilidade no Mapa")}</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs">{mapError}</p>
          <div className="text-[10px] font-mono mt-4 p-2 bg-muted rounded">
             Status: {mapProviderStatus.provider} | V: {mapProviderStatus.version}
          </div>
          <Button 
            variant="outline" 
            className="mt-6 rounded-xl" 
            onClick={() => window.location.reload()}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t("Tentar novamente", "Tentar novamente")}
          </Button>
        </div>
      )}
      <div ref={mapContainerRef} className={cn("w-full h-full min-h-[400px]", mapError && "opacity-0")} />


      {/* Map Controls */}
      <div className="absolute top-1/2 -translate-y-1/2 right-2 md:right-6 flex flex-col items-end gap-2 z-[40]">
        {/* Toggle Panel Button */}
        <Button
          variant="secondary"
          size="icon"
          title={showRightControls ? "Esconder Controles" : "Mostrar Controles"}
          className="rounded-full shadow-2xl backdrop-blur-xl border-white/10 w-8 h-8 md:w-10 md:h-10 aspect-square active:scale-95 transition-all border group bg-black/60 hover:bg-orange-500 text-white p-0 mb-1"
          onClick={() => setShowRightControls(!showRightControls)}
        >
          <motion.div
            animate={{ rotate: showRightControls ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronUp className="h-4 w-4 text-orange-500" />
          </motion.div>
        </Button>

        <AnimatePresence>
          {showRightControls && (
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex flex-col gap-2 md:gap-4 max-h-[calc(100vh-10rem)] md:max-h-[calc(100vh-12rem)] overflow-y-auto no-scrollbar py-2 items-center pr-1.5 md:pr-2 bg-black/20 backdrop-blur-md rounded-full border border-white/5"
            >


        <div className="relative flex flex-col items-center">
          <Button
            variant="secondary"
            size="icon"
            title="Configurações do Mapa"
            className={cn(
              "rounded-full shadow-2xl backdrop-blur-xl border-white/10 w-10 h-10 md:w-14 md:h-14 aspect-square active:scale-95 transition-all border group bg-black/80 hover:bg-orange-600 text-white p-0",
              showConfigMenu && "ring-4 ring-orange-500/40 bg-orange-600"
            )}
            onClick={() => setShowConfigMenu(!showConfigMenu)}
          >
            <Settings className={cn("h-6 w-6 text-white transition-transform", showConfigMenu ? "rotate-90" : "group-hover:rotate-45")} />
          </Button>

          <AnimatePresence>
            {showConfigMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.8 }}
                className="flex flex-col gap-2 md:gap-3 mt-2 md:mt-3 overflow-y-auto max-h-[250px] md:max-h-[450px] no-scrollbar py-1 w-full items-center"

              >
                <Button
                  variant="secondary"
                  size="icon"
                  title="Ver todas as paradas"
                  className="rounded-full shadow-2xl bg-black/80 hover:bg-orange-500 backdrop-blur-xl border-white/10 w-10 h-10 md:w-14 md:h-14 aspect-square active:scale-90 transition-all border group p-0 shrink-0"
                  onClick={async () => {
                    if (validStops.length > 0 && mapRef.current) {
                      const sdk = sdkRef.current || await getMapTilerSDK();
                      const BoundsConstructor = typeof sdk.LngLatBounds === 'function' ? sdk.LngLatBounds : (sdk as any).default?.LngLatBounds;
                      if (!BoundsConstructor) return;
                      const bounds = new BoundsConstructor();
                      validStops.forEach(s => bounds.extend([s.longitude, s.latitude]));
                      mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 15 });
                      userZoomedRef.current = false;
                    }
                  }}
                >
                  <Box className="h-5 w-5 md:h-6 md:w-6 text-white group-hover:scale-110 transition-transform" />
                </Button>


                <Button
                  variant="secondary"
                  size="icon"
                  title={navSettings.offlineMode ? "Modo Online" : "Modo Offline"}
                  className={cn(
                    "rounded-full shadow-2xl bg-black/80 hover:bg-orange-500 backdrop-blur-xl border-white/10 w-10 h-10 md:w-14 md:h-14 aspect-square active:scale-90 transition-all border group p-0 shrink-0",
                    navSettings.offlineMode && "bg-amber-500 border-amber-500"
                  )}
                  onClick={() => {

                    const next = !navSettings.offlineMode;
                    updateSettings({ offlineMode: next });
                  }}
                >
                  {navSettings.offlineMode ? (
                    <WifiOff className="h-6 w-6 text-amber-400 group-hover:scale-110 transition-transform" />
                  ) : (
                    <Wifi className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
                  )}
                </Button>

                <Button
                  variant="secondary"
                  size="icon"
                  title="Resetar Norte"
                  className="rounded-full shadow-2xl bg-black/80 hover:bg-orange-500 backdrop-blur-xl border-white/10 w-10 h-10 md:w-14 md:h-14 aspect-square active:scale-90 transition-all border group p-0 shrink-0"

                  onClick={() => {
                    if (mapRef.current) {
                      mapRef.current.easeTo({ bearing: 0, pitch: 0, duration: 1000 });
                    }
                  }}
                >
                    <Navigation2 
                    className="h-6 w-6 text-white group-hover:scale-110 transition-transform"
                    style={{ transform: `rotate(${-bearing}deg)` }} 
                  />
                </Button>

                <Button
                  variant="secondary"
                  size="icon"
                  title="Alternar Satélite"
                  className="rounded-full shadow-2xl bg-black/80 hover:bg-orange-500 backdrop-blur-xl border-white/10 w-10 h-10 md:w-14 md:h-14 aspect-square active:scale-90 transition-all border group p-0 shrink-0"

                  onClick={() => updateSettings({ satelliteMode: !navSettings.satelliteMode })}
                >
                  <Globe className={cn("h-6 w-6 group-hover:scale-110 transition-transform", navSettings.satelliteMode ? "text-white" : "text-gray-400 group-hover:text-white")} />
                </Button>


                <Button
                  variant="secondary"
                  size="icon"
                  title="Voz de Navegação"
                  className="rounded-full shadow-2xl bg-black/80 hover:bg-orange-500 backdrop-blur-xl border-white/10 w-12 h-12 md:w-14 md:h-14 aspect-square active:scale-90 transition-all border group p-0 shrink-0"
                  onClick={() => updateSettings({ voiceEnabled: !navSettings.voiceEnabled })}
                >
                  {navSettings.voiceEnabled ? (
                    <Volume2 className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
                  ) : (
                    <VolumeX className="h-6 w-6 text-gray-500 group-hover:scale-110 transition-transform" />
                  )}
                </Button>

                <Button
                  variant="secondary"
                  size="icon"
                  title="Legenda"
                   className="rounded-full shadow-2xl bg-black/80 hover:bg-orange-500 backdrop-blur-xl border-white/10 w-12 h-12 md:w-14 md:h-14 aspect-square active:scale-90 transition-all border group p-0 shrink-0"
                  onClick={() => setShowLegend(!showLegend)}
                >
                  <MapIconL className={cn("h-6 w-6 group-hover:scale-110 transition-transform", showLegend ? "text-white" : "text-gray-400 group-hover:text-white")} />
                </Button>

                <Button
                  variant="secondary"
                  size="icon"
                  title="Comandos de Voz"
                  className="rounded-full shadow-2xl bg-black/80 hover:bg-orange-500 backdrop-blur-xl border-white/10 w-12 h-12 md:w-14 md:h-14 aspect-square active:scale-90 transition-all border group p-0 shrink-0"
                  onClick={() => updateSettings({ voiceCommands: !navSettings.voiceCommands })}
                >
                  {navSettings.voiceCommands ? (
                    <Mic className={cn("h-6 w-6 group-hover:scale-110 transition-transform", isListening ? "text-red-500 animate-pulse" : "text-white")} />
                  ) : (
                    <MicOff className="h-6 w-6 text-gray-500 group-hover:scale-110 transition-transform" />
                  )}
                </Button>

                <Button
                  variant="secondary"
                  size="icon"
                  title="Prédios 3D"
                  className="rounded-full shadow-2xl bg-black/80 hover:bg-orange-500 backdrop-blur-xl border-white/10 w-12 h-12 md:w-14 md:h-14 aspect-square active:scale-90 transition-all border group p-0 shrink-0"
                  onClick={() => updateSettings({ threeDBuildings: !navSettings.threeDBuildings })}
                >
                  <Building2 className={cn("h-6 w-6 group-hover:scale-110 transition-transform", navSettings.threeDBuildings ? "text-orange-500" : "text-gray-400")} />
                </Button>

                <Button
                  variant="secondary"
                  size="icon"
                  title="Feedback Háptico"
                  className="rounded-full shadow-2xl bg-black/80 hover:bg-black/90 backdrop-blur-xl border-white/10 w-12 h-12 md:w-14 md:h-14 aspect-square active:scale-90 transition-all border group p-0 shrink-0"
                  onClick={() => updateSettings({ hapticFeedback: !navSettings.hapticFeedback })}
                >
                  <Zap className={cn("h-6 w-6 group-hover:scale-110 transition-transform", navSettings.hapticFeedback ? "text-orange-500" : "text-gray-400")} />
                </Button>

                <Button
                  variant="secondary"
                  size="icon"
                  title="Trânsito"
                  className="rounded-full shadow-2xl bg-black/80 hover:bg-black/90 backdrop-blur-xl border-white/10 w-12 h-12 md:w-14 md:h-14 aspect-square active:scale-90 transition-all border group p-0 shrink-0"
                  onClick={() => {
                    const next = !navSettings.showTraffic;
                    updateSettings({ showTraffic: next });
                  }}
                >
                  <TrafficCone className={cn("h-6 w-6 group-hover:scale-110 transition-transform", navSettings.showTraffic ? "text-orange-500" : "text-gray-400")} />
                </Button>


                <Button
                  variant="secondary"
                  size="icon"
                  title="Otimização Inteligente"
                  className="rounded-full shadow-2xl bg-black/80 hover:bg-black/90 backdrop-blur-xl border-white/10 w-12 h-12 md:w-14 md:h-14 aspect-square active:scale-90 transition-all border group p-0 shrink-0"
                  onClick={() => updateSettings({ telemetryOptimization: !navSettings.telemetryOptimization })}
                >
                  <Navigation2 className={cn("h-6 w-6 group-hover:scale-110 transition-transform", navSettings.telemetryOptimization ? "text-orange-500" : "text-gray-400")} />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="h-px w-8 bg-white/10 my-1 shrink-0" />

        {onScanClick && (
          <Button
            variant="default"
            size="icon"
            title="Escanear"
            className="rounded-full shadow-2xl bg-orange-500 hover:bg-orange-600 w-10 h-10 md:w-14 md:h-14 aspect-square active:scale-90 transition-all border border-orange-400 group p-0 shrink-0"
            onClick={onScanClick}
          >

            <ScanLine className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
          </Button>
        )}

        {onOpenList && (
          <Button
            variant="default"
            size="icon"
            title="Lista de Paradas"
            className="rounded-full shadow-2xl bg-orange-500 hover:bg-orange-600 w-10 h-10 md:w-14 md:h-14 aspect-square active:scale-90 transition-all border border-orange-400 group p-0 shrink-0"
            onClick={onOpenList}
          >

            <ListIcon className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
          </Button>
        )}

        <div className="h-px w-8 bg-white/10 my-1 shrink-0" />

        <Button
          variant="secondary"
          size="icon"
          title="Tela Cheia"
          className="rounded-full shadow-2xl bg-black/80 hover:bg-black/90 backdrop-blur-xl border-white/10 w-10 h-10 md:w-14 md:h-14 aspect-square active:scale-90 transition-all border group p-0 shrink-0"

          onClick={toggleFullscreen}
        >
          {isFullscreen ? <Minimize2 className="h-6 w-6 text-orange-500 group-hover:scale-110 transition-transform" /> : <Maximize2 className="h-6 w-6 text-orange-500 group-hover:scale-110 transition-transform" />}
        </Button>

        <Button
          variant="secondary"
          size="icon"
          title="Modo Direção"
          onClick={() => updateSettings({ drivingMode: !navSettings.drivingMode })}
          className={cn(
            "rounded-full shadow-2xl backdrop-blur-xl border-white/10 w-10 h-10 md:w-14 md:h-14 aspect-square active:scale-90 transition-all border group p-0 shrink-0",
            navSettings.drivingMode ? "bg-primary text-white" : "bg-black/80 hover:bg-black/90 text-white"
          )}
        >

          <Navigation2 className={cn("h-6 w-6 transition-transform group-hover:scale-110", navSettings.drivingMode && "fill-current")} />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          title="Modo Escuro"
          className="rounded-full shadow-2xl bg-black/80 hover:bg-black/90 backdrop-blur-xl border-white/10 w-10 h-10 md:w-14 md:h-14 aspect-square active:scale-90 transition-all border group p-0 shrink-0"

          onClick={() => updateSettings({ darkMap: !navSettings.darkMap, autoNightMode: false })}
        >
          {isDark ? <Sun className="h-6 w-6 text-yellow-500 group-hover:rotate-45 transition-transform" /> : <Moon className="h-6 w-6 text-blue-400 group-hover:-rotate-12 transition-transform" />}
        </Button>

        <Button
          variant="secondary"
          size="icon"
          title="Agrupar por Rua"
          className="rounded-full shadow-2xl bg-black/80 hover:bg-black/90 backdrop-blur-xl border-white/10 w-10 h-10 md:w-14 md:h-14 aspect-square active:scale-90 transition-all border group p-0 shrink-0"

          onClick={() => updateSettings({ groupByStreet: !navSettings.groupByStreet })}
        >
          <Layers className={cn("h-6 w-6 group-hover:scale-110 transition-transform", navSettings.groupByStreet ? "text-orange-500" : "text-gray-400")} />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          title="Centralizar em mim"
          className="rounded-full shadow-2xl bg-black/80 hover:bg-black/90 backdrop-blur-xl border-white/10 w-10 h-10 md:w-14 md:h-14 aspect-square active:scale-90 transition-all border group p-0 shrink-0"

          onClick={() => {
            const current = latestUserLocationRef.current;
            if (current && mapRef.current) {
              mapRef.current.flyTo({
                center: [current.longitude, current.latitude],
                zoom: 17,
                pitch: 45,
                duration: 1000
              });
              userZoomedRef.current = false;
            }
          }}
        >
          <LocateFixed className="h-6 w-6 text-orange-500 group-hover:scale-110 transition-transform" />
        </Button>
      </motion.div>
    )}
  </AnimatePresence>
</div>


      {/* Legend Card */}
      {showLegend && (
        <Card className="absolute top-16 right-4 md:top-4 md:right-16 p-3 rounded-[32px] bg-black/80 backdrop-blur-xl border-white/10 shadow-2xl z-[40] w-48 animate-in fade-in slide-in-from-right-2">
          <div className="flex items-center justify-between mb-2 border-b border-white/10 pb-1">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60 text-white">Legenda</span>
            <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full text-white/60 hover:text-white" onClick={() => setShowLegend(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: navSettings.colorNav }} />
              <span className="text-xs font-medium text-white/90">Próxima Parada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: navSettings.colorIdle }} />
              <span className="text-xs font-medium text-white/90">Pendente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: navSettings.colorDone }} />
              <span className="text-xs font-medium text-white/90">Entregue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs font-medium text-white/90">Problema</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border border-blue-600 bg-blue-100" />
              <span className="text-xs font-medium text-white/90">Sua Posição</span>
            </div>
          </div>
        </Card>
      )}

      {/* Side Filters (Left) - FAB style */}
      <div className="absolute top-1/2 -translate-y-1/2 left-3 md:left-6 flex flex-col gap-3 md:gap-4 z-[40]">
        <div className="relative flex flex-col items-center">
          <Button
            variant="default"
            size="icon"
            title="Filtros"
            className={cn(
              "rounded-full shadow-2xl backdrop-blur-xl border-orange-400 w-12 h-12 md:w-14 md:h-14 active:scale-95 transition-all border-2 group bg-orange-500 hover:bg-orange-600 text-white z-50",
              showFilterMenu && "ring-4 ring-orange-500/20"
            )}
            onClick={() => {
              if (showFilterMenu) {
                setShowFilterMenu(false);
              } else {
                handleFilterClick("all");
                setShowFilterMenu(true);
              }
            }}
          >
            <div className="flex flex-col items-center">
              {showFilterMenu ? <X className="h-6 w-6" /> : (
                <>
                  <Filter className="h-6 w-6" />
                  <span className="text-[8px] font-black uppercase mt-0.5">Filtros</span>
                </>
              )}
            </div>
          </Button>

          <AnimatePresence>
            {showFilterMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.8 }}
                className="flex flex-col gap-3 mt-3 overflow-y-auto max-h-[350px] md:max-h-[450px] no-scrollbar py-1 w-full items-center"
              >
                <Button
                  variant={activeFilter === "pending" ? "default" : "secondary"}
                  size="icon"
                  title="Pendentes"
                  className={cn(
                    "rounded-full shadow-2xl backdrop-blur-xl border-white/10 w-11 h-11 md:w-12 md:h-12 active:scale-90 transition-all border group shrink-0",
                    activeFilter === "pending" ? "bg-orange-500 text-white border-orange-400" : "bg-black/80 hover:bg-black/90 text-white"
                  )}
                  onClick={() => {
                    handleFilterClick("pending");
                    setShowFilterMenu(false);
                  }}
                >
                  <div className="flex flex-col items-center">
                    <Clock className="h-5 w-5" />
                    <span className="text-[7px] font-black uppercase mt-0.5">Pend.</span>
                  </div>
                </Button>

                <Button
                  variant={activeFilter === "problem" ? "default" : "secondary"}
                  size="icon"
                  title="Com Problema"
                  className={cn(
                    "rounded-full shadow-2xl backdrop-blur-xl border-white/10 w-11 h-11 md:w-12 md:h-12 active:scale-90 transition-all border group shrink-0",
                    activeFilter === "problem" ? "bg-orange-500 text-white border-orange-400" : "bg-black/80 hover:bg-black/90 text-white"
                  )}
                  onClick={() => {
                    handleFilterClick("problem");
                    setShowFilterMenu(false);
                  }}
                >
                  <div className="flex flex-col items-center">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="text-[7px] font-black uppercase mt-0.5">Prob.</span>
                  </div>
                </Button>

                {([
                  { start: 1, end: 10 },
                  { start: 11, end: 20 },
                  { start: 21, end: 30 },
                  { start: 31, end: 40 },
                  { start: 41, end: 50 }
                ]).map((range) => {
                  const filterKey = `range-${range.start}-${range.end}`;
                  return (
                    <Button
                      key={filterKey}
                      variant={activeFilter === filterKey ? "default" : "secondary"}
                      size="icon"
                      title={`Entregas do ${range.start} ao ${range.end}`}
                      className={cn(
                        "rounded-full shadow-2xl backdrop-blur-xl border-white/10 w-11 h-11 md:w-12 md:h-12 active:scale-90 transition-all border group shrink-0",
                        activeFilter === filterKey ? "bg-orange-500 text-white border-orange-400" : "bg-black/80 hover:bg-black/90 text-white"
                      )}
                      onClick={() => {
                        handleFilterClick(filterKey);
                        setShowFilterMenu(false);
                      }}
                    >
                      <div className="flex flex-col items-center">
                        <div className="relative">
                          <Milestone className="h-5 w-5" />
                          <span className="absolute -top-1 -right-1 bg-orange-500 text-[6px] font-bold px-1 rounded-full border border-black/20">{range.end}</span>
                        </div>
                        <span className="text-[7px] font-black uppercase mt-0.5">{range.start} a {range.end}</span>
                      </div>
                    </Button>
                  );
                })}

                <Button
                  variant="secondary"
                  size="icon"
                  title={showDelivered ? "Ocultar Entregues" : "Ver Entregues"}
                  className={cn(
                    "rounded-full shadow-2xl bg-black/80 hover:bg-black/90 backdrop-blur-xl border-white/10 w-11 h-11 md:w-12 md:h-12 active:scale-90 transition-all border group shrink-0",
                    showDelivered ? "text-orange-500" : "text-gray-400"
                  )}
                  onClick={() => {
                    onToggleShowDelivered?.();
                    setShowFilterMenu(false);
                  }}
                >
                  {showDelivered ? <Eye className="h-5 w-5 transition-transform" /> : <EyeOff className="h-5 w-5 transition-transform" />}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute top-0 left-0 w-full h-1 bg-orange-500/20 pointer-events-none" />
      {children}

      <AnimatePresence>
        {navSettings.drivingMode && (
          <DrivingModeOverlay 
            currentStop={selectedPreviewStop || validStops.filter(s => s.status !== 'delivered')[0]}
            onComplete={(id) => onAutoArrival?.(id)}
            onProblem={(id) => {
              toast.error("Problema registrado");
            }}
            onClose={() => updateSettings({ drivingMode: false })}
          />
        )}
      </AnimatePresence>
    </div>
  </MapErrorBoundary>
  );
});

