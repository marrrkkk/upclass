const CACHE_NAME = 'upclass-v2';
const RUNTIME_CACHE = 'upclass-runtime-v2';
const DATA_CACHE = 'upclass-data-v2';
const IMAGE_CACHE = 'upclass-images-v2';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/home',
  '/classes',
  '/resources',
  '/messages',
  '/notifications',
  '/icon.svg',
  '/logo.svg',
  '/favicon.ico',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache each asset individually to avoid failing on unavailable URLs
      const cachePromises = STATIC_ASSETS.map(url => {
        return cache.add(new Request(url, { cache: 'reload' }))
          .catch(err => {
            // Log but don't fail on individual cache misses
            console.log(`Failed to cache ${url}:`, err);
            return null;
          });
      });
      await Promise.allSettled(cachePromises);
      console.log('Service worker installed and assets cached');
    }).catch(err => {
      console.log('Cache install failed:', err);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && 
                   cacheName !== RUNTIME_CACHE && 
                   cacheName !== DATA_CACHE && 
                   cacheName !== IMAGE_CACHE;
          })
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - network first, fallback to cache (optimized)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (except for images from trusted sources)
  if (url.origin !== location.origin) {
    // Allow caching images from external sources if needed
    if (request.destination === 'image' && (
      url.hostname.includes('uploadthing.com') ||
      url.hostname.includes('supabase.co')
    )) {
      // Cache external images
      event.respondWith(
        caches.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(IMAGE_CACHE).then((cache) => {
                cache.put(request, clone);
              });
            }
            return response;
          });
        })
      );
    }
    return;
  }

  // Handle Next.js RSC requests (React Server Components)
  if (url.searchParams.has('_rsc') || request.headers.get('RSC') === '1') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful RSC responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Try cache for RSC requests
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return a minimal RSC response if no cache
            return new Response('', { 
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
        })
    );
    return;
  }

  // For images, cache aggressively
  if (request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(IMAGE_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        }).catch(() => {
          return new Response('', { status: 503 });
        });
      })
    );
    return;
  }

  // For API routes, try network first, then cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response
          const responseToCache = response.clone();
          // Cache successful responses
          if (response.status === 200) {
            caches.open(DATA_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline response for API calls
            return new Response(
              JSON.stringify({ error: 'Offline', cached: true }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          });
        })
    );
    return;
  }

  // For pages and assets, try network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone the response
        const responseToCache = response.clone();
        // Cache successful responses (pages, CSS, JS, etc.)
        if (response.status === 200) {
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // For navigation requests, try to get any cached page but don't redirect
          if (request.mode === 'navigate') {
            // Try to get the requested page from cache first
            return caches.match(request.url).then((cachedPage) => {
              if (cachedPage) {
                return cachedPage;
              }
              // If not found, return an offline HTML page with error handling
              const offlineHTML = `
<!DOCTYPE html>
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
    <h1>📡 You're Offline</h1>
    <p>This page is not available in cache. Please check your internet connection and try again.</p>
    <button onclick="window.location.reload()">Retry</button>
  </div>
</body>
</html>`;
              return new Response(offlineHTML, { 
                status: 503,
                headers: { 'Content-Type': 'text/html' }
              });
            });
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // This will be called when connection is restored
  // You can implement your sync logic here
  try {
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({ type: 'SYNC_STARTED' });
    });
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      (async () => {
        try {
          const cache = await caches.open(RUNTIME_CACHE);
          // Cache each URL individually to avoid failing on unavailable URLs
          const cachePromises = event.data.urls.map(async (url) => {
            try {
              // Check if already cached
              const cached = await cache.match(url);
              if (cached) {
                return; // Already cached
              }
              
              // Fetch and cache
              const response = await fetch(url, { cache: 'reload' });
              if (response.ok) {
                await cache.put(url, response);
              }
            } catch (err) {
              // Silently fail for individual URLs - they might not be available
              // This is expected for pages that require auth or don't exist
            }
          });
          await Promise.allSettled(cachePromises);
        } catch (err) {
          // Silently handle cache open failures
          console.log('Failed to open cache:', err);
        }
      })()
    );
  }
  if (event.data && event.data.type === 'CACHE_DATA') {
    // Cache data in background
    event.waitUntil(
      caches.open(DATA_CACHE).then((cache) => {
        const { url, data } = event.data;
        return cache.put(new Request(url), new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' }
        }));
      }).catch(err => {
        console.log('Failed to cache data:', err);
        return null;
      })
    );
  }
  if (event.data && event.data.type === 'CACHE_IMAGE') {
    // Cache image in background
    event.waitUntil(
      fetch(event.data.url).then((response) => {
        if (response.ok) {
          return caches.open(IMAGE_CACHE).then((cache) => {
            return cache.put(new Request(event.data.url), response);
          });
        }
      }).catch(() => {
        // Ignore image cache failures
      })
    );
  }
});

