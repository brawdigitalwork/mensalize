// Mensalize — instalação PWA compartilhada entre professor e aluno.
(function inicializarInstalacaoMensalize() {
  "use strict";

  const nomeAplicativo = document.querySelector('meta[name="mensalize-pwa-name"]')?.content
    || "Mensalize";

  let eventoInstalacaoPendente = null;
  let ultimoFoco = null;

  function estaInstalado() {
    return window.matchMedia?.("(display-mode: standalone)")?.matches
      || window.navigator.standalone === true;
  }

  function plataformaAtual() {
    const agente = String(navigator.userAgent || "").toLowerCase();
    if (/iphone|ipad|ipod/.test(agente)) return "ios";
    if (/android/.test(agente)) return "android";
    return "desktop";
  }

  function atualizarBotoes() {
    const instalado = estaInstalado();

    document.querySelectorAll("[data-pwa-install]").forEach(function(botao) {
      botao.classList.toggle("pwa-install-hidden", instalado);
      botao.setAttribute("aria-hidden", instalado ? "true" : "false");
    });
  }

  function instrucoesPlataforma() {
    const plataforma = plataformaAtual();

    if (plataforma === "ios") {
      return {
        titulo: "Instalar no iPhone",
        passos: [
          "Abra esta página no Safari.",
          "Toque no botão Compartilhar.",
          "Escolha Adicionar à Tela de Início.",
          "Ative Abrir como App e toque em Adicionar."
        ],
        observacao: "Ao abrir o app pela primeira vez, talvez seja necessário entrar novamente."
      };
    }

    if (plataforma === "android") {
      return {
        titulo: "Instalar no Android",
        passos: [
          "Abra esta página no Google Chrome.",
          "Toque no menu de três pontos.",
          "Escolha Instalar app ou Adicionar à tela inicial.",
          "Confirme a instalação."
        ],
        observacao: "O nome da opção pode variar conforme o navegador e o aparelho."
      };
    }

    return {
      titulo: "Instalar no computador",
      passos: [
        "Abra esta página no Google Chrome ou Microsoft Edge.",
        "Clique no ícone de instalação na barra de endereço.",
        "Se o ícone não aparecer, abra o menu do navegador.",
        `Escolha Instalar ${nomeAplicativo}.`
      ],
      observacao: "Depois de instalado, o aplicativo aparecerá no menu de programas do computador."
    };
  }

  function criarModalInstalacao() {
    let overlay = document.getElementById("mensalizePwaInstallOverlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "mensalizePwaInstallOverlay";
    overlay.className = "pwa-install-overlay pwa-install-hidden";
    overlay.innerHTML = `
      <section class="pwa-install-dialog" role="dialog" aria-modal="true" aria-labelledby="mensalizePwaInstallTitle">
        <button type="button" class="pwa-install-close" data-pwa-close aria-label="Fechar instruções">×</button>
        <span class="pwa-install-dialog-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 19h14"/></svg>
        </span>
        <span id="mensalizePwaInstallApp" class="pwa-install-eyebrow"></span>
        <h2 id="mensalizePwaInstallTitle">Instalar aplicativo</h2>
        <ol id="mensalizePwaInstallSteps"></ol>
        <p id="mensalizePwaInstallNote" class="pwa-install-note"></p>
        <button type="button" class="pwa-install-understood" data-pwa-close>Entendi</button>
      </section>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector("#mensalizePwaInstallApp").textContent = nomeAplicativo;
    overlay.addEventListener("click", function(event) {
      if (event.target === overlay || event.target.closest("[data-pwa-close]")) {
        fecharModalInstalacao();
      }
    });

    return overlay;
  }

  function abrirInstrucoes() {
    const overlay = criarModalInstalacao();
    const instrucoes = instrucoesPlataforma();
    const titulo = overlay.querySelector("#mensalizePwaInstallTitle");
    const passos = overlay.querySelector("#mensalizePwaInstallSteps");
    const observacao = overlay.querySelector("#mensalizePwaInstallNote");

    titulo.textContent = instrucoes.titulo;
    passos.replaceChildren(...instrucoes.passos.map(function(texto) {
      const item = document.createElement("li");
      item.textContent = texto;
      return item;
    }));
    observacao.textContent = instrucoes.observacao;

    ultimoFoco = document.activeElement;
    overlay.classList.remove("pwa-install-hidden");
    document.body.classList.add("pwa-install-open");
    overlay.querySelector(".pwa-install-close")?.focus();
  }

  function fecharModalInstalacao() {
    const overlay = document.getElementById("mensalizePwaInstallOverlay");
    if (!overlay || overlay.classList.contains("pwa-install-hidden")) return;

    overlay.classList.add("pwa-install-hidden");
    document.body.classList.remove("pwa-install-open");
    ultimoFoco?.focus?.();
  }

  async function solicitarInstalacao(botao) {
    if (estaInstalado()) {
      atualizarBotoes();
      return;
    }

    if (!eventoInstalacaoPendente) {
      abrirInstrucoes();
      return;
    }

    const textoOriginal = botao?.textContent || "Instalar aplicativo";

    try {
      if (botao) {
        botao.disabled = true;
        botao.textContent = "Abrindo instalação...";
      }

      await eventoInstalacaoPendente.prompt();
      await eventoInstalacaoPendente.userChoice;
      eventoInstalacaoPendente = null;
    } catch (erro) {
      console.warn("[Mensalize PWA] Não foi possível abrir o instalador:", erro);
      abrirInstrucoes();
    } finally {
      if (botao) {
        botao.disabled = false;
        botao.textContent = textoOriginal;
      }
    }
  }

  function lidarComTeclado(event) {
    const overlay = document.getElementById("mensalizePwaInstallOverlay");
    if (!overlay || overlay.classList.contains("pwa-install-hidden")) return;

    if (event.key === "Escape") {
      fecharModalInstalacao();
      return;
    }

    if (event.key !== "Tab") return;
    const focaveis = Array.from(overlay.querySelectorAll("button:not([disabled])"));
    if (!focaveis.length) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];

    if (event.shiftKey && document.activeElement === primeiro) {
      event.preventDefault();
      ultimo.focus();
    } else if (!event.shiftKey && document.activeElement === ultimo) {
      event.preventDefault();
      primeiro.focus();
    }
  }

  window.addEventListener("beforeinstallprompt", function(event) {
    event.preventDefault();
    eventoInstalacaoPendente = event;
    atualizarBotoes();
  });

  window.addEventListener("appinstalled", function() {
    eventoInstalacaoPendente = null;
    fecharModalInstalacao();
    atualizarBotoes();
  });

  document.addEventListener("click", function(event) {
    const botao = event.target.closest("[data-pwa-install]");
    if (!botao) return;
    event.preventDefault();
    solicitarInstalacao(botao);
  });

  document.addEventListener("keydown", lidarComTeclado);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function() {
      navigator.serviceWorker.register("/sw.js").catch(function(erro) {
        console.warn("[Mensalize PWA] Service Worker indisponível:", erro);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", atualizarBotoes, { once: true });
  } else {
    atualizarBotoes();
  }

  window.MensalizePWA = {
    abrirInstrucoes,
    solicitarInstalacao,
    atualizarBotoes,
    estaInstalado
  };
})();
