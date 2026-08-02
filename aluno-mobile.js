// ============================================================================
// MENSALIZE ALUNO — EXPERIÊNCIA MOBILE v2
// Camada exclusiva <= 760px.
// Reutiliza as views, ações e dados atuais. Não duplica regras de negócio.
// ============================================================================

(function inicializarCamadaMobileAluno() {
  "use strict";

  const MOBILE_BREAKPOINT = 760;

  const titulos = {
    inicio: "Início",
    dados: "Meu perfil",
    financas: "Financeiro",
    graduacao: "Evolução",
    programa: "Programa da faixa",
    ranking: "Desafio",
    contato: "Contato"
  };

  const viewPorId = {
    viewInicioAluno: "inicio",
    viewDadosAluno: "dados",
    viewFinancasAluno: "financas",
    viewGraduacaoAluno: "graduacao",
    viewProgramaFaixaAluno: "programa",
    viewRankingAluno: "ranking",
    viewContatoAluno: "contato"
  };

  let observadores = [];
  let viewAtual = "inicio";

  const CAROUSEL_INTERVALO_MS = 5500;
  const CAROUSEL_RETOMADA_MS = 8000;

  let carouselIndice = 0;
  let carouselTimer = null;
  let carouselRetomadaTimer = null;
  let carouselScrollTimer = null;
  let carouselInteragindo = false;

  let financeiroAreaOrigem = null;
  let financeiroHistoricoOrigem = null;

  let evolucaoGraduacaoPlaceholder = null;
  let evolucaoTurmaPlaceholder = null;

  let desafioTabsPlaceholder = null;
  let desafioListaPlaceholder = null;

  let programaListaPlaceholder = null;

  let solicitacoesModoAtivo = false;

  let avisosModoAtivo = false;
  let avisosListaPlaceholder = null;

  let contatoAreaPlaceholder = null;
  let contatoCompartilharPlaceholder = null;

  let ultimoDisparadorMais = null;

  function ehMobileAluno() {
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
  }

  function portalVisivel() {
    const portal = document.getElementById("portalConteudo");
    return !!portal && !portal.classList.contains("escondido");
  }

  function sincronizarEstadoPortal() {
    const ativo = ehMobileAluno() && portalVisivel();

    document.body.classList.toggle("mobile-aluno-portal-ativo", ativo);

    if (!ativo) {
      document.body.classList.remove("mobile-aluno-interna", "mobile-aluno-sheet-open");
      fecharMais();
    }
  }

  function obterViewAtiva() {
    const ativa = document.querySelector("#portalConteudo .student-view.ativa");
    return viewPorId[ativa?.id] || "inicio";
  }

  function clicarMenuOriginal(view) {
    const seletor = `.student-sidebar .student-menu-item[data-view="${view}"]`;
    const botao = document.querySelector(seletor);

    if (botao) {
      botao.click();
      return true;
    }

    if (typeof window.abrirViewAluno === "function") {
      window.abrirViewAluno(view);
      return true;
    }

    return false;
  }

  function rolarTopo() {
    const main = document.querySelector("#portalConteudo .student-main");
    if (!main) return;

    try {
      main.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch (_) {
      main.scrollTop = 0;
    }
  }

  function abrirViewMobile(view, opcoes = {}) {
    if (!ehMobileAluno()) return;

    solicitacoesModoAtivo =
      view === "graduacao" && opcoes.solicitacoes === true;

    avisosModoAtivo =
      view === "inicio" && opcoes.avisos === true;

    document.body.classList.toggle(
      "mobile-aluno-solicitacoes-mode",
      solicitacoesModoAtivo
    );
    document.body.classList.toggle(
      "mobile-aluno-avisos-mode",
      avisosModoAtivo
    );

    if (!avisosModoAtivo) {
      moverConteudoAvisosMobile(false);
    }

    clicarMenuOriginal(view);

    window.setTimeout(() => {
      if (view === "graduacao") {
        moverSolicitacoesEvolucaoMobile(true);
        sincronizarSolicitacoesMobile();
      }

      if (avisosModoAtivo) {
        moverConteudoAvisosMobile(true);
        sincronizarAvisosMobile();
      }

      atualizarShell(view);
      rolarTopo();
    }, 0);

    fecharMais();
  }

  function abaPrincipal(view) {
    if (view === "inicio") return "inicio";
    if (view === "financas") return "financas";
    if (view === "graduacao" || view === "programa") return "graduacao";
    if (view === "ranking") return "ranking";
    return "mais";
  }

  function atualizarBottomNav(view = viewAtual) {
    const aba = abaPrincipal(view);

    document.querySelectorAll(".mobile-aluno-bottom-item").forEach((botao) => {
      const viewBotao = botao.dataset.mobileAlunoView;
      const acao = botao.dataset.mobileAlunoAction;

      botao.classList.toggle(
        "ativo",
        viewBotao === aba || (acao === "mais" && aba === "mais")
      );
    });
  }

  function atualizarShell(view = obterViewAtiva()) {
    viewAtual = titulos[view] ? view : "inicio";

    if (viewAtual !== "graduacao") {
      solicitacoesModoAtivo = false;
    }

    if (viewAtual !== "inicio") {
      avisosModoAtivo = false;
    }

    const modoSolicitacoes =
      solicitacoesModoAtivo && viewAtual === "graduacao";
    const modoAvisos =
      avisosModoAtivo && viewAtual === "inicio";

    document.body.classList.toggle(
      "mobile-aluno-solicitacoes-mode",
      modoSolicitacoes
    );
    document.body.classList.toggle(
      "mobile-aluno-avisos-mode",
      modoAvisos
    );

    const interna = viewAtual !== "inicio" || modoAvisos;
    document.body.classList.toggle("mobile-aluno-interna", interna);

    const titulo = document.getElementById("mobileAlunoTituloInterno");
    if (titulo) {
      titulo.textContent = modoSolicitacoes
        ? "Solicitações"
        : modoAvisos
          ? "Avisos"
          : (titulos[viewAtual] || "Mensalize Aluno");
    }

    atualizarBottomNav(
      modoSolicitacoes
        ? "dados"
        : modoAvisos
          ? "inicio"
          : viewAtual
    );

    if (viewAtual === "inicio" && !modoAvisos) {
      agendarCarouselAutomatico();
    } else {
      pararCarouselAutomatico();
    }
  }

  function abrirMais(evento) {
    if (!ehMobileAluno() || !portalVisivel()) return;

    const sheet = document.getElementById("mobileAlunoMaisSheet");
    if (!sheet) return;

    const disparador = evento?.currentTarget;
    ultimoDisparadorMais = disparador instanceof HTMLElement
      ? disparador
      : document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    sheet.classList.add("aberta");
    sheet.setAttribute("aria-hidden", "false");
    document.body.classList.add("mobile-aluno-sheet-open");
    atualizarBottomNav("dados");
    pararCarouselAutomatico();

    window.requestAnimationFrame(() => {
      sheet
        .querySelector(".mobile-aluno-sheet-row:not([disabled])")
        ?.focus({ preventScroll: true });
    });
  }

  function fecharMais() {
    const sheet = document.getElementById("mobileAlunoMaisSheet");
    if (!sheet) return;

    const focoAtual = document.activeElement;
    if (focoAtual instanceof HTMLElement && sheet.contains(focoAtual)) {
      const destino = ultimoDisparadorMais?.isConnected
        ? ultimoDisparadorMais
        : document.getElementById("btnMobileAlunoMaisInterno") ||
          document.getElementById("btnMobileAlunoMais");

      if (destino instanceof HTMLElement) {
        destino.focus({ preventScroll: true });
      } else {
        focoAtual.blur();
      }
    }

    sheet.classList.remove("aberta");
    sheet.setAttribute("aria-hidden", "true");
    document.body.classList.remove("mobile-aluno-sheet-open");

    if (portalVisivel()) {
      atualizarBottomNav(obterViewAtiva());
      if (obterViewAtiva() === "inicio") agendarCarouselAutomatico();
    }
  }

  function texto(el, fallback = "") {
    const valor = String(el?.textContent || "").trim();
    return valor || fallback;
  }

  function primeiraPalavra(valor, fallback = "Aluno") {
    return String(valor || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)[0] || fallback;
  }

  function inicialNome(valor) {
    const primeira = primeiraPalavra(valor, "A");
    return primeira.charAt(0).toUpperCase() || "A";
  }

  function classeStatusFinanceiro(valor) {
    const t = String(valor || "").toLowerCase();

    if (
      t.includes("em dia") ||
      t.includes("pago") ||
      t.includes("quitado") ||
      t.includes("ok")
    ) return "status-ok";

    if (
      t.includes("atras") ||
      t.includes("vencid") ||
      t.includes("inadimpl")
    ) return "status-erro";

    if (
      t.includes("pend") ||
      t.includes("vence") ||
      t.includes("aguard")
    ) return "status-alerta";

    return "";
  }

  function sincronizarIdentidade() {
    const nomeOriginal = document.getElementById("nomeAlunoTopo");
    const academiaOriginal = document.getElementById("nomeAcademia");
    const fotoOriginal = document.getElementById("fotoAlunoTopo");
    const avatarOriginal = document.getElementById("avatarAlunoTopo");

    const nome = texto(nomeOriginal, "Aluno");
    const academia = texto(academiaOriginal, "Mensalize Aluno");

    const mobileNome = document.getElementById("mobileAlunoNomeTopo");
    const mobileAcademiaTopo = document.getElementById("mobileAlunoAcademiaTopo");
    const mobileAcademiaCard = document.getElementById("mobileAlunoAcademiaCard");
    const mobileFoto = document.getElementById("mobileAlunoFotoTopo");
    const mobileAvatar = document.getElementById("mobileAlunoAvatarTopo");

    if (mobileNome) mobileNome.textContent = primeiraPalavra(nome);
    if (mobileAcademiaTopo) mobileAcademiaTopo.textContent = academia;
    if (mobileAcademiaCard) mobileAcademiaCard.textContent = academia;

    const src = String(fotoOriginal?.getAttribute("src") || "").trim();
    const fotoVisivel = !!src && !fotoOriginal?.classList.contains("escondido");

    if (mobileFoto) {
      if (fotoVisivel) {
        mobileFoto.src = src;
        mobileFoto.classList.remove("escondido");
      } else {
        mobileFoto.removeAttribute("src");
        mobileFoto.classList.add("escondido");
      }
    }

    if (mobileAvatar) {
      mobileAvatar.textContent = texto(avatarOriginal, inicialNome(nome));
      mobileAvatar.classList.toggle("escondido", fotoVisivel);
    }
  }

  function prefersReducedMotionAluno() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function carouselElementos() {
    const viewport = document.getElementById("mobileAlunoCarouselViewport");
    const slides = viewport
      ? Array.from(viewport.querySelectorAll(".mobile-aluno-carousel-card"))
      : [];
    const dots = Array.from(
      document.querySelectorAll("[data-mobile-aluno-carousel-dot]")
    );

    return { viewport, slides, dots };
  }

  function carouselPodeRodar() {
    return (
      ehMobileAluno() &&
      portalVisivel() &&
      viewAtual === "inicio" &&
      !document.hidden &&
      !document.body.classList.contains("mobile-aluno-sheet-open") &&
      !carouselInteragindo &&
      !prefersReducedMotionAluno()
    );
  }

  function atualizarCarouselDots(indice = carouselIndice) {
    const { dots } = carouselElementos();

    dots.forEach((dot, i) => {
      const ativo = i === indice;
      dot.classList.toggle("ativo", ativo);
      dot.setAttribute("aria-current", ativo ? "true" : "false");
    });
  }

  function limitarIndiceCarousel(indice, total) {
    if (!total) return 0;
    return ((Number(indice) % total) + total) % total;
  }

  function irParaSlideCarousel(indice, { suave = true, reiniciar = true } = {}) {
    const { viewport, slides } = carouselElementos();
    if (!viewport || !slides.length) return;

    const novoIndice = limitarIndiceCarousel(indice, slides.length);
    const slide = slides[novoIndice];

    carouselIndice = novoIndice;
    atualizarCarouselDots(novoIndice);

    viewport.scrollTo({
      left: slide.offsetLeft - viewport.offsetLeft,
      behavior: suave && !prefersReducedMotionAluno() ? "smooth" : "auto"
    });

    if (reiniciar) agendarCarouselAutomatico();
  }

  function indiceCarouselMaisProximo() {
    const { viewport, slides } = carouselElementos();
    if (!viewport || !slides.length) return 0;

    const esquerda = viewport.scrollLeft;
    let melhorIndice = 0;
    let melhorDistancia = Number.POSITIVE_INFINITY;

    slides.forEach((slide, indice) => {
      const alvo = slide.offsetLeft - viewport.offsetLeft;
      const distancia = Math.abs(alvo - esquerda);

      if (distancia < melhorDistancia) {
        melhorDistancia = distancia;
        melhorIndice = indice;
      }
    });

    return melhorIndice;
  }

  function pararCarouselAutomatico() {
    if (carouselTimer) {
      window.clearTimeout(carouselTimer);
      carouselTimer = null;
    }
  }

  function cancelarRetomadaCarousel() {
    if (carouselRetomadaTimer) {
      window.clearTimeout(carouselRetomadaTimer);
      carouselRetomadaTimer = null;
    }
  }

  function agendarCarouselAutomatico() {
    pararCarouselAutomatico();

    if (!carouselPodeRodar()) return;

    carouselTimer = window.setTimeout(() => {
      const { slides } = carouselElementos();
      if (!slides.length || !carouselPodeRodar()) return;

      irParaSlideCarousel(carouselIndice + 1, {
        suave: true,
        reiniciar: false
      });

      agendarCarouselAutomatico();
    }, CAROUSEL_INTERVALO_MS);
  }

  function pausarCarouselPorInteracao() {
    carouselInteragindo = true;
    pararCarouselAutomatico();
    cancelarRetomadaCarousel();
  }

  function retomarCarouselDepois() {
    cancelarRetomadaCarousel();

    carouselRetomadaTimer = window.setTimeout(() => {
      carouselInteragindo = false;
      agendarCarouselAutomatico();
    }, CAROUSEL_RETOMADA_MS);
  }

  function sincronizarIndiceCarouselPorScroll() {
    if (carouselScrollTimer) window.clearTimeout(carouselScrollTimer);

    carouselScrollTimer = window.setTimeout(() => {
      carouselIndice = indiceCarouselMaisProximo();
      atualizarCarouselDots(carouselIndice);

      if (!carouselInteragindo) agendarCarouselAutomatico();
    }, 90);
  }

  function configurarCarousel() {
    const { viewport, dots } = carouselElementos();
    if (!viewport || viewport.dataset.carouselConfigurado === "true") return;

    viewport.dataset.carouselConfigurado = "true";

    viewport.addEventListener("scroll", sincronizarIndiceCarouselPorScroll, {
      passive: true
    });

    ["pointerdown", "touchstart"].forEach((evento) => {
      viewport.addEventListener(evento, pausarCarouselPorInteracao, {
        passive: true
      });
    });

    ["pointerup", "pointercancel", "touchend", "touchcancel"].forEach((evento) => {
      viewport.addEventListener(evento, retomarCarouselDepois, {
        passive: true
      });
    });

    viewport.addEventListener("mouseenter", pausarCarouselPorInteracao);
    viewport.addEventListener("mouseleave", retomarCarouselDepois);

    viewport.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

      event.preventDefault();
      pausarCarouselPorInteracao();

      irParaSlideCarousel(
        carouselIndice + (event.key === "ArrowRight" ? 1 : -1),
        { suave: true, reiniciar: false }
      );

      retomarCarouselDepois();
    });

    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        pausarCarouselPorInteracao();

        irParaSlideCarousel(
          Number(dot.dataset.mobileAlunoCarouselDot || 0),
          { suave: true, reiniciar: false }
        );

        retomarCarouselDepois();
      });
    });

    atualizarCarouselDots(carouselIndice);
    agendarCarouselAutomatico();
  }

  function extrairClassificacaoRanking(textoRanking) {
    const valor = String(textoRanking || "").replace(/\s+/g, " ").trim();

    const posicaoMatch = valor.match(/(\d+)\s*º\s*lugar/i);
    const pontosMatch = valor.match(/(\d+(?:[.,]\d+)?)\s*pontos?/i);

    return {
      posicao: posicaoMatch ? `#${String(posicaoMatch[1]).padStart(2, "0")}` : "--",
      pontos: pontosMatch ? pontosMatch[1].replace(",", ".") : "0",
      temClassificacao: !!posicaoMatch
    };
  }

  function sincronizarResumo() {
    const status = texto(
      document.getElementById("inicioStatusMensalidade"),
      "Carregando..."
    );

    const vencimento = texto(
      document.getElementById("inicioVencimento"),
      "--/--/----"
    );

    const graduacao = texto(
      document.getElementById("inicioGraduacao"),
      "Minha graduação"
    );

    const avaliacao = texto(
      document.getElementById("inicioAvaliacao"),
      "Sua jornada"
    );

    const ranking = texto(
      document.getElementById("rankingHomeResumo"),
      "Ver posição"
    );

    const mobileStatus = document.getElementById("mobileAlunoStatusMensalidade");
    const mobileVencimento = document.getElementById("mobileAlunoVencimento");
    const mobileBadge = document.getElementById("mobileAlunoFinanceiroBadge");
    const mobileGraduacao = document.getElementById("mobileAlunoGraduacao");
    const mobileAvaliacao = document.getElementById("mobileAlunoAvaliacaoResumo");
    const mobileRanking = document.getElementById("mobileAlunoRankingResumo");

    const carouselGraduacao = document.getElementById("mobileAlunoCarouselGraduacao");
    const carouselGrau = document.getElementById("mobileAlunoCarouselGrau");
    const carouselAvaliacao = document.getElementById("mobileAlunoCarouselAvaliacao");
    const carouselPosicao = document.getElementById("mobileAlunoCarouselPosicao");
    const carouselPontos = document.getElementById("mobileAlunoCarouselPontos");
    const carouselDesafioLegenda = document.getElementById("mobileAlunoCarouselDesafioLegenda");

    if (mobileStatus) mobileStatus.textContent = status;
    if (mobileVencimento) mobileVencimento.textContent = vencimento;
    if (mobileGraduacao) mobileGraduacao.textContent = graduacao;
    if (mobileAvaliacao) mobileAvaliacao.textContent = avaliacao;

    if (carouselGraduacao) carouselGraduacao.textContent = graduacao;
    if (carouselAvaliacao) carouselAvaliacao.textContent = avaliacao;

    if (carouselGrau) {
      const graduacaoNormalizada = String(graduacao || "").trim();
      const partes = graduacaoNormalizada.split("•").map(item => item.trim()).filter(Boolean);

      carouselGrau.textContent = partes.length > 1
        ? partes.slice(1).join(" • ")
        : "Acompanhe sua evolução";
    }

    const classificacao = extrairClassificacaoRanking(ranking);

    if (carouselPosicao) carouselPosicao.textContent = classificacao.posicao;
    if (carouselPontos) carouselPontos.textContent = classificacao.pontos;
    if (carouselDesafioLegenda) {
      carouselDesafioLegenda.textContent = classificacao.temClassificacao
        ? "Sua classificação neste mês"
        : "Continue treinando para entrar no ranking";
    }

    if (mobileRanking) {
      const resumoCurto = classificacao.temClassificacao
        ? `${classificacao.posicao} · ${classificacao.pontos} pts`
        : "Ver classificação";
      mobileRanking.textContent = resumoCurto;
    }

    if (mobileBadge) {
      mobileBadge.classList.remove("status-ok", "status-alerta", "status-erro");
      const classe = classeStatusFinanceiro(status);
      if (classe) mobileBadge.classList.add(classe);

      mobileBadge.textContent =
        classe === "status-ok" ? "Em dia" :
        classe === "status-erro" ? "Atenção" :
        classe === "status-alerta" ? "Pendente" :
        "Status";
    }
  }

  function mapaEvolucaoOriginal() {
    const mapa = new Map();
    const container = document.getElementById("conteudoEvolucaoAluno");

    container?.querySelectorAll(".evolution-info").forEach((item) => {
      const label = texto(item.querySelector("span"), "");
      const valor = texto(item.querySelector("strong"), "");
      if (label) mapa.set(label.toLowerCase(), valor);
    });

    return mapa;
  }

  function valorEvolucao(mapa, label, fallback) {
    return mapa.get(String(label || "").toLowerCase()) || fallback;
  }

  function classeStatusEvolucao(valor) {
    const t = String(valor || "").toLowerCase();

    if (
      t.includes("apto") ||
      t.includes("pronto") ||
      t.includes("liberado")
    ) return "status-ok";

    if (
      t.includes("atras") ||
      t.includes("vencid")
    ) return "status-erro";

    if (
      t.includes("aguard") ||
      t.includes("próxim") ||
      t.includes("proxim") ||
      t.includes("avalia")
    ) return "status-alerta";

    return "";
  }

  function corFaixaAluno(valor) {
    const t = String(valor || "").toLowerCase();

    if (t.includes("preta")) return "#111116";
    if (t.includes("marrom")) return "#6f3f24";
    if (t.includes("roxa")) return "#6d38b2";
    if (t.includes("azul")) return "#2269c9";
    if (t.includes("verde")) return "#26905d";
    if (t.includes("amarela")) return "#e9bd2c";
    if (t.includes("laranja")) return "#e78424";
    if (t.includes("cinza")) return "#868894";
    if (t.includes("branca")) return "#ececf0";

    return "#8b5cf6";
  }

  function grauNumeroEvolucao(valor) {
    const match = String(valor || "").match(/(\d+)/);
    if (!match) return 0;

    const numero = Number(match[1]);
    if (!Number.isFinite(numero)) return 0;

    return Math.max(0, Math.min(4, numero));
  }

  function prepararOrigensEvolucao() {
    const cardGraduacao = document.querySelector(
      '#viewGraduacaoAluno [data-request-card="graduacao"]'
    );
    const cardTurma = document.querySelector(
      '#viewGraduacaoAluno [data-request-card="turma"]'
    );

    if (!evolucaoGraduacaoPlaceholder && cardGraduacao?.parentNode) {
      evolucaoGraduacaoPlaceholder = document.createComment(
        "mensalize-evolucao-graduacao-origem"
      );
      cardGraduacao.parentNode.insertBefore(
        evolucaoGraduacaoPlaceholder,
        cardGraduacao
      );
    }

    if (!evolucaoTurmaPlaceholder && cardTurma?.parentNode) {
      evolucaoTurmaPlaceholder = document.createComment(
        "mensalize-evolucao-turma-origem"
      );
      cardTurma.parentNode.insertBefore(
        evolucaoTurmaPlaceholder,
        cardTurma
      );
    }
  }

  function restaurarAposPlaceholder(elemento, placeholder) {
    if (!elemento || !placeholder?.parentNode) return;

    const referencia = placeholder.nextSibling;
    if (referencia) placeholder.parentNode.insertBefore(elemento, referencia);
    else placeholder.parentNode.appendChild(elemento);
  }

  function moverSolicitacoesEvolucaoMobile(ativo) {
    prepararOrigensEvolucao();

    const cardGraduacao = document.querySelector(
      '#viewGraduacaoAluno [data-request-card="graduacao"]'
    );
    const cardTurma = document.querySelector(
      '#viewGraduacaoAluno [data-request-card="turma"]'
    );

    const slotGraduacao = document.getElementById(
      solicitacoesModoAtivo
        ? "mobileAlunoSolicitacoesGraduacaoSlot"
        : "mobileAlunoGraduacaoRequestSlot"
    );
    const slotTurma = document.getElementById(
      solicitacoesModoAtivo
        ? "mobileAlunoSolicitacoesTurmaSlot"
        : "mobileAlunoTurmaRequestSlot"
    );

    if (ativo) {
      if (
        cardGraduacao &&
        slotGraduacao &&
        cardGraduacao.parentElement !== slotGraduacao
      ) {
        slotGraduacao.appendChild(cardGraduacao);
      }

      if (
        cardTurma &&
        slotTurma &&
        cardTurma.parentElement !== slotTurma
      ) {
        slotTurma.appendChild(cardTurma);
      }

      return;
    }

    restaurarAposPlaceholder(cardGraduacao, evolucaoGraduacaoPlaceholder);
    restaurarAposPlaceholder(cardTurma, evolucaoTurmaPlaceholder);
  }

  function estadoEnvioSolicitacao(mensagemElemento) {
    const mensagem = texto(mensagemElemento, "");
    const valor = mensagem.toLowerCase();

    if (valor.includes("enviando")) {
      return { texto: "Enviando", classe: "is-sending" };
    }

    if (
      valor.includes("solicitação enviada") ||
      valor.includes("solicitacao enviada")
    ) {
      return { texto: "Enviada", classe: "is-sent" };
    }

    if (
      mensagemElemento?.classList.contains("is-error") ||
      valor.includes("não foi possível") ||
      valor.includes("nao foi possivel")
    ) {
      return { texto: "Atenção", classe: "is-error" };
    }

    return { texto: "Disponível", classe: "" };
  }

  function aplicarEstadoSolicitacao(chip, estado) {
    if (!chip) return;

    chip.textContent = estado.texto;
    chip.classList.remove("is-sending", "is-sent", "is-error");

    if (estado.classe) chip.classList.add(estado.classe);
  }

  function sincronizarSolicitacoesMobile() {
    if (!ehMobileAluno()) return;

    const graduacaoResumo = document.getElementById(
      "mobileAlunoSolicitacoesGraduacaoResumo"
    );
    const turmaResumo = document.getElementById(
      "mobileAlunoSolicitacoesTurmaResumo"
    );

    const graduacaoStatus = document.getElementById(
      "mobileAlunoSolicitacoesGraduacaoStatus"
    );
    const turmaStatus = document.getElementById(
      "mobileAlunoSolicitacoesTurmaStatus"
    );

    const faixa = texto(
      document.getElementById("inicioGraduacao"),
      "Graduação não informada"
    );

    const turma = texto(
      document.getElementById("mobileAlunoEvolucaoTurma"),
      turmaPerfilMobile()
    );

    if (graduacaoResumo) graduacaoResumo.textContent = faixa;
    if (turmaResumo) turmaResumo.textContent = turma;

    aplicarEstadoSolicitacao(
      graduacaoStatus,
      estadoEnvioSolicitacao(
        document.getElementById("msgSolicitarGraduacao")
      )
    );

    aplicarEstadoSolicitacao(
      turmaStatus,
      estadoEnvioSolicitacao(
        document.getElementById("msgSolicitarTurma")
      )
    );

    if (solicitacoesModoAtivo) {
      moverSolicitacoesEvolucaoMobile(true);
    }
  }

  function sincronizarEvolucaoMobile() {
    const ativo = ehMobileAluno();
    moverSolicitacoesEvolucaoMobile(ativo);

    if (!ativo) return;

    const mapa = mapaEvolucaoOriginal();
    const faixa = valorEvolucao(mapa, "Faixa atual", "Não informada");
    const grau = valorEvolucao(mapa, "Grau", "Não informado");
    const turma = valorEvolucao(mapa, "Turma", "Não informada");
    const ultima = valorEvolucao(mapa, "Última graduação", "Não informada");
    const tempoMinimo = valorEvolucao(mapa, "Tempo mínimo", "Não informado");
    const previsao = valorEvolucao(
      mapa,
      "Previsão para avaliação",
      "Não calculada"
    );

    const status = texto(
      document.getElementById("badgeEvolucao"),
      texto(document.getElementById("inicioAvaliacao"), "Acompanhe sua evolução")
    );

    const mobileFaixa = document.getElementById("mobileAlunoEvolucaoFaixa");
    const mobileGrau = document.getElementById("mobileAlunoEvolucaoGrau");
    const mobileUltima = document.getElementById(
      "mobileAlunoEvolucaoUltimaGraduacao"
    );
    const mobileStatus = document.getElementById("mobileAlunoEvolucaoStatus");
    const mobilePrevisao = document.getElementById(
      "mobileAlunoEvolucaoPrevisao"
    );
    const mobileTempo = document.getElementById(
      "mobileAlunoEvolucaoTempoMinimo"
    );
    const mobileTurma = document.getElementById("mobileAlunoEvolucaoTurma");
    const mobileBadge = document.getElementById("mobileAlunoEvolucaoBadge");
    const hero = document.querySelector(".mobile-aluno-evolucao-hero");

    if (mobileFaixa) mobileFaixa.textContent = faixa;
    if (mobileGrau) mobileGrau.textContent = grau;
    if (mobileUltima) mobileUltima.textContent = ultima;
    if (mobileStatus) mobileStatus.textContent = status;
    if (mobilePrevisao) {
      mobilePrevisao.textContent =
        previsao && previsao !== "Não calculada"
          ? `Previsão: ${previsao}`
          : "Previsão ainda não calculada.";
    }
    if (mobileTempo) mobileTempo.textContent = tempoMinimo;
    if (mobileTurma) mobileTurma.textContent = turma;

    if (mobileBadge) {
      mobileBadge.textContent = status;
      mobileBadge.classList.remove("status-ok", "status-alerta", "status-erro");

      const classe = classeStatusEvolucao(status);
      if (classe) mobileBadge.classList.add(classe);
    }

    if (hero) {
      hero.style.setProperty("--mobile-aluno-faixa-cor", corFaixaAluno(faixa));
    }

    const grauNumero = grauNumeroEvolucao(grau);
    document
      .querySelectorAll(".mobile-aluno-evolucao-faixa-graus i")
      .forEach((marca, indice) => {
        marca.classList.toggle("ativo", indice < grauNumero);
      });
  }

  function prepararOrigensDesafio() {
    const tabs = document.getElementById("rankingFullTabs");
    const lista = document.getElementById("rankingFullList");

    if (!desafioTabsPlaceholder && tabs?.parentNode) {
      desafioTabsPlaceholder = document.createComment(
        "mensalize-desafio-tabs-origem"
      );
      tabs.parentNode.insertBefore(desafioTabsPlaceholder, tabs);
    }

    if (!desafioListaPlaceholder && lista?.parentNode) {
      desafioListaPlaceholder = document.createComment(
        "mensalize-desafio-lista-origem"
      );
      lista.parentNode.insertBefore(desafioListaPlaceholder, lista);
    }
  }

  function moverConteudoDesafioMobile(ativo) {
    prepararOrigensDesafio();

    const tabs = document.getElementById("rankingFullTabs");
    const lista = document.getElementById("rankingFullList");
    const slotTabs = document.getElementById("mobileAlunoDesafioTabsSlot");
    const slotLista = document.getElementById("mobileAlunoDesafioListaSlot");

    if (ativo) {
      if (tabs && slotTabs && tabs.parentElement !== slotTabs) {
        slotTabs.appendChild(tabs);
      }

      if (lista && slotLista && lista.parentElement !== slotLista) {
        slotLista.appendChild(lista);
      }

      return;
    }

    restaurarAposPlaceholder(tabs, desafioTabsPlaceholder);
    restaurarAposPlaceholder(lista, desafioListaPlaceholder);
  }

  function extrairNumeroRankingTexto(valor) {
    const match = String(valor || "").match(/(\d+(?:[.,]\d+)?)/);
    return match ? match[1].replace(",", ".") : "0";
  }

  function formatarPosicaoDesafio(valor) {
    const match = String(valor || "").match(/(\d+)/);
    if (!match) return "--";
    return `#${String(match[1]).padStart(2, "0")}`;
  }

  function sincronizarDesafioMobile() {
    const ativo = ehMobileAluno();
    moverConteudoDesafioMobile(ativo);

    if (!ativo) return;

    const lista = document.getElementById("rankingFullList");
    const tabs = document.getElementById("rankingFullTabs");
    const mesOriginal = document.getElementById("rankingMesAtual");
    const resumoOriginal = document.getElementById("rankingHomeResumo");

    const linhaAtual = lista?.querySelector(".ranking-row.is-you");
    const posicaoOriginal = linhaAtual?.querySelector(".ranking-position");
    const pontosOriginal = linhaAtual?.querySelector(".ranking-score-line");
    const tabAtiva = tabs?.querySelector(".ranking-tab.ativo");

    const tipoAtual = texto(tabAtiva, "Ranking");
    const posicao = formatarPosicaoDesafio(texto(posicaoOriginal, ""));
    const pontos = extrairNumeroRankingTexto(texto(pontosOriginal, "0"));
    const mensagem = texto(
      resumoOriginal,
      "Continue treinando para subir no ranking."
    );
    const mes = texto(mesOriginal, "Mês atual");

    const mobilePosicao = document.getElementById("mobileAlunoDesafioPosicao");
    const mobilePontos = document.getElementById("mobileAlunoDesafioPontos");
    const mobileMensagem = document.getElementById("mobileAlunoDesafioMensagem");
    const mobileMes = document.getElementById("mobileAlunoDesafioMes");
    const mobileTipo = document.getElementById("mobileAlunoDesafioTipoAtual");
    const mobilePosicaoLabel = document.getElementById(
      "mobileAlunoDesafioPosicaoLabel"
    );

    if (mobilePosicao) mobilePosicao.textContent = posicao;
    if (mobilePontos) mobilePontos.textContent = pontos;
    if (mobileMensagem) mobileMensagem.textContent = mensagem;
    if (mobileMes) mobileMes.textContent = mes;
    if (mobileTipo) mobileTipo.textContent = tipoAtual;

    if (mobilePosicaoLabel) {
      const tipo = tipoAtual.toLowerCase();
      mobilePosicaoLabel.textContent =
        tipo.includes("ranking das turmas")
          ? "Posição da sua turma"
          : "Sua posição";
    }
  }

  function prepararOrigemProgramaFaixa() {
    const lista = document.getElementById("programaFaixaLista");

    if (!programaListaPlaceholder && lista?.parentNode) {
      programaListaPlaceholder = document.createComment(
        "mensalize-programa-faixa-lista-origem"
      );
      lista.parentNode.insertBefore(programaListaPlaceholder, lista);
    }
  }

  function moverConteudoProgramaFaixaMobile(ativo) {
    prepararOrigemProgramaFaixa();

    const lista = document.getElementById("programaFaixaLista");
    const slot = document.getElementById("mobileAlunoProgramaListaSlot");

    if (ativo) {
      if (lista && slot && lista.parentElement !== slot) {
        slot.appendChild(lista);
      }
      return;
    }

    restaurarAposPlaceholder(lista, programaListaPlaceholder);
  }

  function sincronizarProgramaFaixaMobile() {
    const ativo = ehMobileAluno();
    moverConteudoProgramaFaixaMobile(ativo);

    if (!ativo) return;

    const badgeOriginal = document.getElementById("programaFaixaBadge");
    const resumoOriginal = document.getElementById("programaFaixaResumo");
    const lista = document.getElementById("programaFaixaLista");
    const menuOriginal = document.getElementById("menuProgramaFaixaAluno");
    const graduacaoOriginal = document.getElementById("inicioGraduacao");

    const badgeMobile = document.getElementById("mobileAlunoProgramaBadge");
    const jornadaMobile = document.getElementById("mobileAlunoProgramaJornada");
    const resumoMobile = document.getElementById("mobileAlunoProgramaResumo");
    const stats = document.getElementById("mobileAlunoProgramaStats");
    const categoriasMobile = document.getElementById(
      "mobileAlunoProgramaCategorias"
    );
    const conteudosMobile = document.getElementById(
      "mobileAlunoProgramaConteudos"
    );

    const badge = texto(badgeOriginal, "Sua jornada");
    const resumo = texto(
      resumoOriginal,
      "Veja o que seu professor separou para sua evolução."
    );
    const graduacao = texto(graduacaoOriginal, "Sua faixa");

    if (badgeMobile) badgeMobile.textContent = badge;
    if (jornadaMobile) {
      jornadaMobile.textContent =
        badge && badge !== "Sua jornada" ? badge : graduacao;
    }
    if (resumoMobile) resumoMobile.textContent = resumo;

    const categorias = lista
      ? lista.querySelectorAll(".programa-faixa-categoria").length
      : 0;
    const conteudos = lista
      ? lista.querySelectorAll(".programa-faixa-tecnica").length
      : 0;

    if (categoriasMobile) categoriasMobile.textContent = String(categorias);
    if (conteudosMobile) conteudosMobile.textContent = String(conteudos);

    const disponivel =
      !!menuOriginal && !menuOriginal.classList.contains("escondido");
    const temConteudo = categorias > 0 || conteudos > 0;

    stats?.classList.toggle("escondido", !disponivel || !temConteudo);
  }

  function prepararOrigemAvisos() {
    const lista = document.getElementById("avisosAlunoLista");

    if (!avisosListaPlaceholder && lista?.parentNode) {
      avisosListaPlaceholder = document.createComment(
        "mensalize-avisos-lista-origem"
      );
      lista.parentNode.insertBefore(avisosListaPlaceholder, lista);
    }
  }

  function moverConteudoAvisosMobile(ativo) {
    prepararOrigemAvisos();

    const lista = document.getElementById("avisosAlunoLista");
    const slot = document.getElementById("mobileAlunoAvisosListaSlot");

    if (ativo) {
      if (lista && slot && lista.parentElement !== slot) {
        slot.appendChild(lista);
      }
      return;
    }

    restaurarAposPlaceholder(lista, avisosListaPlaceholder);
  }

  function numeroAvisosContador(valor) {
    const match = String(valor || "").match(/(\d+)/);
    return match ? Number(match[1]) : 0;
  }

  function sincronizarAvisosMobile() {
    if (!ehMobileAluno()) return;

    if (avisosModoAtivo) {
      moverConteudoAvisosMobile(true);
    }

    const lista = document.getElementById("avisosAlunoLista");
    const contadorOriginal = document.getElementById("avisosAlunoContador");
    const contadorMobile = document.getElementById("mobileAlunoAvisosContador");
    const exibicaoMobile = document.getElementById("mobileAlunoAvisosExibicao");

    const destaque = document.getElementById("mobileAlunoAvisosDestaque");
    const vazio = document.getElementById("mobileAlunoAvisosVazioHero");
    const destaqueTipo = document.getElementById("mobileAlunoAvisosDestaqueTipo");
    const destaqueSelo = document.getElementById("mobileAlunoAvisosDestaqueSelo");
    const destaqueTitulo = document.getElementById("mobileAlunoAvisosDestaqueTitulo");
    const destaqueTexto = document.getElementById("mobileAlunoAvisosDestaqueTexto");
    const destaqueMeta = document.getElementById("mobileAlunoAvisosDestaqueMeta");

    const itens = lista
      ? Array.from(lista.querySelectorAll(".student-notice-item"))
      : [];

    const importante = itens.find((item) =>
      item.classList.contains("is-important")
    );
    const selecionado = importante || itens[0] || null;

    const contadorTexto = texto(contadorOriginal, "0 avisos");
    const total = numeroAvisosContador(contadorTexto);
    const exibidos = itens.length;

    if (contadorMobile) {
      contadorMobile.textContent = contadorTexto || "0 avisos";
    }

    if (exibicaoMobile) {
      if (total > exibidos && exibidos > 0) {
        exibicaoMobile.textContent =
          `${exibidos} mais recentes de ${total}`;
      } else if (exibidos > 0) {
        exibicaoMobile.textContent =
          `${exibidos} comunicado${exibidos === 1 ? "" : "s"}`;
      } else {
        exibicaoMobile.textContent = "Nenhum publicado";
      }
    }

    destaque?.classList.toggle("escondido", !selecionado);
    vazio?.classList.toggle("escondido", !!selecionado);

    if (!selecionado) return;

    const tipo = selecionado.querySelector(".notice-kind");
    const titulo = selecionado.querySelector("strong");
    const mensagem = selecionado.querySelector("p");
    const meta = selecionado.querySelector("small");
    const ehImportante = selecionado.classList.contains("is-important");

    destaque?.classList.toggle("is-important", ehImportante);

    if (destaqueTipo) {
      destaqueTipo.textContent = texto(
        tipo,
        ehImportante ? "Importante" : "Comunicado"
      );
    }

    if (destaqueSelo) {
      destaqueSelo.textContent = ehImportante
        ? "Importante"
        : "Mais recente";
    }

    if (destaqueTitulo) {
      destaqueTitulo.textContent = texto(titulo, "Novo aviso");
    }

    if (destaqueTexto) {
      destaqueTexto.textContent = texto(
        mensagem,
        "Veja os comunicados da sua academia."
      );
    }

    if (destaqueMeta) {
      destaqueMeta.textContent = texto(meta, "");
    }
  }

  function prepararOrigensContato() {
    const area = document.getElementById("areaContatoProfessor");
    const compartilhar = document.getElementById("btnCompartilhar");

    if (!contatoAreaPlaceholder && area?.parentNode) {
      contatoAreaPlaceholder = document.createComment(
        "mensalize-contato-area-origem"
      );
      area.parentNode.insertBefore(contatoAreaPlaceholder, area);
    }

    if (!contatoCompartilharPlaceholder && compartilhar?.parentNode) {
      contatoCompartilharPlaceholder = document.createComment(
        "mensalize-contato-compartilhar-origem"
      );
      compartilhar.parentNode.insertBefore(
        contatoCompartilharPlaceholder,
        compartilhar
      );
    }
  }

  function moverConteudoContatoMobile(ativo) {
    prepararOrigensContato();

    const area = document.getElementById("areaContatoProfessor");
    const compartilhar = document.getElementById("btnCompartilhar");
    const areaSlot = document.getElementById(
      "mobileAlunoContatoProfessorSlot"
    );
    const compartilharSlot = document.getElementById(
      "mobileAlunoContatoCompartilharSlot"
    );

    if (ativo) {
      if (area && areaSlot && area.parentElement !== areaSlot) {
        areaSlot.appendChild(area);
      }

      if (
        compartilhar &&
        compartilharSlot &&
        compartilhar.parentElement !== compartilharSlot
      ) {
        compartilharSlot.appendChild(compartilhar);
      }

      return;
    }

    restaurarAposPlaceholder(area, contatoAreaPlaceholder);
    restaurarAposPlaceholder(
      compartilhar,
      contatoCompartilharPlaceholder
    );
  }

  function sincronizarContatoMobile() {
    if (!ehMobileAluno()) return;

    const ativo = obterViewAtiva() === "contato";
    moverConteudoContatoMobile(ativo);

    const academia = document.getElementById("mobileAlunoContatoAcademia");
    const status = document.getElementById("mobileAlunoContatoStatus");
    const descricao = document.getElementById(
      "mobileAlunoContatoDescricao"
    );
    const area = document.getElementById("areaContatoProfessor");

    if (academia) {
      academia.textContent = texto(
        document.getElementById("nomeAcademia"),
        "Mensalize"
      );
    }

    const temWhatsApp = !!area?.querySelector(
      'a[href*="wa.me"], a[href*="whatsapp"]'
    );

    if (status) {
      status.textContent = temWhatsApp
        ? "WhatsApp disponível"
        : "Não cadastrado";
      status.classList.remove("is-available", "is-unavailable");
      status.classList.add(
        temWhatsApp ? "is-available" : "is-unavailable"
      );
    }

    if (descricao) {
      descricao.textContent = temWhatsApp
        ? "Abra uma conversa direta pelo canal configurado pela academia."
        : "O professor ainda não cadastrou um WhatsApp para contato.";
    }
  }

  function prepararOrigensFinanceiro() {
    const areaPagamento = document.getElementById("areaPagamento");
    const listaPagamentos = document.getElementById("listaPagamentos");

    if (!financeiroAreaOrigem && areaPagamento?.parentElement) {
      financeiroAreaOrigem = areaPagamento.parentElement;
    }

    if (!financeiroHistoricoOrigem && listaPagamentos?.parentElement) {
      financeiroHistoricoOrigem = listaPagamentos.parentElement;
    }
  }

  function moverConteudoFinanceiroMobile(ativo) {
    prepararOrigensFinanceiro();

    const areaPagamento = document.getElementById("areaPagamento");
    const listaPagamentos = document.getElementById("listaPagamentos");
    const slotPagamento = document.getElementById("mobileAlunoPagamentoSlot");
    const slotHistorico = document.getElementById("mobileAlunoHistoricoSlot");

    if (ativo) {
      if (areaPagamento && slotPagamento && areaPagamento.parentElement !== slotPagamento) {
        slotPagamento.appendChild(areaPagamento);
      }

      if (listaPagamentos && slotHistorico && listaPagamentos.parentElement !== slotHistorico) {
        slotHistorico.appendChild(listaPagamentos);
      }
      return;
    }

    if (areaPagamento && financeiroAreaOrigem && areaPagamento.parentElement !== financeiroAreaOrigem) {
      financeiroAreaOrigem.appendChild(areaPagamento);
    }

    if (listaPagamentos && financeiroHistoricoOrigem && listaPagamentos.parentElement !== financeiroHistoricoOrigem) {
      financeiroHistoricoOrigem.appendChild(listaPagamentos);
    }
  }

  function sincronizarFinanceiroMobile() {
    const ativo = ehMobileAluno();
    moverConteudoFinanceiroMobile(ativo);

    if (!ativo) return;

    const titulo = texto(document.getElementById("statusTitulo"), "Carregando status...");
    const mensagem = texto(
      document.getElementById("mensagemStatus"),
      "Aguarde enquanto buscamos seus dados."
    );
    const badge = texto(document.getElementById("badgeStatus"), "Status");
    const valor = texto(document.getElementById("valorMensalidade"), "R$ 0,00");
    const vencimento = texto(document.getElementById("textoVencimento"), "--/--/----");
    const contador = texto(document.getElementById("contadorPagamentos"), "0 registros");

    const mobileTitulo = document.getElementById("mobileAlunoFinanceiroTitulo");
    const mobileMensagem = document.getElementById("mobileAlunoFinanceiroMensagem");
    const mobileBadge = document.getElementById("mobileAlunoFinanceiroStatusBadge");
    const mobileValor = document.getElementById("mobileAlunoFinanceiroValor");
    const mobileVencimento = document.getElementById("mobileAlunoFinanceiroVencimento");
    const mobileContador = document.getElementById("mobileAlunoContadorPagamentos");

    if (mobileTitulo) mobileTitulo.textContent = titulo;
    if (mobileMensagem) mobileMensagem.textContent = mensagem;
    if (mobileValor) mobileValor.textContent = valor;
    if (mobileVencimento) mobileVencimento.textContent = vencimento;
    if (mobileContador) mobileContador.textContent = contador;

    if (mobileBadge) {
      mobileBadge.textContent = badge;
      mobileBadge.classList.remove("status-ok", "status-alerta", "status-erro");

      const classe = classeStatusFinanceiro(`${badge} ${titulo}`);
      if (classe) mobileBadge.classList.add(classe);
    }
  }

  function sincronizarAvisos() {
    const card = document.getElementById("mobileAlunoAvisoDestaque");
    const titulo = document.getElementById("mobileAlunoAvisoTitulo");
    const mensagem = document.getElementById("mobileAlunoAvisoTexto");
    const resumo = document.getElementById("mobileAlunoAvisosResumo");

    const listaOriginal = document.getElementById("avisosAlunoLista");
    const primeiro = listaOriginal?.querySelector(".student-notice-item");
    const contador = document.getElementById("avisosAlunoContador");

    const contadorTexto = texto(contador, "");
    if (resumo) {
      resumo.textContent = contadorTexto && contadorTexto !== "0 avisos"
        ? contadorTexto
        : "Ver comunicados";
    }

    if (!card) return;

    if (!primeiro) {
      card.classList.add("escondido");
      return;
    }

    const tituloOriginal = primeiro.querySelector("strong");
    const mensagemOriginal = primeiro.querySelector("p");

    if (titulo) titulo.textContent = texto(tituloOriginal, "Novo aviso");
    if (mensagem) mensagem.textContent = texto(
      mensagemOriginal,
      "Veja os comunicados da sua academia."
    );

    card.classList.remove("escondido");
  }

  function normalizarTelefonePerfil(valor) {
    const bruto = String(valor || "").trim();
    return bruto || "Telefone não informado";
  }

  function dadosAlunoPerfilMobile() {
    try {
      return typeof alunoAtual !== "undefined" && alunoAtual
        ? alunoAtual
        : {};
    } catch {
      return {};
    }
  }

  function formatarDataPerfilMobile(valor, fallback = "Não informada") {
    const bruto = String(valor || "").trim();
    if (!bruto) return fallback;

    const iso = bruto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

    const data = new Date(bruto);
    if (Number.isNaN(data.getTime())) return fallback;

    return new Intl.DateTimeFormat("pt-BR").format(data);
  }

  function statusPerfilMobile(valor) {
    const normalizado = String(valor || "ativo").trim().toLowerCase();

    if (normalizado === "inativo") {
      return { texto: "Inativo", classe: "is-inativo" };
    }

    if (normalizado === "pausado") {
      return { texto: "Pausado", classe: "is-pausado" };
    }

    return { texto: "Ativo", classe: "is-ativo" };
  }

  function turmaPerfilMobile() {
    const subtitulo = texto(
      document.getElementById("subtituloAlunoTopo"),
      "Não informada"
    );

    return subtitulo.replace(/^Turma\s+/i, "").trim() || "Não informada";
  }

  function sincronizarMensagemPerfilMobile() {
    const original = document.getElementById("msgPerfilAluno");
    const mobile = document.getElementById("mobileAlunoPerfilMensagem");
    const botao = document.getElementById("btnMobileAlunoPerfilSalvar");

    if (!mobile) return;

    const mensagem = texto(original, "");
    const erro = original?.classList.contains("is-error") === true;
    const salvando = /salvando/i.test(mensagem);

    if (botao) botao.disabled = salvando;

    mobile.textContent = mensagem;
    mobile.classList.toggle("escondido", !mensagem);
    mobile.classList.toggle("is-error", erro);
  }

  function sincronizarMensagemFotoPerfilMobile() {
    const original = document.getElementById("msgFotoAluno");
    const mobile = document.getElementById("mobileAlunoPerfilFotoMensagem");

    if (!mobile) return;

    const mensagem = texto(original, "");
    const erro = original?.classList.contains("is-error") === true;

    mobile.textContent = mensagem;
    mobile.classList.toggle("escondido", !mensagem);
    mobile.classList.toggle("is-error", erro);
  }

  function sincronizarPerfilMobile() {
    if (!ehMobileAluno()) return;

    const dadosAluno = dadosAlunoPerfilMobile();
    const nomeTopo = document.getElementById("nomeAlunoTopo");
    const academia = document.getElementById("nomeAcademia");
    const graduacao = document.getElementById("inicioGraduacao");
    const perfilNomeOriginal = document.getElementById("perfilAlunoNome");
    const perfilTelefoneOriginal = document.getElementById("perfilAlunoTelefone");
    const perfilNascimentoOriginal = document.getElementById("perfilAlunoNascimento");
    const perfilResponsavelOriginal = document.getElementById("perfilAlunoResponsavel");
    const perfilResponsavelWhatsappOriginal = document.getElementById(
      "perfilAlunoResponsavelWhatsApp"
    );
    const fotoOriginal = document.getElementById("fotoAlunoPerfil")
      || document.getElementById("fotoAlunoTopo");
    const avatarOriginal = document.getElementById("avatarAlunoPerfil")
      || document.getElementById("avatarAlunoTopo");

    const nome = String(perfilNomeOriginal?.value || texto(nomeTopo, "Aluno")).trim()
      || "Aluno";
    const telefone = String(perfilTelefoneOriginal?.value || "").trim();

    const heroNome = document.getElementById("mobileAlunoPerfilNomeHero");
    const heroTelefone = document.getElementById("mobileAlunoPerfilTelefoneHero");
    const inputNome = document.getElementById("mobileAlunoPerfilNome");
    const inputTelefone = document.getElementById("mobileAlunoPerfilTelefone");

    const mobileAcademia = document.getElementById("mobileAlunoPerfilAcademia");
    const mobileTurma = document.getElementById("mobileAlunoPerfilTurma");
    const mobileGraduacao = document.getElementById("mobileAlunoPerfilGraduacao");
    const mobileInicio = document.getElementById("mobileAlunoPerfilInicioAcademia");
    const mobileStatus = document.getElementById("mobileAlunoPerfilStatus");
    const mobileNascimento = document.getElementById("mobileAlunoPerfilNascimento");

    const responsavelSecao = document.getElementById(
      "mobileAlunoPerfilResponsavelSecao"
    );
    const mobileResponsavelNome = document.getElementById(
      "mobileAlunoPerfilResponsavelNome"
    );
    const mobileResponsavelWhatsapp = document.getElementById(
      "mobileAlunoPerfilResponsavelWhatsapp"
    );

    const mobileFoto = document.getElementById("mobileAlunoPerfilFoto");
    const mobileAvatar = document.getElementById("mobileAlunoPerfilAvatar");

    if (heroNome) heroNome.textContent = nome;
    if (heroTelefone) {
      heroTelefone.textContent = normalizarTelefonePerfil(telefone);
    }

    // Não sobrescreve enquanto o aluno está digitando.
    if (inputNome && document.activeElement !== inputNome) {
      inputNome.value = nome;
    }

    if (inputTelefone && document.activeElement !== inputTelefone) {
      inputTelefone.value = telefone;
    }

    if (mobileAcademia) {
      mobileAcademia.textContent = texto(academia, "Mensalize");
    }

    if (mobileTurma) {
      mobileTurma.textContent = turmaPerfilMobile();
    }

    if (mobileGraduacao) {
      mobileGraduacao.textContent = texto(graduacao, "Não informada");
    }

    if (mobileInicio) {
      mobileInicio.textContent = formatarDataPerfilMobile(
        dadosAluno.data_inicio_academia,
        "Não informado"
      );
    }

    if (mobileNascimento) {
      mobileNascimento.textContent = formatarDataPerfilMobile(
        perfilNascimentoOriginal?.value || dadosAluno.data_nascimento,
        "Não informada"
      );
    }

    if (mobileStatus) {
      const status = statusPerfilMobile(dadosAluno.status_aluno);
      mobileStatus.textContent = status.texto;
      mobileStatus.classList.remove("is-ativo", "is-pausado", "is-inativo");
      mobileStatus.classList.add(status.classe);
    }

    const responsavelNome = String(
      perfilResponsavelOriginal?.value || dadosAluno.responsavel_nome || ""
    ).trim();
    const responsavelWhatsapp = String(
      perfilResponsavelWhatsappOriginal?.value
        || dadosAluno.responsavel_whatsapp
        || ""
    ).trim();
    const temResponsavel = !!(responsavelNome || responsavelWhatsapp);

    responsavelSecao?.classList.toggle("escondido", !temResponsavel);

    if (mobileResponsavelNome) {
      mobileResponsavelNome.textContent = responsavelNome || "Não informado";
    }

    if (mobileResponsavelWhatsapp) {
      mobileResponsavelWhatsapp.textContent =
        responsavelWhatsapp || "Não informado";
    }

    const src = String(fotoOriginal?.getAttribute("src") || "").trim();
    const fotoVisivel = !!src && !fotoOriginal?.classList.contains("escondido");

    if (mobileFoto) {
      if (fotoVisivel) {
        mobileFoto.src = src;
        mobileFoto.classList.remove("escondido");
      } else {
        mobileFoto.removeAttribute("src");
        mobileFoto.classList.add("escondido");
      }
    }

    if (mobileAvatar) {
      mobileAvatar.textContent = texto(avatarOriginal, inicialNome(nome));
      mobileAvatar.classList.toggle("escondido", fotoVisivel);
    }

    sincronizarMensagemPerfilMobile();
    sincronizarMensagemFotoPerfilMobile();
  }

  function salvarPerfilMobile(event) {
    event.preventDefault();

    const mobileNome = document.getElementById("mobileAlunoPerfilNome");
    const mobileTelefone = document.getElementById("mobileAlunoPerfilTelefone");
    const originalNome = document.getElementById("perfilAlunoNome");
    const originalTelefone = document.getElementById("perfilAlunoTelefone");
    const formOriginal = document.getElementById("formPerfilAluno");
    const mensagemMobile = document.getElementById("mobileAlunoPerfilMensagem");

    if (!mobileNome || !mobileTelefone || !originalNome || !originalTelefone || !formOriginal) {
      if (mensagemMobile) {
        mensagemMobile.textContent = "Não foi possível abrir seus dados agora.";
        mensagemMobile.classList.remove("escondido");
        mensagemMobile.classList.add("is-error");
      }
      return;
    }

    originalNome.value = mobileNome.value.trim();
    originalTelefone.value = mobileTelefone.value.trim();

    // O submit original continua sendo a única fonte da regra de negócio/RPC.
    if (typeof formOriginal.requestSubmit === "function") {
      formOriginal.requestSubmit();
    } else {
      formOriginal.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true })
      );
    }

    window.setTimeout(sincronizarMensagemPerfilMobile, 0);
  }

  function abrirFotoPerfilMobile() {
    const botaoOriginal = document.getElementById("btnSalvarFotoAluno");

    if (botaoOriginal) {
      botaoOriginal.click();
      return;
    }

    document.getElementById("inputFotoAluno")?.click();
  }

  function sincronizarPrograma() {
    const original = document.getElementById("menuProgramaFaixaAluno");
    const card = document.getElementById("mobileAlunoProgramaCard");
    const row = document.getElementById("mobileAlunoProgramaRow");
    const evolucao = document.getElementById("mobileAlunoEvolucaoPrograma");

    const disponivel = !!original && !original.classList.contains("escondido");

    card?.classList.toggle("escondido", !disponivel);
    row?.classList.toggle("escondido", !disponivel);
    evolucao?.classList.toggle("escondido", !disponivel);
  }

  function sincronizarTudo() {
    if (!ehMobileAluno()) {
      restaurarConteudosDesktopAluno();
      return;
    }

    sincronizarEstadoPortal();
    sincronizarIdentidade();
    sincronizarResumo();
    sincronizarFinanceiroMobile();
    sincronizarEvolucaoMobile();
    sincronizarSolicitacoesMobile();
    sincronizarDesafioMobile();
    sincronizarPerfilMobile();
    sincronizarAvisos();
    sincronizarAvisosMobile();
    sincronizarPrograma();
    sincronizarProgramaFaixaMobile();
    sincronizarContatoMobile();
    atualizarShell(obterViewAtiva());
    configurarCarousel();

    if (carouselPodeRodar()) agendarCarouselAutomatico();
    else pararCarouselAutomatico();
  }

  function aplicarModoAvisosMobile() {
    if (!ehMobileAluno()) return;

    solicitacoesModoAtivo = false;
    avisosModoAtivo = true;

    document.body.classList.remove("mobile-aluno-solicitacoes-mode");
    document.body.classList.add(
      "mobile-aluno-avisos-mode",
      "mobile-aluno-interna"
    );

    moverConteudoAvisosMobile(true);
    sincronizarAvisosMobile();
    atualizarShell("inicio");
    pararCarouselAutomatico();
  }

  function abrirAvisos() {
    if (!ehMobileAluno()) return;

    // Ativa o modo ANTES de qualquer troca de view para evitar que callbacks
    // intermediários devolvam a Home comum.
    solicitacoesModoAtivo = false;
    avisosModoAtivo = true;

    document.body.classList.remove("mobile-aluno-solicitacoes-mode");
    document.body.classList.add(
      "mobile-aluno-avisos-mode",
      "mobile-aluno-interna"
    );

    clicarMenuOriginal("inicio");
    fecharMais();

    // Montagem imediata.
    aplicarModoAvisosMobile();
    rolarTopo();

    // Reforço após os handlers originais e MutationObservers concluírem.
    window.requestAnimationFrame(() => {
      aplicarModoAvisosMobile();

      window.requestAnimationFrame(() => {
        aplicarModoAvisosMobile();
        rolarTopo();
      });
    });
  }

  function abrirSolicitacoes() {
    abrirViewMobile("graduacao", { solicitacoes: true });

    window.setTimeout(() => {
      sincronizarSolicitacoesMobile();
      moverSolicitacoesEvolucaoMobile(true);
      rolarTopo();
    }, 80);
  }

  function sair() {
    const botaoOriginal = document.getElementById("btnEsquecerAcessoAluno");
    if (botaoOriginal) {
      botaoOriginal.click();
      fecharMais();
    }
  }

  function configurarAcoes() {
    document.addEventListener("click", (event) => {
      if (!ehMobileAluno()) return;

      const fechar = event.target.closest("[data-mobile-aluno-sheet-close]");
      if (fechar) {
        fecharMais();
        return;
      }

      const abrirSolicitacao = event.target.closest(
        "[data-mobile-solicitacao-abrir]"
      );

      if (abrirSolicitacao) {
        const tipo = abrirSolicitacao.dataset.mobileSolicitacaoAbrir;
        const card = document.querySelector(
          `#viewGraduacaoAluno [data-request-card="${tipo}"]`
        );
        const toggle = card?.querySelector("[data-request-toggle]");

        if (card && !card.classList.contains("request-open")) {
          toggle?.click();
        }

        window.setTimeout(() => {
          const main = document.querySelector(
            "#portalConteudo .student-main"
          );

          if (!main || !card) return;

          const top = Math.max(0, card.offsetTop - 12);

          try {
            main.scrollTo({ top, behavior: "smooth" });
          } catch (_) {
            main.scrollTop = top;
          }
        }, 40);

        return;
      }

      const botaoView = event.target.closest("[data-mobile-aluno-view]");
      if (botaoView) {
        abrirViewMobile(botaoView.dataset.mobileAlunoView);
        return;
      }

      const botaoAcao = event.target.closest("[data-mobile-aluno-action]");
      if (!botaoAcao) return;

      const acao = botaoAcao.dataset.mobileAlunoAction;

      if (acao === "mais") {
        abrirMais();
        return;
      }

      if (acao === "avisos") {
        abrirAvisos();
        return;
      }

      if (acao === "solicitacoes") {
        abrirSolicitacoes();
        return;
      }

      if (acao === "sair") {
        sair();
      }
    });

    document.getElementById("btnMobileAlunoMais")?.addEventListener("click", abrirMais);
    document.getElementById("btnMobileAlunoMaisInterno")?.addEventListener("click", abrirMais);

    // Binding explícito para Avisos. Não depende apenas do roteador delegado.
    document
      .querySelectorAll('[data-mobile-aluno-action="avisos"]')
      .forEach((botao) => {
        if (botao.dataset.mobileAvisosBound === "true") return;

        botao.dataset.mobileAvisosBound = "true";
        botao.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          abrirAvisos();
        });
      });

    document.getElementById("btnMobileAlunoVoltar")?.addEventListener("click", () => {
      if (avisosModoAtivo) {
        abrirViewMobile("inicio");
        return;
      }

      if (solicitacoesModoAtivo) {
        abrirViewMobile("graduacao");
        return;
      }

      abrirViewMobile("inicio");
    });

    document.getElementById("mobileAlunoPerfilForm")?.addEventListener(
      "submit",
      salvarPerfilMobile
    );

    document.getElementById("btnMobileAlunoPerfilFoto")?.addEventListener(
      "click",
      abrirFotoPerfilMobile
    );

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") fecharMais();
    });
  }

  function configurarObservadores() {
    const portal = document.getElementById("portalConteudo");

    if (portal) {
      const obsPortal = new MutationObserver(sincronizarTudo);
      obsPortal.observe(portal, {
        attributes: true,
        attributeFilter: ["class"]
      });
      observadores.push(obsPortal);
    }

    const elementos = [
      "nomeAlunoTopo",
      "nomeAcademia",
      "fotoAlunoTopo",
      "avatarAlunoTopo",
      "fotoAlunoPerfil",
      "avatarAlunoPerfil",
      "subtituloAlunoTopo",
      "inicioStatusMensalidade",
      "inicioVencimento",
      "inicioGraduacao",
      "inicioAvaliacao",
      "rankingHomeResumo",
      "rankingFullTabs",
      "rankingFullList",
      "rankingMesAtual",
      "statusTitulo",
      "mensagemStatus",
      "badgeStatus",
      "valorMensalidade",
      "textoVencimento",
      "contadorPagamentos",
      "areaPagamento",
      "areaContatoProfessor",
      "btnCompartilhar",
      "listaPagamentos",
      "conteudoEvolucaoAluno",
      "badgeEvolucao",
      "msgPerfilAluno",
      "msgFotoAluno",
      "msgSolicitarGraduacao",
      "msgSolicitarTurma",
      "avisosAlunoContador",
      "avisosAlunoLista",
      "menuProgramaFaixaAluno",
      "programaFaixaBadge",
      "programaFaixaResumo",
      "programaFaixaLista"
    ];

    elementos.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const obs = new MutationObserver(sincronizarTudo);
      obs.observe(el, {
        attributes: true,
        attributeFilter: ["class", "src"],
        childList: true,
        characterData: true,
        subtree: true
      });

      observadores.push(obs);
    });

    document.querySelectorAll("#portalConteudo .student-view").forEach((view) => {
      const obs = new MutationObserver(() => {
        if (!view.classList.contains("ativa")) return;
        atualizarShell(viewPorId[view.id] || "inicio");
        sincronizarContatoMobile();
      });

      obs.observe(view, {
        attributes: true,
        attributeFilter: ["class"]
      });

      observadores.push(obs);
    });
  }

  function restaurarConteudosDesktopAluno() {
    pararCarouselAutomatico();
    fecharMais();

    solicitacoesModoAtivo = false;
    avisosModoAtivo = false;
    document.body.classList.remove(
      "mobile-aluno-solicitacoes-mode",
      "mobile-aluno-avisos-mode"
    );

    // Elementos funcionais reais que são movidos para slots mobile.
    moverConteudoAvisosMobile(false);
    moverConteudoContatoMobile(false);
    moverConteudoFinanceiroMobile(false);
    moverSolicitacoesEvolucaoMobile(false);
    moverConteudoDesafioMobile(false);
    moverConteudoProgramaFaixaMobile(false);

    document.body.classList.remove(
      "mobile-aluno-portal-ativo",
      "mobile-aluno-interna",
      "mobile-aluno-sheet-open"
    );
  }

  function configurarViewport() {
    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);

    const aoMudar = () => {
      if (media.matches) {
        sincronizarTudo();
        return;
      }

      restaurarConteudosDesktopAluno();

      // Segunda passagem após o navegador concluir o recálculo do breakpoint.
      window.requestAnimationFrame(() => {
        moverConteudoAvisosMobile(false);
        moverConteudoContatoMobile(false);
        moverConteudoFinanceiroMobile(false);
        moverSolicitacoesEvolucaoMobile(false);
        moverConteudoDesafioMobile(false);
        moverConteudoProgramaFaixaMobile(false);
      });
    };

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", aoMudar);
    } else if (typeof media.addListener === "function") {
      media.addListener(aoMudar);
    }
  }

  function iniciar() {
    if (!document.getElementById("portalConteudo")) return;

    configurarAcoes();
    configurarObservadores();
    configurarViewport();

    document.getElementById("perfilAlunoNome")?.addEventListener(
      "input",
      sincronizarPerfilMobile
    );
    document.getElementById("perfilAlunoTelefone")?.addEventListener(
      "input",
      sincronizarPerfilMobile
    );
    document.getElementById("perfilAlunoNascimento")?.addEventListener(
      "input",
      sincronizarPerfilMobile
    );
    document.getElementById("perfilAlunoResponsavel")?.addEventListener(
      "input",
      sincronizarPerfilMobile
    );
    document.getElementById("perfilAlunoResponsavelWhatsApp")?.addEventListener(
      "input",
      sincronizarPerfilMobile
    );

    sincronizarTudo();

    window.addEventListener("pageshow", sincronizarTudo);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        pararCarouselAutomatico();
        return;
      }

      sincronizarTudo();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }

  window.MensalizeMobileAluno = {
    atualizar: sincronizarTudo,
    abrirView: abrirViewMobile,
    abrirAvisos,
    abrirMais,
    fecharMais
  };
})();
