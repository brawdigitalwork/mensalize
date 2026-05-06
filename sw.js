// sw.js — Service Worker Mensalize
const CACHE_NAME = 'mensalize-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/logo.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Instala e faz cache dos assets principais
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS.map(url => {
        // Tenta fazer cache, ignora erros em URLs externas
        return cache.add(url).catch(() => {});
      }));
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
  // Ignora requisições não-GET e requisições para APIs externas (Supabase)
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Salva resposta bem-sucedida no cache
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline: retorna do cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Fallback para a página principal
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
