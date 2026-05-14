// sw.js — Service Worker Mensalize
const CACHE_NAME = 'mensalize-v6';

const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/config.js',
  '/manifest.json',
  '/logo.png',
  '/aluno.html',
  '/aluno.css'
];

// Instala e faz cache dos assets principais sem quebrar se algum arquivo falhar
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await Promise.all(
        ASSETS.map(async asset => {
          try {
            await cache.add(asset);
          } catch (error) {
            console.warn('[Mensalize SW] Não foi possível cachear:', asset, error);
          }
        })
      );
    })
  );
  self.skipWaiting();
});

// Ativa e remove caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Estratégia: Network First, fallback para cache
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
