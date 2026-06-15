import { Capacitor, registerPlugin } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

type BackgroundTrackingState = {
  plugin?: any;
  watcherId?: string;
  setupPromise?: Promise<void>;
  lastUpdate: number;
};

const BACKGROUND_UPDATE_INTERVAL = 30000;

const globalState = globalThis as typeof globalThis & {
  __rotaCertaBackgroundTracking?: BackgroundTrackingState;
};

const state =
  globalState.__rotaCertaBackgroundTracking ??
  (globalState.__rotaCertaBackgroundTracking = { lastUpdate: 0 });

function getBackgroundGeolocation() {
  if (!state.plugin) {
    state.plugin = registerPlugin<any>("BackgroundGeolocation");
  }
  return state.plugin;
}

function normalizeWatcherId(watcherId: unknown) {
  if (typeof watcherId === "string") return watcherId;
  if (watcherId && typeof watcherId === "object" && "id" in watcherId) {
    return String((watcherId as { id: unknown }).id);
  }
  return String(watcherId);
}

export async function setupBackgroundTracking() {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) return;
  if (state.watcherId || state.setupPromise) return state.setupPromise;

  state.setupPromise = (async () => {
    try {
      const backgroundGeolocation = getBackgroundGeolocation();
      const watcherId = await backgroundGeolocation.addWatcher(
        {
          backgroundMessage: "Rota Certa está rastreando sua entrega em tempo real.",
          backgroundTitle: "Rastreamento Ativo",
          requestPermissions: true,
          stale: false,
          distanceFilter: 0,
        },
        async (location: any, error: any) => {
          if (error || !location) return;

          const now = Date.now();
          if (now - state.lastUpdate < BACKGROUND_UPDATE_INTERVAL) return;

          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;

          const { error: insertError } = await supabase.from("driver_telemetry").insert({
            user_id: user.id,
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            speed: location.speed,
            heading: location.bearing,
          });

          if (!insertError) state.lastUpdate = now;
        },
      );

      state.watcherId = normalizeWatcherId(watcherId);
    } catch (err) {
      state.setupPromise = undefined;
      console.warn("Background tracking unavailable:", err);
    }
  })();

  return state.setupPromise;
}

export async function stopBackgroundTracking() {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform() || !state.watcherId) return;

  try {
    await getBackgroundGeolocation().removeWatcher({ id: state.watcherId });
  } catch (err) {
    console.warn("Unable to stop background tracking:", err);
  } finally {
    state.watcherId = undefined;
    state.setupPromise = undefined;
  }
}
