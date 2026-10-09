
const CACHE_NAME = 'mycloud-cache-v1';
const BASE_PATH = '/MyCloud/';

const APP_FILES = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'manifest.json'
];

// Установка: кэшируем оболочку приложения
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

// Активация: удаляем только старые кэши MyCloud
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key =>
            key.startsWith('mycloud-cache-') &&
            key !== CACHE_NAME
          )
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Загрузка ресурсов
self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Не перехватываем внешние сайты и API PocketBase
  if (url.origin !== self.location.origin) return;

  // Работаем только внутри каталога MyCloud
  if (!url.pathname.startsWith(BASE_PATH)) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copy);
          });
        }

        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);

        if (cached) return cached;

        if (request.mode === 'navigate') {
          const page = await caches.match(
            BASE_PATH + 'index.html'
          );

          if (page) return page;
        }

        return new Response('Нет подключения к интернету', {
          status: 503,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8'
          }
        });
      })
  );
});
