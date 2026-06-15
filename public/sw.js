// Versão injetada pelo Vite no build (placeholder substituído por timestamp).
// Em dev permanece "dev", garantindo que o cache não persista entre rebuilds.
const RAW_VERSION = "__SW_VERSION__";
const VERSION = RAW_VERSION === "__" + "SW_VERSION__" ? "dev" : RAW_VERSION;

const CACHE_NAME = `rota-certa-${VERSION}`;
const STATIC_CACHE = `rota-certa-static-${VERSION}`;
const IMAGE_CACHE = `rota-certa-img-${VERSION}`;
const OFFLINE_URL = "/offline.html";

// Imagens dinâmicas expiram após 7 dias
const IMAGE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const ASSETS_TO_CACHE = [
  "/manifest.json",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon-32.png",
  "/favicon-16.png",
  "/offline.html",
  "/robots.txt",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          // Mantém apenas os caches da versão atual
          if (
            name !== CACHE_NAME &&
            name !== STATIC_CACHE &&
            name !== IMAGE_CACHE &&
            name.startsWith("rota-certa-")
          ) {
            return caches.delete(name);
          }
        }),
      ),
    ),
  );
  self.clients.claim();
});

// Permite que o app force ativação imediata da nova versão
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
  if (event.data === "CLEAR_ALL_CACHES") {
    event.waitUntil(
      caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n)))),
    );
  }
});

// Hashed bundle assets (Vite outputs to /assets/*.{hash}.{ext}) and fonts
const isImmutableAsset = (url) => {
  return (
    /\/assets\/[^/]+\.[a-f0-9]{6,}\.(?:js|css|woff2?|ttf|otf|svg|png|jpg|jpeg|gif|webp|avif|ico)$/i.test(
      url,
    ) || /\.(?:woff2?|ttf|otf)(\?.*)?$/i.test(url)
  );
};

// Imagens estáticas locais e tiles de mapa — cacheamos com TTL
const isCacheableImage = (url) => {
  return (
    /\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico)$/i.test(url) ||
    url.includes("cartocdn.com") ||
    url.includes("arcgisonline.com") ||
    url.includes("basemaps.")
  );
};

// Nunca cachear: APIs, auth, fotos de fachada dinâmicas (Street View / Mapillary)
const isBypass = (url) => {
  return (
    url.includes("supabase.co") ||
    url.includes("supabase.in") ||
    url.includes("/api/") ||
    url.includes("/rest/v1/") ||
    url.includes("/auth/v1/") ||
    url.includes("/storage/v1/") ||
    url.includes("/realtime/v1/") ||
    // Provedores de imagem de fachada — sempre buscar fresh
    url.includes("maps.googleapis.com/maps/api/streetview") ||
    url.includes("images.mapillary.com") ||
    url.includes("graph.mapillary.com")
  );
};

// Helpers para TTL no IMAGE_CACHE (usa header sw-cached-at no Response clonado)
const putWithTimestamp = async (cache, request, response) => {
  const headers = new Headers(response.headers);
  headers.set("sw-cached-at", Date.now().toString());
  const body = await response.clone().blob();
  const stamped = new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  await cache.put(request, stamped);
};

const isFresh = (response, maxAgeMs) => {
  const cachedAt = Number(response.headers.get("sw-cached-at") || 0);
  if (!cachedAt) return false;
  return Date.now() - cachedAt < maxAgeMs;
};

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const href = event.request.url;

  if (isBypass(href)) return;

  // Cache-first com vida longa para assets imutáveis com hash
  if (isImmutableAsset(href)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          return cached || Response.error();
        }
      }),
    );
    return;
  }

  // Imagens (incluindo tiles de mapa): cache-first com TTL de 7 dias
  if (isCacheableImage(href)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached && isFresh(cached, IMAGE_MAX_AGE_MS)) return cached;
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            await putWithTimestamp(cache, event.request, networkResponse);
          }
          return networkResponse;
        } catch {
          // Se rede falhar, serve o cache mesmo expirado
          return cached || Response.error();
        }
      }),
    );
    return;
  }

  // Network-first para navegações HTML e JS/CSS sem hash
  if (event.request.mode === "navigate" || /\.(?:js|css)$/.test(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === "navigate") {
            return caches.match(OFFLINE_URL);
          }
          return Response.error();
        }),
    );
    return;
  }

  // Default: rede, com fallback para cache
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cachedResponse = await caches.match(event.request);
      return cachedResponse || Response.error();
    }),
  );
});
