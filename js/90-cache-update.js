// js/90-cache-update.js — atualização, cache e novidades do Mensalize
const MENSALIZE_APP_VERSION = 'Mensalize 2.4';
window.MENSALIZE_APP_VERSION = MENSALIZE_APP_VERSION;

/*
 * EDITE ESTE BLOCO A CADA NOVA VERSÃO.
 * Ao trocar `version`, o aviso será mostrado uma vez novamente para cada usuário.
 */
const MENSALIZE_RELEASE = {
  id: '2.4-lancamento-2026-07-17',
  version: 'Versão 2.4',
  date: 'Julho de 2026',
  eyebrow: 'Lançamento oficial',
  title: 'Mensalize 2.4 chegou',
  summary: 'Esta versão reúne tudo que construímos para o lançamento do Mensalize: nova experiência mobile, acesso individual dos alunos, financeiro, cobranças, relatórios, turmas, presenças, evolução e uma operação muito mais organizada para o professor.',
  highlights: [
    {
      icon: '📊',
      title: 'Dashboard executivo e Central de Ação',
      description: 'A tela inicial agora resume financeiro, atrasos, alunos e prioridades do dia, além de recomendar a próxima melhor ação para o professor.'
    },
    {
      icon: '💰',
      title: 'Financeiro mais claro e operacional',
      description: 'Recebido, a receber, previsão, pagos, pendentes e atrasados ficam organizados por mês, com filtros e pagamentos por aluno recolhidos para abrir somente quando necessário.'
    },
    {
      icon: '📲',
      title: 'Cobranças pelo WhatsApp',
      description: 'O professor pode organizar alunos em aberto e acionar cobranças com mais contexto, sem precisar montar cada mensagem do zero.'
    },
    {
      icon: '💳',
      title: 'Pix e dados de recebimento',
      description: 'A academia pode configurar seus dados de pagamento e facilitar o acesso do aluno ao Pix e às informações de cobrança.'
    },
    {
      icon: '📄',
      title: 'Central de Relatórios em CSV e PDF',
      description: 'Financeiro, alunos e frequência podem ser exportados com filtros, resumo executivo e privacidade de contatos por padrão.'
    },
    {
      icon: '👥',
      title: 'Gestão completa de alunos',
      description: 'Cadastro, edição, status, mensalidade, vencimento, contato, responsável, dados internos, perfil completo e ações rápidas ficam centralizados.'
    },
    {
      icon: '📚',
      title: 'Turmas e multi-turma',
      description: 'O professor organiza horários, dias, responsáveis e alunos vinculados, e o mesmo aluno pode participar de uma ou mais turmas.'
    },
    {
      icon: '✅',
      title: 'Presença e check-in por QR Code',
      description: 'Além das chamadas por turma e data, o check-in valida o acesso do aluno, confere a turma correta, funciona com multi-turma e evita registros repetidos.'
    },
    {
      icon: '🏆',
      title: 'Desafio da Aula e ranking',
      description: 'Presenças e pontos extras alimentam o desafio mensal, com ranking para acompanhar participação, consistência e destaque dos alunos.'
    },
    {
      icon: '🥋',
      title: 'Evolução e graduação',
      description: 'Faixa, grau, tempo mínimo, frequência, previsão de avaliação e histórico de graduação passam a fazer parte da gestão do aluno.'
    },
    {
      icon: '📘',
      title: 'Programa Fight',
      description: 'O conteúdo de graduação pode ser organizado dentro do sistema para apoiar o acompanhamento técnico e a progressão dos alunos.'
    },
    {
      icon: '📢',
      title: 'Central de avisos',
      description: 'Comunicados ficam organizados para publicação, edição e acompanhamento, sem deixar a tela principal poluída.'
    },
    {
      icon: '📩',
      title: 'Solicitações organizadas',
      description: 'Pedidos do aluno ficam separados por pendentes, aprovados e recusados, com fluxo mais claro para resposta do professor e bloqueio de solicitações pendentes duplicadas.'
    },
    {
      icon: '🎂',
      title: 'Aniversariantes e relacionamento',
      description: 'O professor acompanha aniversários de hoje, da semana e do mês e pode agir rapidamente pelo WhatsApp.'
    },
    {
      icon: '📱',
      title: 'Portal do Aluno com acesso próprio',
      description: 'Cada aluno recebe um link pessoal, escolhe seu usuário e senha e acessa uma experiência mobile com financeiro, Pix, avisos, evolução, programa, ranking e dados da academia.'
    },
    {
      icon: '✨',
      title: 'Onboarding para novos professores',
      description: 'Primeiros passos guiados ajudam a configurar a academia, cadastrar o primeiro aluno, preparar o Pix, compartilhar o portal e registrar o primeiro pagamento.'
    },
    {
      icon: '🔒',
      title: 'Planos, trial e upgrade mais profissionais',
      description: 'O sistema mostra plano atual, controla período de teste e apresenta recursos bloqueados com uma experiência clara de upgrade para o Mensalize Pro.'
    },
    {
      icon: '🔔',
      title: 'Notificações mais inteligentes',
      description: 'A operação ganha alertas e prioridades para atrasos, solicitações, chamadas, evolução e outros pontos que exigem atenção.'
    },
    {
      icon: '🛡️',
      title: 'Acesso ao Portal dos Alunos',
      description: 'Uma nova área mostra quem ainda precisa criar login e permite ao professor enviar o acesso pelo WhatsApp de forma rápida e organizada.'
    }
  ]
};

const RELEASE_STORAGE_KEY = `mensalize:release-seen:${MENSALIZE_RELEASE.id || MENSALIZE_RELEASE.version}`;
let mensalizeNovaVersaoWorker = null;
let mensalizeRecarregandoPorSW = false;
let releaseLastFocusedElement = null;

function escapeReleaseHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function adicionarEstilosNovidades() {
  if (document.getElementById('mensalizeReleaseStyles')) return;

  const style = document.createElement('style');
  style.id = 'mensalizeReleaseStyles';
  style.textContent = `
    body.mensalize-release-open { overflow: hidden; }
    .mensalize-release-overlay {
      position: fixed; inset: 0; z-index: 100000; display: grid; place-items: center;
      padding: 20px; background: rgba(3, 5, 12, .78); backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px); animation: mensalizeReleaseFade .22s ease-out;
    }
    .mensalize-release-overlay.escondido { display: none !important; }
    .mensalize-release-dialog {
      width: min(100%, 620px); max-height: min(88vh, 760px); overflow: auto;
      color: #f8fafc; background: linear-gradient(145deg, #18152b 0%, #11131d 55%, #0c0e16 100%);
      border: 1px solid rgba(167, 139, 250, .3); border-radius: 24px;
      box-shadow: 0 30px 90px rgba(0, 0, 0, .55); position: relative;
      animation: mensalizeReleaseEnter .28s cubic-bezier(.2,.8,.2,1);
      scrollbar-width: thin; scrollbar-color: #6d4aff transparent;
    }
    .mensalize-release-hero {
      padding: 32px 68px 24px 32px;
      background: radial-gradient(circle at 92% 5%, rgba(139, 92, 246, .28), transparent 42%);
      border-bottom: 1px solid rgba(255,255,255,.08);
    }
    .mensalize-release-close {
      position: absolute; top: 18px; right: 18px; width: 40px; height: 40px;
      display: grid; place-items: center; border: 1px solid rgba(255,255,255,.12);
      border-radius: 12px; color: #e2e8f0; background: rgba(255,255,255,.06);
      font: 500 25px/1 sans-serif; cursor: pointer; transition: .18s ease;
    }
    .mensalize-release-close:hover { background: rgba(255,255,255,.12); transform: translateY(-1px); }
    .mensalize-release-close:focus-visible,
    .mensalize-release-primary:focus-visible { outline: 3px solid rgba(196,181,253,.65); outline-offset: 3px; }
    .mensalize-release-eyebrow {
      display: inline-flex; align-items: center; gap: 8px; margin: 0 0 12px;
      color: #c4b5fd; font: 700 12px/1.2 system-ui, sans-serif;
      letter-spacing: .09em; text-transform: uppercase;
    }
    .mensalize-release-eyebrow::before {
      content: ''; width: 8px; height: 8px; border-radius: 999px; background: #8b5cf6;
      box-shadow: 0 0 0 5px rgba(139,92,246,.16);
    }
    .mensalize-release-title {
      margin: 0; max-width: 490px; color: #fff; font: 800 clamp(25px, 5vw, 36px)/1.12 system-ui, sans-serif;
      letter-spacing: -.035em;
    }
    .mensalize-release-summary {
      margin: 14px 0 0; max-width: 500px; color: #b9c0ce; font: 400 15px/1.65 system-ui, sans-serif;
    }
    .mensalize-release-meta {
      display: inline-flex; margin-top: 17px; padding: 7px 10px; border-radius: 999px;
      color: #ddd6fe; background: rgba(139,92,246,.14); font: 650 12px/1 system-ui, sans-serif;
    }
    .mensalize-release-content { padding: 24px 32px 30px; }
    .mensalize-release-list { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
    .mensalize-release-item {
      display: grid; grid-template-columns: 44px 1fr; gap: 14px; align-items: start;
      padding: 15px; border: 1px solid rgba(255,255,255,.08); border-radius: 16px;
      background: rgba(255,255,255,.035);
    }
    .mensalize-release-icon {
      width: 44px; height: 44px; display: grid; place-items: center; border-radius: 13px;
      background: rgba(139,92,246,.14); font-size: 21px;
    }
    .mensalize-release-item h3 { margin: 1px 0 5px; color: #f8fafc; font: 700 15px/1.3 system-ui, sans-serif; }
    .mensalize-release-item p { margin: 0; color: #9fa7b6; font: 400 13px/1.55 system-ui, sans-serif; }
    .mensalize-release-actions { display: flex; justify-content: flex-end; margin-top: 22px; }
    .mensalize-release-primary {
      min-height: 46px; padding: 0 20px; border: 0; border-radius: 13px; cursor: pointer;
      color: #fff; background: linear-gradient(135deg, #7c3aed, #5b21b6);
      box-shadow: 0 10px 28px rgba(109,40,217,.27); font: 700 14px/1 system-ui, sans-serif;
      transition: transform .18s ease, filter .18s ease;
    }
    .mensalize-release-primary:hover { filter: brightness(1.1); transform: translateY(-1px); }
    @keyframes mensalizeReleaseFade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes mensalizeReleaseEnter { from { opacity: 0; transform: translateY(16px) scale(.98); } to { opacity: 1; transform: none; } }
    @media (max-width: 520px) {
      .mensalize-release-overlay { padding: 0; place-items: end center; }
      .mensalize-release-dialog { width: 100%; max-height: 92dvh; border-radius: 24px 24px 0 0; }
      .mensalize-release-hero { padding: 28px 58px 21px 22px; }
      .mensalize-release-content { padding: 20px 22px calc(24px + env(safe-area-inset-bottom)); }
      .mensalize-release-title { font-size: 27px; }
      .mensalize-release-actions, .mensalize-release-primary { width: 100%; }
    }
    @media (prefers-reduced-motion: reduce) {
      .mensalize-release-overlay, .mensalize-release-dialog { animation: none; }
    }
  `;
  document.head.appendChild(style);
}

function criarModalNovidades() {
  let overlay = document.getElementById('mensalizeReleaseOverlay');
  if (overlay) return overlay;

  adicionarEstilosNovidades();
  const items = MENSALIZE_RELEASE.highlights.map(item => `
    <li class="mensalize-release-item">
      <span class="mensalize-release-icon" aria-hidden="true">${escapeReleaseHtml(item.icon)}</span>
      <div>
        <h3>${escapeReleaseHtml(item.title)}</h3>
        <p>${escapeReleaseHtml(item.description)}</p>
      </div>
    </li>
  `).join('');

  overlay = document.createElement('div');
  overlay.id = 'mensalizeReleaseOverlay';
  overlay.className = 'mensalize-release-overlay escondido';
  overlay.innerHTML = `
    <section class="mensalize-release-dialog" role="dialog" aria-modal="true"
      aria-labelledby="mensalizeReleaseTitle" aria-describedby="mensalizeReleaseSummary">
      <button type="button" class="mensalize-release-close" aria-label="Fechar novidades">×</button>
      <header class="mensalize-release-hero">
        <p class="mensalize-release-eyebrow">${escapeReleaseHtml(MENSALIZE_RELEASE.eyebrow)}</p>
        <h2 id="mensalizeReleaseTitle" class="mensalize-release-title">${escapeReleaseHtml(MENSALIZE_RELEASE.title)}</h2>
        <p id="mensalizeReleaseSummary" class="mensalize-release-summary">${escapeReleaseHtml(MENSALIZE_RELEASE.summary)}</p>
        <span class="mensalize-release-meta">${escapeReleaseHtml(MENSALIZE_RELEASE.version)} · ${escapeReleaseHtml(MENSALIZE_RELEASE.date)}</span>
      </header>
      <div class="mensalize-release-content">
        <ul class="mensalize-release-list">${items}</ul>
        <div class="mensalize-release-actions">
          <button type="button" class="mensalize-release-primary">Entendi, vamos lá</button>
        </div>
      </div>
    </section>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('.mensalize-release-close')?.addEventListener('click', fecharModalNovidades);
  overlay.querySelector('.mensalize-release-primary')?.addEventListener('click', fecharModalNovidades);
  overlay.addEventListener('click', event => {
    if (event.target === overlay) fecharModalNovidades();
  });
  return overlay;
}

function marcarNovidadesComoVistas() {
  try {
    localStorage.setItem(RELEASE_STORAGE_KEY, 'true');
  } catch (error) {
    console.warn('[Mensalize] Não foi possível salvar a leitura das novidades:', error);
  }
}

function fecharModalNovidades() {
  const overlay = document.getElementById('mensalizeReleaseOverlay');
  if (!overlay || overlay.classList.contains('escondido')) return;
  marcarNovidadesComoVistas();
  overlay.classList.add('escondido');
  document.body.classList.remove('mensalize-release-open');
  document.removeEventListener('keydown', lidarComTecladoNovidades);
  releaseLastFocusedElement?.focus?.();
}

function lidarComTecladoNovidades(event) {
  const overlay = document.getElementById('mensalizeReleaseOverlay');
  if (!overlay || overlay.classList.contains('escondido')) return;

  if (event.key === 'Escape') {
    fecharModalNovidades();
    return;
  }

  if (event.key !== 'Tab') return;
  const focusables = [...overlay.querySelectorAll('button:not([disabled]), [href], input:not([disabled])')];
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function abrirModalNovidades() {
  const overlay = criarModalNovidades();
  releaseLastFocusedElement = document.activeElement;
  overlay.classList.remove('escondido');
  document.body.classList.add('mensalize-release-open');
  document.addEventListener('keydown', lidarComTecladoNovidades);
  window.setTimeout(() => overlay.querySelector('.mensalize-release-close')?.focus(), 30);
}

function mostrarNovidadesSeNecessario() {
  let jaViu = false;
  try {
    jaViu = localStorage.getItem(RELEASE_STORAGE_KEY) === 'true';
  } catch (error) {
    console.warn('[Mensalize] Armazenamento local indisponível:', error);
  }
  if (!jaViu) window.setTimeout(abrirModalNovidades, 450);
}

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
      <button type="button" id="btnInstalarMensalize" class="acao-secundaria" data-pwa-install>Instalar aplicativo</button>
      <button type="button" id="btnAtualizarSistema" class="acao-secundaria">Atualizar sistema</button>
      <button type="button" id="btnVerNovidades" class="acao-secundaria">Ver novidades</button>
      <span>Versão: <strong>${MENSALIZE_APP_VERSION}</strong></span>
    </div>
  `;
  perfil.appendChild(card);

  card.querySelector('#btnAtualizarSistema')?.addEventListener('click', limparCacheMensalize);
  card.querySelector('#btnVerNovidades')?.addEventListener('click', abrirModalNovidades);
  window.MensalizePWA?.atualizarBotoes?.();
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
      if (data.type === 'MENSALIZE_CACHE_CLEARED') window.location.reload();
    });
  } catch (error) {
    console.warn('[Mensalize] Service Worker indisponível:', error);
  }
}

window.limparCacheMensalize = limparCacheMensalize;
window.mostrarBannerAtualizacaoMensalize = mostrarBannerAtualizacao;
window.abrirNovidadesMensalize = abrirModalNovidades;

function painelProfessorEstaAberto() {
  const telaLogin = document.getElementById('telaLogin');
  const app = document.getElementById('app');

  if (telaLogin && !telaLogin.classList.contains('escondido')) {
    return false;
  }

  if (app && app.classList.contains('escondido')) {
    return false;
  }

  return true;
}

function executarDepoisDoLogin(callback) {
  let tentativas = 0;

  const timer = setInterval(() => {
    tentativas++;

    if (painelProfessorEstaAberto()) {
      clearInterval(timer);
      callback();
      return;
    }

    if (tentativas >= 120) {
      clearInterval(timer);
    }
  }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
  registrarServiceWorkerMensalize();

  executarDepoisDoLogin(() => {
    criarBannerAtualizacao();
    adicionarBotaoAtualizarSistema();

    mostrarNovidadesSeNecessario();
  });
});
