const CACHE_NAME = 'goodtime-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
          .then((fetchResponse) => {
            // Cache successful GET requests
            if (fetchResponse.status === 200 && event.request.method === 'GET') {
              const responseClone = fetchResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
            }
            return fetchResponse;
          });
      })
      .catch(() => {
        // Fallback for navigation requests when offline
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
  );
});

// Background sync for timer notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'timer-notification') {
    event.waitUntil(
      // Handle background timer sync if needed
      Promise.resolve()
    );
  }
});

// Handle timer notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TIMER_FINISHED') {
    const { timerType, title, body } = event.data;
    
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'timer-notification',
      requireInteraction: true,
      actions: [
        {
          action: 'start',
          title: 'Start Next Timer'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    });
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'start') {
    // Open the app and start the next timer
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => {
          // Focus existing window or open new one
          if (clients.length > 0) {
            const client = clients[0];
            client.focus();
            client.postMessage({ type: 'START_NEXT_TIMER' });
          } else {
            self.clients.openWindow('/');
          }
        })
    );
  }
});