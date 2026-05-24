// js/90-cache-update.js — controle de atualização/cache do Mensalize
// Fase 5.1 — Atualização e Cache
const MENSALIZE_APP_VERSION = '2026.05.24-login-app-v34';
window.MENSALIZE_APP_VERSION = MENSALIZE_APP_VERSION;

let mensalizeNovaVersaoWorker = null;
let mensalizeRecarregandoPorSW = false;

function criarBannerAtualizacao() {
  let banner = document.getElementById('mensalizeUpdateBanner');
  if (banner) return banner;

  banner = document.createElement('div');
  banner.id = 'mensalizeUpdateBanner';
  banner.className = 'update-banner escondido';
  banner.innerHTML = `
    <div>
      <strong>Nova versão disponível</strong>
      <span>Atualize para carregar as últimas correções do sistema.</span>
    </div>
    <button type="button" id="btnAplicarAtualizacao">Atualizar agora</button>
  `;
  document.body.appendChild(banner);

  banner.querySelector('#btnAplicarAtualizacao')?.addEventListener('click', () => {
    if (mensalizeNovaVersaoWorker) {
      mensalizeNovaVersaoWorker.postMessage({ type: 'SKIP_WAITING' });
      return;
    }
    window.limparCacheMensalize();
  });

  return banner;
}

function mostrarBannerAtualizacao(worker) {
  mensalizeNovaVersaoWorker = worker || mensalizeNovaVersaoWorker;
  const banner = criarBannerAtualizacao();
  banner.classList.remove('escondido');
}

async function limparCacheMensalize() {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter(key => key.startsWith('mensalize-')).map(key => caches.delete(key)));
    }

    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(reg => reg.unregister()));
    }
  } catch (error) {
    console.error('[Mensalize] Erro ao limpar cache:', error);
  } finally {
    window.location.reload();
  }
}

function adicionarBotaoAtualizarSistema() {
  const perfil = document.getElementById('viewPerfil');
  if (!perfil || document.getElementById('cardAtualizacaoSistema')) return;

  const card = document.createElement('section');
  card.id = 'cardAtualizacaoSistema';
  card.className = 'painel-card cache-card';
  card.innerHTML = `
    <div class="painel-topo">
      <div>
        <span class="page-eyebrow">Sistema</span>
        <h2>Atualização e cache</h2>
        <p>Use quando o sistema parecer estar com versão antiga no celular ou navegador.</p>
      </div>
    </div>
    <div class="cache-actions">
      <button type="button" id="btnAtualizarSistema" class="acao-secundaria">Atualizar sistema</button>
      <span>Versão: <strong>${MENSALIZE_APP_VERSION}</strong></span>
    </div>
  `;
  perfil.appendChild(card);

  card.querySelector('#btnAtualizarSistema')?.addEventListener('click', limparCacheMensalize);
}

async function registrarServiceWorkerMensalize() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registro = await navigator.serviceWorker.register('/sw.js');

    if (registro.waiting && navigator.serviceWorker.controller) {
      mostrarBannerAtualizacao(registro.waiting);
    }

    registro.addEventListener('updatefound', () => {
      const novoWorker = registro.installing;
      if (!novoWorker) return;

      novoWorker.addEventListener('statechange', () => {
        if (novoWorker.state === 'installed' && navigator.serviceWorker.controller) {
          mostrarBannerAtualizacao(novoWorker);
        }
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (mensalizeRecarregandoPorSW) return;
      mensalizeRecarregandoPorSW = true;
      window.location.reload();
    });

    navigator.serviceWorker.addEventListener('message', event => {
      const data = event.data || {};
      if (data.type === 'MENSALIZE_CACHE_CLEARED') {
        window.location.reload();
      }
    });
  } catch (error) {
    console.warn('[Mensalize] Service Worker indisponível:', error);
  }
}

window.limparCacheMensalize = limparCacheMensalize;
window.mostrarBannerAtualizacaoMensalize = mostrarBannerAtualizacao;

document.addEventListener('DOMContentLoaded', () => {
  criarBannerAtualizacao();
  adicionarBotaoAtualizarSistema();
});

registrarServiceWorkerMensalize();
