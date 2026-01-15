
const CACHE_NAME = 'mou-recipe-cache-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './index.tsx',
  './types.ts',
  './constants.tsx',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap'
];

// 安裝時快取關鍵資源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
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

// 攔截請求
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. 對於第三方模組 (esm.sh) 與字體使用「快取優先」策略
  if (url.hostname.includes('esm.sh') || url.hostname.includes('gstatic.com') || url.hostname.includes('googleapis.com')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((fetchResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
    return;
  }

  // 2. 對於 App 內部資源使用「網路優先，失敗則使用快取」策略
  // 這確保了在有網路時能得到最新版，沒網路時也能運行
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 成功取得網路回應，順便更新快取
        if (event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 網路失敗，回退到快取
        return caches.match(event.request);
      })
  );
});
