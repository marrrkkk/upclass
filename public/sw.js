const CACHE_NAME = 'upclass-v3';
const RUNTIME_CACHE = 'upclass-runtime-v3';
const DATA_CACHE = 'upclass-data-v3';
const IMAGE_CACHE = 'upclass-images-v3';

const STATIC_ASSETS = [
  '/',
  '/icon.svg',
  '/logo.svg',
  '/favicon.ico',
  '/manifest.json',
];

function buildOfflinePage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - UpClass</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
      padding: 20px;
    }
    .container {
      max-width: 500px;
    }
    h1 { font-size: 2rem; margin-bottom: 1rem; }
    p { font-size: 1.1rem; opacity: 0.9; margin-bottom: 2rem; }
    button {
      background: white;
      color: #667eea;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
      font-weight: 600;
    }
    button:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="container">
    <h1>You're Offline</h1>
    <p>This page needs a live connection. Please reconnect and try again.</p>
    <button onclick="window.location.reload()">Retry</button>
  </div>
</body>
</html>`;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachePromises = STATIC_ASSETS.map((url) =>
        cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
      );
      await Promise.allSettled(cachePromises);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => ![CACHE_NAME, RUNTIME_CACHE, DATA_CACHE, IMAGE_CACHE].includes(cacheName))
          .map((cacheName) => caches.delete(cacheName))
      )
    )
  );
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (url.origin !== location.origin) {
    if (
      request.destination === 'image' &&
      (url.hostname.includes('uploadthing.com') || url.hostname.includes('supabase.co'))
    ) {
      event.respondWith(
        caches.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) {
              caches.open(IMAGE_CACHE).then((cache) => cache.put(request, response.clone()));
            }
            return response;
          });
        })
      );
    }
    return;
  }

  if (url.searchParams.has('_rsc') || request.headers.get('RSC') === '1') {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response('', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          })
      )
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(buildOfflinePage(), {
            status: 503,
            headers: { 'Content-Type': 'text/html' },
          })
      )
    );
    return;
  }

  if (request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response.ok) {
            caches.open(IMAGE_CACHE).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            caches.open(DATA_CACHE).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }

            return new Response(JSON.stringify({ error: 'Offline', cached: true }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            });
          })
        )
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, response.clone()));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cachedResponse) => cachedResponse || new Response('Offline', { status: 503 }))
      )
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({ type: 'SYNC_STARTED' });
    });
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      (async () => {
        try {
          const cache = await caches.open(RUNTIME_CACHE);
          const cachePromises = event.data.urls.map(async (url) => {
            try {
              if (
                !url ||
                url === '/' ||
                url.startsWith('/home') ||
                url.startsWith('/classes') ||
                url.startsWith('/resources') ||
                url.startsWith('/messages') ||
                url.startsWith('/notifications') ||
                url.startsWith('/settings') ||
                url.startsWith('/profile') ||
                url.startsWith('/sign-in') ||
                url.startsWith('/sign-up') ||
                url.startsWith('/onboard')
              ) {
                return;
              }

              const cached = await cache.match(url);
              if (cached) {
                return;
              }

              const response = await fetch(url, { cache: 'reload' });
              if (response.ok) {
                await cache.put(url, response);
              }
            } catch {
              return;
            }
          });
          await Promise.allSettled(cachePromises);
        } catch (err) {
          console.log('Failed to open cache:', err);
        }
      })()
    );
  }

  if (event.data && event.data.type === 'CACHE_DATA') {
    event.waitUntil(
      caches
        .open(DATA_CACHE)
        .then((cache) => {
          const { url, data } = event.data;
          return cache.put(
            new Request(url),
            new Response(JSON.stringify(data), {
              headers: { 'Content-Type': 'application/json' },
            })
          );
        })
        .catch(() => null)
    );
  }

  if (event.data && event.data.type === 'CACHE_IMAGE') {
    event.waitUntil(
      fetch(event.data.url)
        .then((response) => {
          if (response.ok) {
            return caches.open(IMAGE_CACHE).then((cache) => cache.put(new Request(event.data.url), response));
          }
        })
        .catch(() => undefined)
    );
  }
});
