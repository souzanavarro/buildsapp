export interface NavSettings {
  darkMap: boolean;
  satelliteMode: boolean;
  autoZoom: boolean;
  lockNorth: boolean;
  voiceEnabled: boolean;
  autoNightMode: boolean;
  showTraffic: boolean;
  threeDBuildings: boolean;
  hapticFeedback: boolean;
  showAlternatives: boolean;
  voiceCommands: boolean;
  autoArrival: boolean;
  drivingMode: boolean;
  colorIdle: string;
  colorNav: string;
  colorDone: string;
  offlineMode: boolean;
  systemNotifications: boolean;
  groupByStreet: boolean;
  telemetryOptimization: boolean;
}

export const speakInstruction = (text: string) => {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const settings = getNavSettings();
  if (!settings.voiceEnabled) return;

  // Interrompe falas anteriores e solicita foco de áudio (nativo via SPEECH)
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "pt-BR";
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // Duck Audio: No Android WebView, isso sinaliza ao sistema para baixar o volume da música
  // enquanto a síntese de voz está ativa.
  utterance.onstart = () => {
    // Evento de início
  };

  // Forçar seleção de uma voz em português se disponível
  const voices = window.speechSynthesis.getVoices();
  const ptVoice = voices.find(v => v.lang.includes("pt-BR") || v.lang.includes("pt-PT"));
  if (ptVoice) {
    utterance.voice = ptVoice;
  }

  window.speechSynthesis.speak(utterance);
};

const KEY = "nav.settings.v1";
export const NAV_SETTINGS_EVENT = "nav-settings-changed";

const DEFAULTS: NavSettings = {
  darkMap: false,
  satelliteMode: false,
  autoZoom: true,
  lockNorth: true,
  voiceEnabled: true,
  autoNightMode: false,
  showTraffic: false,
  threeDBuildings: true,
  hapticFeedback: true,
  showAlternatives: true,
  voiceCommands: false,
  autoArrival: true,
  drivingMode: false,
  colorIdle: "#0f172a",
  colorNav: "#2563eb",
  colorDone: "#16a34a",
  offlineMode: false,
  systemNotifications: true,
  groupByStreet: false,
  telemetryOptimization: false,
};

export function getNavSettings(): NavSettings {
  if (typeof localStorage === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function setNavSettings(patch: Partial<NavSettings>) {
  const next = { ...getNavSettings(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Settings persistence is best-effort; navigation should keep working.
  }
  try {
    window.dispatchEvent(new CustomEvent(NAV_SETTINGS_EVENT, { detail: next }));
  } catch {
    // Event dispatch can fail in restricted browser contexts.
  }
  return next;
}

export function onNavSettingsChange(cb: (s: NavSettings) => void) {
  const handler = (e: Event) => cb((e as CustomEvent).detail as NavSettings);
  window.addEventListener(NAV_SETTINGS_EVENT, handler);
  return () => window.removeEventListener(NAV_SETTINGS_EVENT, handler);
}

export const MAP_RECENTER_EVENT = "map-recenter";
export function triggerRecenter() {
  try {
    window.dispatchEvent(new CustomEvent(MAP_RECENTER_EVENT));
  } catch {
    // Ignore when called outside a fully available browser window.
  }
}

export const MAP_FIT_ALL_EVENT = "map-fit-all";
export function triggerFitAll() {
  try {
    window.dispatchEvent(new CustomEvent(MAP_FIT_ALL_EVENT));
  } catch {
    // Ignore when called outside a fully available browser window.
  }
}
