import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import { setupBackgroundTracking, stopBackgroundTracking } from "@/lib/background-tracking";
import { useSyncQueue } from "./useSyncQueue";

interface TelemetryOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

const MIN_UPDATE_INTERVAL = 30000;
const DEFAULT_TRACKING_OPTIONS: Required<TelemetryOptions> = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 5000,
};

export function useTelemetry(options: TelemetryOptions = {}) {
  const { addToQueue } = useSyncQueue();
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    heading: number | null;
    speed: number | null;
    accuracy: number;
    timestamp: number;
  } | null>(null);

  const [permissions, setPermissions] = useState<{
    location: string;
    camera: string;
  }>({ location: "unknown", camera: "unknown" });

  const watchId = useRef<string | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const mountedRef = useRef(true);
  const permissionCleanupRef = useRef<(() => void) | null>(null);

  const enableHighAccuracy =
    options.enableHighAccuracy ?? DEFAULT_TRACKING_OPTIONS.enableHighAccuracy;
  const timeout = options.timeout ?? DEFAULT_TRACKING_OPTIONS.timeout;
  const maximumAge = options.maximumAge ?? DEFAULT_TRACKING_OPTIONS.maximumAge;

  const saveTelemetry = useCallback(async (coords: any) => {
    const now = Date.now();
    if (now - lastUpdateRef.current < MIN_UPDATE_INTERVAL) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Check if online before trying to sync to DB
      if (navigator.onLine) {
        const { error } = await supabase.from("driver_telemetry").insert({
          user_id: user.id,
          latitude: coords.latitude,
          longitude: coords.longitude,
          heading: coords.heading,
          speed: coords.speed,
          accuracy: coords.accuracy,
        });

        if (!error) lastUpdateRef.current = now;
      } else {
        // Queue telemetry when offline
        addToQueue({
          type: "telemetry",
          payload: {
            user_id: user.id,
            latitude: coords.latitude,
            longitude: coords.longitude,
            heading: coords.heading,
            speed: coords.speed,
            accuracy: coords.accuracy,
          }
        });
      }
    } catch {
      // Telemetry is best-effort and must never interrupt route execution.
    }
  }, []);

  const updateLocation = useCallback(
    (pos: GeolocationPosition | any) => {
      if (!mountedRef.current || !pos?.coords) return;

      setLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        heading: pos.coords.heading,
        speed: pos.coords.speed,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      });
      saveTelemetry(pos.coords);
    },
    [saveTelemetry],
  );

  const startTracking = useCallback(
    async (opts: TelemetryOptions = {}) => {
      if (watchId.current !== null) return;

      const watchOptions = {
        enableHighAccuracy,
        timeout,
        maximumAge,
        ...opts,
      };

      try {
        if (Capacitor.isNativePlatform()) {
          const currentPermissions = await Geolocation.checkPermissions();
          if (currentPermissions.location !== "granted") {
            const requestedPermissions = await Geolocation.requestPermissions();
            if (requestedPermissions.location !== "granted") {
              setPermissions((prev) => ({ ...prev, location: requestedPermissions.location }));
              return;
            }
          }

          await setupBackgroundTracking();

          watchId.current = await Geolocation.watchPosition(watchOptions, (pos: any, err: any) => {
            if (err || !pos) return;
            updateLocation(pos);
          });
        } else if (navigator.geolocation) {
          const id = navigator.geolocation.watchPosition(
            updateLocation,
            () => setPermissions((prev) => ({ ...prev, location: "denied" })),
            watchOptions,
          );
          watchId.current = String(id);

          navigator.geolocation.getCurrentPosition(
            updateLocation,
            () => undefined,
            { ...watchOptions, timeout: Math.min(watchOptions.timeout, 5000) },
          );
        }
      } catch (error) {
        console.warn("Unable to start location tracking:", error);
      }
    },
    [enableHighAccuracy, maximumAge, timeout, updateLocation],
  );

  const stopTracking = useCallback(async () => {
    if (watchId.current !== null) {
      if (Capacitor.isNativePlatform()) {
        await Geolocation.clearWatch({ id: watchId.current });
      } else {
        const id = Number(watchId.current);
        if (Number.isFinite(id)) navigator.geolocation.clearWatch(id);
      }
      watchId.current = null;
    }

    if (Capacitor.isNativePlatform()) {
      await stopBackgroundTracking();
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      permissionCleanupRef.current?.();
      stopTracking();
    };
  }, [stopTracking]);

  const checkPermissions = useCallback(async () => {
    try {
      permissionCleanupRef.current?.();
      permissionCleanupRef.current = null;

      if (Capacitor.isNativePlatform()) {
        const geoPerms = await Geolocation.checkPermissions();
        setPermissions((prev) => ({ ...prev, location: geoPerms.location }));
      } else if (navigator.permissions) {
        const locPerm = await navigator.permissions.query({ name: "geolocation" as any });
        let camPerm: PermissionStatus | null = null;

        try {
          camPerm = await navigator.permissions.query({ name: "camera" as any });
        } catch {
          // Camera permission query is not supported in every browser.
        }

        setPermissions({
          location: locPerm.state,
          camera: camPerm?.state ?? "unknown",
        });

        const updateLocationPermission = () =>
          setPermissions((prev) => ({ ...prev, location: locPerm.state }));
        const updateCameraPermission = () =>
          setPermissions((prev) => ({ ...prev, camera: camPerm?.state ?? "unknown" }));

        locPerm.onchange = updateLocationPermission;
        if (camPerm) camPerm.onchange = updateCameraPermission;

        permissionCleanupRef.current = () => {
          locPerm.onchange = null;
          if (camPerm) camPerm.onchange = null;
        };
      }
    } catch {
      setPermissions((prev) => ({ ...prev, location: "unknown", camera: "unknown" }));
    }
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  const requestAllPermissions = useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const geoPerms = await Geolocation.requestPermissions();
        setPermissions((prev) => ({ ...prev, location: geoPerms.location }));
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => checkPermissions(),
          () => checkPermissions(),
          { timeout: 5000 },
        );
      }

      if (!Capacitor.isNativePlatform() && navigator.mediaDevices) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach((track) => track.stop());
          checkPermissions();
        } catch {
          setPermissions((prev) => ({ ...prev, camera: "denied" }));
        }
      }
    } catch {
      await checkPermissions();
    }
  }, [checkPermissions]);

  return {
    location,
    startTracking,
    stopTracking,
    requestAllPermissions,
    permissions,
    checkPermissions,
  };
}
