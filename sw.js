// sw.js — Service Worker Mensalize
// Atualização e cache
const APP_VERSION = 'Mensalize 2.4';
const CACHE_PREFIX = 'mensalize-';
// Revisão técnica do cache. Não representa uma nova versão do produto.
const CACHE_REVISION = '2026-08-02-mobile-stability-hotfix';
const CACHE_NAME = `${CACHE_PREFIX}${APP_VERSION}-${CACHE_REVISION}`;

const ASSETS = [
  '/',
  '/index.html',
  '/theme.css',
  '/style.css',
  '/configuracoes.css',
  '/mobile-app.css',
  '/mobile-stability.css',
  '/mobile-stability.css?v=1-mobile-hotfix',
  '/pwa-install.css',
  '/legal.css',
  '/termos.html',
  '/privacidade.html',
  '/config.js',
  '/vendor/supabase-2.110.8.js',
  '/vendor/cropper-1.6.2.min.js',
  '/vendor/cropper-1.6.2.min.css',
  '/vendor/qrcode-1.0.0.min.js',
  '/manifest.json',
  '/manifest-aluno.json',
  '/logo.png',
  '/icons/mensalize-icon-512.png',
  '/icons/mensalize-icon-192.png',
  '/icons/mensalize-aluno-icon-512.png',
  '/icons/mensalize-aluno-icon-192.png',
  '/logo-aluno.png',
  '/aluno.html',
  '/aluno.css',
  '/aluno-mobile.css',
  '/aluno-mobile.css?v=12-tema-claro',
  '/aluno-desktop.css',
  '/aluno-desktop.css?v=4-tema-claro',
  '/aluno-theme-light.css?v=1',
  '/aluno-auth.js',
  '/aluno-mobile.js',
  '/aluno-mobile.js?v=12-tema-claro',
  '/aluno-mobile.js?v=13-mobile-hotfix',
  '/css/mobile/mobile-alunos.css',
  '/css/mobile/mobile-aniversariantes.css',
  '/css/mobile/mobile-avisos.css',
  '/css/mobile/mobile-configuracoes.css',
  '/css/mobile/mobile-desafio.css',
  '/css/mobile/mobile-evolucao.css',
  '/css/mobile/mobile-financeiro.css',
  '/css/mobile/mobile-presencas.css',
  '/css/mobile/mobile-programa-fight.css',
  '/css/mobile/mobile-relatorios.css',
  '/css/mobile/mobile-solicitacoes.css',
  '/css/mobile/mobile-turmas.css',
  '/js/00-setup.js',
  '/js/pwa-install.js',
  '/js/10-auth-perfil.js',
  '/js/20-alunos.js',
  '/js/30-financeiro-pagamentos.js',
  '/js/40-admin.js',
  '/js/50-ui-relatorios-tema.js',
  '/js/55-central-relatorios.js',
  '/js/60-solicitacoes-navegacao.js',
  '/js/65-mobile-professor.js',
  '/js/65-mobile-professor.js?v=2-mobile-hotfix',
  '/js/70-evolucao-presencas-avisos.js',
  '/js/75-aniversariantes.js',
  '/js/76-turmas-frequencia.js',
  '/js/77-programa-fight.js',
  '/js/80-realtime.js',
  '/js/85-notificacoes-inteligentes.js',
  '/js/86-onboarding-professor.js',
  '/js/90-cache-update.js',
  '/js/99-app.js',
  '/script.js'
];

function deveIgnorar(request) {
  const url = new URL(request.url);
  return (
    request.method !== 'GET' ||
    url.protocol !== 'http:' && url.protocol !== 'https:' ||
    url.hostname.includes('supabase.co')
  );
}

async function cachearAsset(cache, asset) {
  try {
    const request = new Request(asset, { cache: 'reload' });
    const response = await fetch(request);
    if (response && response.ok) await cache.put(asset, response.clone());
  } catch (error) {
    console.warn('[Mensalize SW] Não foi possível cachear:', asset, error);
  }
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => Promise.all(ASSETS.map(asset => cachearAsset(cache, asset))))
  );
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
    if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
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
  if (request.mode === 'navigate' || ['document', 'script', 'style', 'worker'].includes(destino)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (['image', 'manifest'].includes(destino)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});
