// sw.js — Service Worker Mensalize
// Fase 5.1 — Atualização e Cache
const APP_VERSION = '49';
const CACHE_PREFIX = 'mensalize-';
const CACHE_NAME = `${CACHE_PREFIX}${APP_VERSION}`;

const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/config.js',
  '/manifest.json',
  '/icons/aluno-icon-512.png',
  '/icons/aluno-icon-192.png',
  '/manifest-aluno.json',
  '/logo.png',
  '/aluno.html',
  '/aluno.css',
  '/js/00-setup.js',
  '/js/10-auth-perfil.js',
  '/js/20-alunos.js',
  '/js/30-financeiro-pagamentos.js',
  '/js/40-admin.js',
  '/js/50-ui-relatorios-tema.js',
  '/js/60-solicitacoes-navegacao.js',
  '/js/70-evolucao-presencas-avisos.js',
  '/js/75-aniversariantes.js',
  '/js/76-turmas-frequencia.js',
  '/js/80-realtime.js',
  '/js/90-cache-update.js',
  '/js/99-app.js',
  '/script.js'
];

function deveIgnorar(request) {
  const url = new URL(request.url);
  return (
    request.method !== 'GET' ||
    url.protocol !== 'http:' && url.protocol !== 'https:' ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('cdn.jsdelivr.net')
  );
}

async function cachearAsset(cache, asset) {
  try {
    const request = new Request(asset, { cache: 'reload' });
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(asset, response.clone());
    }
  } catch (error) {
    console.warn('[Mensalize SW] Não foi possível cachear:', asset, error);
  }
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => Promise.all(ASSETS.map(asset => cachearAsset(cache, asset))))
  );
  // Fica aguardando; a página mostra o botão de atualizar e envia SKIP_WAITING.
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clientsList.forEach(client => client.postMessage({ type: 'MENSALIZE_SW_READY', version: APP_VERSION }));
  })());
});

self.addEventListener('message', event => {
  const data = event.data || {};

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'CLEAR_MENSALIZE_CACHE') {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX)).map(key => caches.delete(key)));
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clientsList.forEach(client => client.postMessage({ type: 'MENSALIZE_CACHE_CLEARED', version: APP_VERSION }));
    })());
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;

    if (request.mode === 'navigate' || request.destination === 'document') {
      const url = new URL(request.url);
      if (url.pathname.endsWith('/aluno.html')) {
        return cache.match('/aluno.html') || cache.match('/index.html');
      }
      return cache.match('/index.html');
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (deveIgnorar(request)) return;

  const destino = request.destination;

  // HTML/CSS/JS: tenta sempre a versão nova primeiro.
  if (request.mode === 'navigate' || ['document', 'script', 'style', 'worker'].includes(destino)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Imagens e manifest: cache primeiro, porque mudam menos.
  if (['image', 'manifest'].includes(destino)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});
