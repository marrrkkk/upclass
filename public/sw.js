const SW_VERSION = "v6";
const STATIC_CACHE = `upclass-static-${SW_VERSION}`;
const APP_SHELL_CACHE = `upclass-app-shell-${SW_VERSION}`;
const ROUTE_CACHE = `upclass-routes-${SW_VERSION}`;
const DATA_CACHE = `upclass-data-${SW_VERSION}`;
const IMAGE_CACHE = `upclass-images-${SW_VERSION}`;

const CORE_ROUTES = [
  "/",
  "/activity",
  "/classes",
  "/resources",
  "/messages",
  "/notifications",
  "/profile",
  "/settings",
];

const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/icon.svg",
  "/logo.svg",
];

const MAX_ENTRIES = {
  [ROUTE_CACHE]: 40,
  [DATA_CACHE]: 80,
  [IMAGE_CACHE]: 120,
};

const MAX_AGE = {
  [ROUTE_CACHE]: 24 * 60 * 60 * 1000,
  [DATA_CACHE]: 15 * 60 * 1000,
  [IMAGE_CACHE]: 7 * 24 * 60 * 60 * 1000,
};

function isNavigationRequest(request) {
  return request.mode === "navigate";
}

function isCoreRoute(pathname) {
  return CORE_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isRscRequest(request, url) {
  return url.searchParams.has("_rsc") || request.headers.get("RSC") === "1";
}

function isStaticAsset(request, url) {
  return (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font" ||
    url.pathname.startsWith("/_next/static/")
  );
}

function isImageRequest(request, url) {
  return (
    request.destination === "image" ||
    /\.(?:png|jpg|jpeg|gif|webp|svg|ico|avif)$/i.test(url.pathname)
  );
}

function shouldHandleCrossOriginImage(url) {
  return url.hostname.includes("uploadthing.com") || url.hostname.includes("supabase.co");
}

function buildOfflinePage(pathname = "/") {
  const pageLabel = pathname === "/" ? "this page" : pathname;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Offline - UpClass</title>
  <style>
    :root {
      color-scheme: light;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background:
        radial-gradient(circle at top, rgba(59,130,246,0.18), transparent 35%),
        linear-gradient(180deg, #f8fbff, #eef4ff 60%, #e9f5f3);
      color: #0f172a;
    }
    .card {
      max-width: 480px;
      padding: 28px;
      border-radius: 24px;
      background: rgba(255,255,255,0.9);
      border: 1px solid rgba(148,163,184,0.24);
      box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12);
      backdrop-filter: blur(14px);
    }
    h1 {
      margin: 0 0 12px;
      font-size: 1.8rem;
      line-height: 1.1;
    }
    p {
      margin: 0 0 18px;
      color: #475569;
      line-height: 1.6;
    }
    .actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    a, button {
      appearance: none;
      border: 0;
      border-radius: 999px;
      padding: 12px 18px;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
    }
    button {
      color: white;
      background: #2563eb;
    }
    a {
      color: #0f172a;
      background: #e2e8f0;
    }
  </style>
</head>
<body>
  <main class="card">
    <h1>You're offline</h1>
    <p>${pageLabel} needs a connection right now or needs to be opened once while online so it can be cached on this device.</p>
    <div class="actions">
      <button onclick="location.reload()">Try again</button>
      <a href="javascript:history.length > 1 ? history.back() : location.assign('/home')">Go back</a>
    </div>
  </main>
</body>
</html>`;
}

async function limitCacheEntries(cacheName) {
  const maxEntries = MAX_ENTRIES[cacheName];
  if (!maxEntries) return;

  const cache = await caches.open(cacheName);
  const requests = await cache.keys();
  if (requests.length <= maxEntries) return;

  const overflow = requests.length - maxEntries;
  await Promise.all(requests.slice(0, overflow).map((request) => cache.delete(request)));
}

async function evictExpiredEntries(cacheName) {
  const maxAge = MAX_AGE[cacheName];
  if (!maxAge) return;

  const cache = await caches.open(cacheName);
  const requests = await cache.keys();
  const now = Date.now();

  await Promise.all(
    requests.map(async (request) => {
      const response = await cache.match(request);
      const cachedAt = response?.headers.get("sw-cached-at");
      if (!cachedAt) return;

      const age = now - Number(cachedAt);
      if (Number.isFinite(age) && age > maxAge) {
        await cache.delete(request);
      }
    })
  );
}

async function putWithTimestamp(cacheName, request, response) {
  const cache = await caches.open(cacheName);
  const headers = new Headers(response.headers);
  headers.set("sw-cached-at", Date.now().toString());

  const body = await response.clone().blob();
  const stampedResponse = new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });

  await cache.put(request, stampedResponse);
  await evictExpiredEntries(cacheName);
  await limitCacheEntries(cacheName);
}

async function networkFirst(request, cacheName, fallbackFactory) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await putWithTimestamp(cacheName, request, response);
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackFactory) return fallbackFactory();
    throw error;
  }
}

async function warmCoreRoutes() {
  const cache = await caches.open(APP_SHELL_CACHE);

  await Promise.allSettled(
    CORE_ROUTES.map(async (url) => {
      const request = new Request(url, { cache: "reload" });
      const response = await fetch(request);
      if (response.ok) {
        await putWithTimestamp(APP_SHELL_CACHE, request, response);
        await cache.put(new Request(url), response.clone());
      }
    })
  );

  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((client) => client.postMessage({ type: "OFFLINE_READY" }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const staticCache = await caches.open(STATIC_CACHE);
      await Promise.allSettled(
        STATIC_ASSETS.map(async (url) => {
          const response = await fetch(new Request(url, { cache: "reload" }));
          if (response.ok) {
            await putWithTimestamp(STATIC_CACHE, url, response);
            await staticCache.put(url, response.clone());
          }
        })
      );

      await warmCoreRoutes();
    })()
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const expectedCaches = [STATIC_CACHE, APP_SHELL_CACHE, ROUTE_CACHE, DATA_CACHE, IMAGE_CACHE];
      const keys = await caches.keys();

      await Promise.all(
        keys.filter((key) => !expectedCaches.includes(key)).map((key) => caches.delete(key))
      );

      await Promise.all(Object.keys(MAX_AGE).map((cacheName) => evictExpiredEntries(cacheName)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    if (isImageRequest(request, url) && shouldHandleCrossOriginImage(url)) {
      event.respondWith(
        networkFirst(request, IMAGE_CACHE, () => caches.match(request))
      );
    }
    return;
  }

  if (isStaticAsset(request, url)) {
    event.respondWith(
      networkFirst(request, STATIC_CACHE, () => caches.match(request))
    );
    return;
  }

  if (isImageRequest(request, url)) {
    event.respondWith(
      networkFirst(request, IMAGE_CACHE, () => caches.match(request))
    );
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      networkFirst(request, DATA_CACHE, async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        return new Response(
          JSON.stringify({
            error: "Offline",
            cached: false,
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      })
    );
    return;
  }

  if (isRscRequest(request, url)) {
    const cacheName = isCoreRoute(url.pathname) ? ROUTE_CACHE : DATA_CACHE;
    event.respondWith(
      networkFirst(request, cacheName, async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        return new Response("", {
          status: 503,
          headers: { "Content-Type": "text/plain" },
        });
      })
    );
    return;
  }

  if (isNavigationRequest(request)) {
    const cacheName = isCoreRoute(url.pathname) ? APP_SHELL_CACHE : ROUTE_CACHE;
    event.respondWith(
      networkFirst(request, cacheName, async () => {
        const exactMatch = await caches.match(request);
        if (exactMatch) return exactMatch;

        const pathnameMatch = await caches.match(url.pathname);
        if (pathnameMatch) return pathnameMatch;

        return new Response(buildOfflinePage(url.pathname), {
          status: 503,
          headers: { "Content-Type": "text/html" },
        });
      })
    );
    return;
  }

  event.respondWith(
    networkFirst(request, ROUTE_CACHE, async () => {
      const cached = await caches.match(request);
      return cached || new Response("Offline", { status: 503 });
    })
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-data") {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: "SYNC_STARTED" }));
      })
    );
  }
});

self.addEventListener("message", (event) => {
  if (!event.data || typeof event.data !== "object") return;

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event.data.type === "WARM_CORE_ROUTES") {
    event.waitUntil(warmCoreRoutes());
    return;
  }

  if (event.data.type === "CACHE_URLS" && Array.isArray(event.data.urls)) {
    event.waitUntil(
      Promise.allSettled(
        event.data.urls
          .filter((url) => typeof url === "string" && url.trim())
          .map(async (url) => {
            const request = new Request(url, { cache: "reload" });
            const response = await fetch(request);
            if (!response.ok) return;

            const targetCache = isCoreRoute(new URL(request.url, self.location.origin).pathname)
              ? APP_SHELL_CACHE
              : ROUTE_CACHE;
            await putWithTimestamp(targetCache, request, response);
          })
      )
    );
    return;
  }

  if (event.data.type === "CACHE_API_PAYLOAD" && typeof event.data.url === "string") {
    event.waitUntil(
      (async () => {
        const headers = new Headers({ "Content-Type": "application/json" });
        const response = new Response(JSON.stringify(event.data.data ?? null), { headers });
        await putWithTimestamp(DATA_CACHE, new Request(event.data.url), response);
      })()
    );
    return;
  }

  if (event.data.type === "CACHE_IMAGE" && typeof event.data.url === "string") {
    event.waitUntil(
      fetch(event.data.url)
        .then(async (response) => {
          if (response.ok) {
            await putWithTimestamp(IMAGE_CACHE, new Request(event.data.url), response);
          }
        })
        .catch(() => undefined)
    );
  }
});
