
const CACHE_NAME = 'mou-recipe-cache-v4';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/index.tsx',
  '/manifest.json',
  '/icon.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap'
];

// 安裝時快取關鍵資源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching critical assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 清理舊快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 攔截請求：採用 Stale-While-Revalidate 策略
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 對於外部函式庫與靜態資源，優先檢查快取，背景更新
  if (
    url.hostname.includes('esm.sh') || 
    url.hostname.includes('gstatic.com') || 
    url.hostname.includes('googleapis.com') || 
    url.hostname.includes('tailwindcss.com') ||
    ASSETS_TO_CACHE.includes(url.pathname)
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        }).catch(() => {
          // 網路失敗時不執行任何操作，讓 cachedResponse 回傳即可
        });
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 預設採用「網路優先」，失敗則回傳快取內容
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (event.request.method === 'GET' && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
