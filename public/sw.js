// Harmoniq Safety Service Worker
// Provides offline caching and background sync capabilities

const CACHE_NAME = 'harmoniq-safety-v1';
const STATIC_CACHE = 'harmoniq-static-v1';
const DYNAMIC_CACHE = 'harmoniq-dynamic-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/login',
  '/manifest.json',
  '/icons/icon.svg',
  '/offline.html',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS.filter(url => !url.includes('offline.html')));
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip external requests
  if (url.origin !== self.location.origin) return;

  // Skip API routes (these should always go to network)
  if (url.pathname.startsWith('/api/')) return;

  // Skip Next.js internal routes
  if (url.pathname.startsWith('/_next/')) {
    // But cache static assets from _next/static
    if (url.pathname.includes('/_next/static/')) {
      event.respondWith(
        caches.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          });
        })
      );
    }
    return;
  }

  // Network-first strategy for HTML pages
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache, then offline page
          return caches.match(request).then((cached) => {
            return cached || caches.match('/offline.html') || new Response(
              '<html><body><h1>Offline</h1><p>You are currently offline. Please check your connection.</p></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          });
        })
    );
    return;
  }

  // Cache-first for other assets (images, fonts, etc.)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Return placeholder for images
          if (request.url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
            return new Response(
              '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#ccc" width="100" height="100"/></svg>',
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
          }
          return new Response('Offline', { status: 503 });
        });
    })
  );
});

// Background sync for offline form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-incidents') {
    console.log('[SW] Syncing incidents...');
    event.waitUntil(syncOfflineData('incidents'));
  }
  if (event.tag === 'sync-inspections') {
    console.log('[SW] Syncing inspections...');
    event.waitUntil(syncOfflineData('inspections'));
  }
});

// Helper to sync offline data (placeholder - would integrate with API)
async function syncOfflineData(type) {
  try {
    const offlineQueue = await getOfflineQueue(type);
    if (offlineQueue.length === 0) return;
    
    // In a real implementation, this would POST to the API
    console.log(`[SW] Would sync ${offlineQueue.length} ${type} items`);
    
    // Clear the queue after successful sync
    await clearOfflineQueue(type);
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// IndexedDB helpers for offline queue
function getOfflineQueue(type) {
  return new Promise((resolve) => {
    const stored = localStorage.getItem(`offline-queue-${type}`);
    resolve(stored ? JSON.parse(stored) : []);
  });
}

function clearOfflineQueue(type) {
  return new Promise((resolve) => {
    localStorage.removeItem(`offline-queue-${type}`);
    resolve();
  });
}

// Push notification handling
self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'Harmoniq Safety', body: 'New notification' };
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [100, 50, 100],
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.notification.data?.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

console.log('[SW] Service worker loaded');
