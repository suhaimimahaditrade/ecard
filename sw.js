const CACHE_NAME = 'edric-ecard-v2';
const ASSETS = [
  './',
  './index.html',
  './eren-spidey-walk.png',
  './edric-hero-nobg.png'
];

// Install Event
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event (Network falling back to Cache)
self.addEventListener('fetch', (e) => {
  // Only cache GET requests (Google Form POSTs are bypassed)
  if (e.request.method !== 'GET') return;
  
  // Bypass audio files from SW interception to prevent Range request issues
  if (e.request.url.includes('music.mp3')) return;
  
  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request);
    })
  );
});
