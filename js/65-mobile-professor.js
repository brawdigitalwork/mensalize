// 65. MENSALIZE PROFESSOR — EXPERIÊNCIA MOBILE
// ============================================================================
// Camada exclusiva de UX mobile.
// Não duplica regras de negócio: reutiliza abrirViewPrincipal(), modais Pro,
// cobrança, Central de Relatórios, notificações e dados já calculados no app.
// ============================================================================

(function inicializarCamadaMobileProfessor() {
  const MOBILE_BREAKPOINT = 760;
  const mapaTitulos = {
    dashboard: "Início",
    alunos: "Alunos",
    financeiro: "Financeiro",
    desafio: "Desafio",
    evolucao: "Graduação",
    presencas: "Presenças",
    turmas: "Turmas",
    avisos: "Avisos",
    solicitacoes: "Solicitações",
    aniversariantes: "Aniversariantes",
    programaFight: "Programa de Graduação",
    perfil: "Configurações"
  };

  let viewAtualMobile = "dashboard";
  let observadoresMobile = [];
  let acaoContextualMobileAtual = null;

  function ehMobileProfessor() {
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
  }

  function obterConteudoRolavelMobile() {
    return document.querySelector(".conteudo-app");
  }

  function rolarConteudoMobileTopo(behavior = "auto") {
    if (!ehMobileProfessor()) return;

    const conteudo = obterConteudoRolavelMobile();
    if (!conteudo) return;

    try {
      conteudo.scrollTo({ top: 0, left: 0, behavior });
    } catch (_) {
      conteudo.scrollTop = 0;
    }
  }

  function definirIconeAcaoContextualMobile(botao, tipo) {
    if (!botao) return;

    const icones = {
      adicionar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
      relatorios: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>'
    };

    botao.innerHTML = icones[tipo] || icones.adicionar;
  }

  function atualizarAcaoContextualMobile(view = viewAtualMobile) {
    const botao = document.getElementById("btnMobileAcaoContextual");
    if (!botao) return;

    acaoContextualMobileAtual = null;
    botao.classList.add("escondido");
    botao.removeAttribute("data-mobile-context-action");

    if (view === "alunos") {
      acaoContextualMobileAtual = "novo-aluno";
      botao.dataset.mobileContextAction = acaoContextualMobileAtual;
      botao.setAttribute("aria-label", "Cadastrar novo aluno");
      botao.setAttribute("title", "Novo aluno");
      definirIconeAcaoContextualMobile(botao, "adicionar");
      botao.classList.remove("escondido");
      return;
    }

    if (view === "financeiro") {
      acaoContextualMobileAtual = "relatorios";
      botao.dataset.mobileContextAction = acaoContextualMobileAtual;
      botao.setAttribute("aria-label", "Abrir relatórios financeiros");
      botao.setAttribute("title", "Relatórios");
      definirIconeAcaoContextualMobile(botao, "relatorios");
      botao.classList.remove("escondido");
      return;
    }

    if (view === "turmas") {
      acaoContextualMobileAtual = "nova-turma";
      botao.dataset.mobileContextAction = acaoContextualMobileAtual;
      botao.setAttribute("aria-label", "Cadastrar nova turma");
      botao.setAttribute("title", "Nova turma");
      definirIconeAcaoContextualMobile(botao, "adicionar");
      botao.classList.remove("escondido");
      return;
    }

    if (view === "avisos") {
      acaoContextualMobileAtual = "novo-aviso";
      botao.dataset.mobileContextAction = acaoContextualMobileAtual;
      botao.setAttribute("aria-label", "Publicar novo aviso");
      botao.setAttribute("title", "Novo aviso");
      definirIconeAcaoContextualMobile(botao, "adicionar");
      botao.classList.remove("escondido");
    }
  }

  function executarAcaoContextualMobile() {
    if (acaoContextualMobileAtual === "novo-aluno") {
      const botaoOriginal = document.getElementById("btnMostrarForm");
      if (botaoOriginal) {
        botaoOriginal.click();
        return;
      }

      const botaoNavegacao = document.getElementById("btnNavCadastrar");
      if (botaoNavegacao) botaoNavegacao.click();
      return;
    }

    if (acaoContextualMobileAtual === "relatorios") {
      const botaoOriginal = document.getElementById("btnExportar");
      if (botaoOriginal) {
        botaoOriginal.click();
        return;
      }

      if (typeof abrirCentralRelatorios === "function") abrirCentralRelatorios();
      return;
    }

    if (acaoContextualMobileAtual === "nova-turma") {
      const botaoOriginal = document.getElementById("btnAbrirFormTurma");
      if (botaoOriginal) botaoOriginal.click();
      return;
    }

    if (acaoContextualMobileAtual === "novo-aviso") {
      const botaoOriginal = document.getElementById("btnNovoAviso");
      if (botaoOriginal) botaoOriginal.click();
    }
  }

  function textoSeguro(valor, fallback = "") {
    const texto = String(valor ?? "").trim();
    return texto || fallback;
  }

  function primeiraParteNome(valor) {
    const texto = textoSeguro(valor);
    if (!texto) return "Professor";

    const semEmail = texto.includes("@") ? texto.split("@")[0] : texto;
    const limpo = semEmail
      .replace(/[._-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!limpo) return "Professor";

    const primeira = limpo.split(" ")[0];
    return primeira.charAt(0).toUpperCase() + primeira.slice(1).toLowerCase();
  }

  function obterNomeProfessorMobile() {
    try {
      const metadados = typeof usuarioAtual !== "undefined" ? usuarioAtual?.user_metadata : null;
      const nomeMetadado = metadados?.full_name || metadados?.name || metadados?.nome;
      if (nomeMetadado) return primeiraParteNome(nomeMetadado);

      const emailAtual = typeof usuarioAtual !== "undefined" ? usuarioAtual?.email : "";
      if (emailAtual) return primeiraParteNome(emailAtual);
    } catch (erro) {
      console.warn("[Mensalize Mobile] Não foi possível ler nome do usuário:", erro);
    }

    return primeiraParteNome(document.getElementById("emailUsuario")?.textContent || "Professor");
  }

  function obterAcademiaMobile() {
    const origemDashboard = document.getElementById("nomeClienteDashboard")?.textContent;
    if (textoSeguro(origemDashboard) && origemDashboard.trim().toLowerCase() !== "mensalize") {
      return origemDashboard.trim();
    }

    try {
      if (typeof nomeEmpresa !== "undefined" && textoSeguro(nomeEmpresa)) return String(nomeEmpresa).trim();
    } catch (_) {}

    return textoSeguro(origemDashboard, "Mensalize");
  }

  function atualizarIdentidadeMobile() {
    const nome = obterNomeProfessorMobile();
    const academia = obterAcademiaMobile();

    const nomeEl = document.getElementById("mobileProfessorNome");
    const academiaEl = document.getElementById("mobileProfessorAcademia");
    const academiaTopoEl = document.getElementById("mobileProfessorAcademiaTopo");

    if (nomeEl) nomeEl.textContent = nome;
    if (academiaEl) academiaEl.textContent = academia;
    if (academiaTopoEl) academiaTopoEl.textContent = academia;
  }

  function atualizarMesAtualMobile() {
    const el = document.getElementById("mobileProfessorMesAtual");
    if (!el) return;

    const texto = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric"
    }).format(new Date());

    el.textContent = texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function copiarTexto(origemId, destinoId, fallback = "") {
    const origem = document.getElementById(origemId);
    const destino = document.getElementById(destinoId);
    if (!destino) return;
    destino.textContent = textoSeguro(origem?.textContent, fallback);
  }

  function atualizarMetricasMobile() {
    copiarTexto("totalRecebido", "mobileProfessorRecebido", "R$ 0,00");
    copiarTexto("totalAReceber", "mobileProfessorAReceber", "R$ 0,00");
    copiarTexto("totalAtrasados", "mobileProfessorAtrasados", "0");

    const totalAlunosOrigem = textoSeguro(document.getElementById("totalAlunos")?.textContent, "0");
    const totalAlunosDestino = document.querySelector("#mobileProfessorTotalAlunos strong");
    if (totalAlunosDestino) totalAlunosDestino.textContent = totalAlunosOrigem;
  }

  function numeroNotificacoesMobile() {
    const card = document.getElementById("centralNotificacoesCard");
    const porDataset = Number(card?.dataset?.totalAtencao || card?.dataset?.totalNotificacoes || 0);
    if (Number.isFinite(porDataset) && porDataset > 0) return porDataset;

    const texto = document.getElementById("centralNotificacoesContador")?.textContent || "";
    const numero = Number(String(texto).match(/\d+/)?.[0] || 0);
    return Number.isFinite(numero) ? numero : 0;
  }

  function atualizarNotificacoesMobile() {
    const badge = document.getElementById("mobileProfessorNotificacoesBadge");
    const listaDestino = document.getElementById("mobileProfessorNotificacoesLista");
    const listaOrigem = document.getElementById("centralNotificacoesLista");
    const total = numeroNotificacoesMobile();

    if (badge) {
      badge.textContent = total > 99 ? "99+" : String(total);
      badge.classList.toggle("escondido", total <= 0);
    }

    if (listaDestino && listaOrigem) {
      listaDestino.innerHTML = listaOrigem.innerHTML || '<div class="mobile-empty-state">Nenhuma notificação no momento.</div>';
    }
  }

  function atualizarProximaAcaoMobile() {
    copiarTexto("dashboardAcaoPrincipalTitulo", "mobileProfessorProximaAcaoTitulo", "Sua operação está em análise");
    copiarTexto(
      "dashboardAcaoPrincipalDescricao",
      "mobileProfessorProximaAcaoDescricao",
      "O Mensalize está verificando o que precisa da sua atenção."
    );

    const origemIcone = document.getElementById("dashboardAcaoPrincipalIcone");
    const destinoIcone = document.getElementById("mobileProfessorProximaAcaoIcone");
    if (destinoIcone) destinoIcone.textContent = textoSeguro(origemIcone?.textContent, "✨");
  }

  function viewAtivaNoDom() {
    const ativa = document.querySelector(".view-app.ativa");
    if (!ativa) return "dashboard";

    const mapa = {
      viewDashboard: "dashboard",
      viewAlunos: "alunos",
      viewFinanceiro: "financeiro",
      viewDesafio: "desafio",
      viewEvolucao: "evolucao",
      viewPresencas: "presencas",
      viewTurmas: "turmas",
      viewAvisos: "avisos",
      viewSolicitacoes: "solicitacoes",
      viewAniversariantes: "aniversariantes",
      viewProgramaFight: "programaFight",
      viewPerfil: "perfil"
    };

    return mapa[ativa.id] || "dashboard";
  }

  function atualizarShellMobile(view = viewAtivaNoDom()) {
    viewAtualMobile = view || "dashboard";

    document.body.classList.toggle("mobile-professor-interna", viewAtualMobile !== "dashboard");
    document.body.classList.toggle("mobile-professor-dashboard", viewAtualMobile === "dashboard");

    const titulo = document.getElementById("mobileProfessorTituloView");
    if (titulo) titulo.textContent = mapaTitulos[viewAtualMobile] || "Mensalize";

    atualizarAcaoContextualMobile(viewAtualMobile);

    const viewDiretaBottom = new Set(["dashboard", "alunos", "financeiro", "presencas"]);
    const ativoBottom = viewDiretaBottom.has(viewAtualMobile) ? viewAtualMobile : "mais";

    document.querySelectorAll(".mobile-bottom-item").forEach(botao => {
      const viewBotao = botao.dataset.mobileView || botao.dataset.mobileAction || "";
      botao.classList.toggle("ativo", viewBotao === ativoBottom);
    });
  }

  function abrirViewMobile(view) {
    if (!view) return;

    if (view === "relatorios") {
      if (typeof abrirCentralRelatorios === "function") {
        abrirCentralRelatorios();
      } else {
        if (typeof mostrarToast === "function") mostrarToast("Central de Relatórios indisponível agora.", "erro");
      }
      return;
    }

    if (typeof abrirViewPrincipal === "function") {
      const viewAntes = viewAtivaNoDom();
      abrirViewPrincipal(view);

      window.setTimeout(() => {
        const viewDepois = viewAtivaNoDom();
        atualizarShellMobile(viewDepois);

        // A rolagem oficial do mobile vive em .conteudo-app.
        // Só volta ao topo quando houve navegação real; modal Pro não perde posição.
        if (viewDepois !== viewAntes || viewDepois === view) {
          rolarConteudoMobileTopo("auto");
        }
      }, 0);
    }
  }

  function abrirFinanceiroComStatus(status = "todos") {
    if (typeof dashboardExecutivoAbrirFinanceiro === "function") {
      dashboardExecutivoAbrirFinanceiro(status);
      window.setTimeout(() => {
        sincronizarFinanceiroMobile();
        rolarConteudoMobileTopo("auto");
      }, 80);
      return;
    }

    abrirViewMobile("financeiro");

    window.setTimeout(() => {
      const seletor = document.getElementById("financeiroStatus");
      if (!seletor) return;
      seletor.value = status;
      seletor.dispatchEvent(new Event("change", { bubbles: true }));
    }, 100);
  }

  function executarAcaoMobile(acao) {
    if (acao === "mais") {
      if (typeof abrirMenuLateral === "function") abrirMenuLateral();
      return;
    }

    if (acao === "atrasados") {
      abrirFinanceiroComStatus("atrasado");
      return;
    }

    if (acao === "financeiro-recebido") {
      abrirFinanceiroComStatus("pago");
      return;
    }

    if (acao === "financeiro-aberto") {
      abrirFinanceiroComStatus("todos");
      return;
    }

    if (acao === "cobrar") {
      const botaoCobrar = document.getElementById("btnCobrarAtrasados");
      if (botaoCobrar) {
        botaoCobrar.click();
      } else {
        abrirFinanceiroComStatus("atrasado");
      }
    }
  }

  function mesFinanceiroAtualMobile() {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  }

  function atualizarLabelPeriodoFinanceiroMobile(valorMes) {
    const label = document.getElementById("mobileFinanceiroPeriodoLabel");
    if (!label) return;

    const valor = String(valorMes || "").slice(0, 7);
    const [ano, mes] = valor.split("-").map(Number);
    if (!Number.isFinite(ano) || !Number.isFinite(mes) || mes < 1 || mes > 12) {
      label.textContent = "Mês atual";
      return;
    }

    const texto = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric"
    }).format(new Date(ano, mes - 1, 1));

    label.textContent = texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function atualizarChipsStatusFinanceiroMobile(statusAtual) {
    const status = String(statusAtual || "todos").toLowerCase();
    document.querySelectorAll("[data-mobile-financeiro-status]").forEach(botao => {
      botao.classList.toggle("ativo", botao.dataset.mobileFinanceiroStatus === status);
    });
  }

  function sincronizarFinanceiroMobile() {
    const mesOriginal = document.getElementById("financeiroMes");
    const mesMobile = document.getElementById("mobileFinanceiroMes");
    const statusOriginal = document.getElementById("financeiroStatus");

    const valorMes = mesOriginal?.value || mesFinanceiroAtualMobile();
    if (mesMobile && mesMobile.value !== valorMes) mesMobile.value = valorMes;
    atualizarLabelPeriodoFinanceiroMobile(valorMes);
    atualizarChipsStatusFinanceiroMobile(statusOriginal?.value || "todos");
  }

  function definirStatusFinanceiroMobile(status) {
    const seletor = document.getElementById("financeiroStatus");
    if (!seletor) return;

    const normalizado = ["todos", "pago", "pendente", "atrasado"].includes(status)
      ? status
      : "todos";

    seletor.value = normalizado;
    atualizarChipsStatusFinanceiroMobile(normalizado);
    seletor.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function garantirPagamentosPorAlunoAbertoMobile() {
    const botao = document.getElementById("btnToggleFinanceiroAlunos");
    if (!botao) return;
    if (botao.getAttribute("aria-expanded") !== "true") botao.click();
  }

  function rolarAteElementoMobile(elemento, behavior = "smooth") {
    if (!ehMobileProfessor() || !elemento) return;

    try {
      elemento.scrollIntoView({ behavior, block: "start", inline: "nearest" });
    } catch (_) {
      elemento.scrollIntoView();
    }
  }

  function abrirPagamentosPorAlunoMobile() {
    garantirPagamentosPorAlunoAbertoMobile();
    window.setTimeout(() => {
      rolarAteElementoMobile(document.querySelector("#viewFinanceiro .financeiro-operacao-card"));
    }, 50);
  }

  function abrirCobrancasAtrasadasMobile() {
    garantirPagamentosPorAlunoAbertoMobile();
    definirStatusFinanceiroMobile("atrasado");

    window.setTimeout(() => {
      const painel = document.getElementById("financeiroCobrancaMassa");
      const botao = document.getElementById("btnAlternarCobrancaMassaFinanceiro");

      if (painel?.classList.contains("recolhido") && botao) botao.click();
      rolarAteElementoMobile(painel || document.querySelector("#viewFinanceiro .financeiro-operacao-card"));
    }, 160);
  }

  function configurarFinanceiroMobile() {
    const mesMobile = document.getElementById("mobileFinanceiroMes");
    const mesOriginal = document.getElementById("financeiroMes");
    const statusOriginal = document.getElementById("financeiroStatus");

    if (mesMobile && mesMobile.dataset.mobileFinanceiroConfigurado !== "true") {
      mesMobile.dataset.mobileFinanceiroConfigurado = "true";
      mesMobile.addEventListener("change", () => {
        if (!mesOriginal) return;
        mesOriginal.value = mesMobile.value || mesFinanceiroAtualMobile();
        atualizarLabelPeriodoFinanceiroMobile(mesOriginal.value);
        mesOriginal.dispatchEvent(new Event("change", { bubbles: true }));
      });
    }

    if (mesOriginal && mesOriginal.dataset.mobileEspelhoConfigurado !== "true") {
      mesOriginal.dataset.mobileEspelhoConfigurado = "true";
      ["change", "input"].forEach(evento => {
        mesOriginal.addEventListener(evento, sincronizarFinanceiroMobile);
      });
    }

    if (statusOriginal && statusOriginal.dataset.mobileEspelhoConfigurado !== "true") {
      statusOriginal.dataset.mobileEspelhoConfigurado = "true";
      statusOriginal.addEventListener("change", sincronizarFinanceiroMobile);
    }

    document.querySelectorAll("[data-mobile-financeiro-status]").forEach(botao => {
      if (botao.dataset.mobileFinanceiroConfigurado === "true") return;
      botao.dataset.mobileFinanceiroConfigurado = "true";
      botao.addEventListener("click", () => definirStatusFinanceiroMobile(botao.dataset.mobileFinanceiroStatus));
    });

    document.querySelectorAll("[data-mobile-financeiro-action]").forEach(botao => {
      if (botao.dataset.mobileFinanceiroConfigurado === "true") return;
      botao.dataset.mobileFinanceiroConfigurado = "true";
      botao.addEventListener("click", () => {
        const acao = botao.dataset.mobileFinanceiroAction;
        if (acao === "ver-pagamentos") abrirPagamentosPorAlunoMobile();
        if (acao === "cobrar-atrasados") abrirCobrancasAtrasadasMobile();
      });
    });

    sincronizarFinanceiroMobile();
  }

  function abrirSheetNotificacoes() {
    atualizarNotificacoesMobile();
    const sheet = document.getElementById("mobileProfessorNotificacoesSheet");
    if (!sheet) return;

    sheet.classList.add("aberta");
    sheet.setAttribute("aria-hidden", "false");
    document.body.classList.add("mobile-sheet-open");
  }

  function fecharSheetNotificacoes() {
    const sheet = document.getElementById("mobileProfessorNotificacoesSheet");
    if (!sheet) return;

    sheet.classList.remove("aberta");
    sheet.setAttribute("aria-hidden", "true");
    document.body.classList.remove("mobile-sheet-open");
  }

  function configurarAcoesMobile() {
    document.querySelectorAll("[data-mobile-view]").forEach(botao => {
      if (botao.dataset.mobileConfigurado === "true") return;
      botao.dataset.mobileConfigurado = "true";
      botao.addEventListener("click", () => abrirViewMobile(botao.dataset.mobileView));
    });

    document.querySelectorAll("[data-mobile-action]").forEach(botao => {
      if (botao.dataset.mobileConfigurado === "true") return;
      botao.dataset.mobileConfigurado = "true";
      botao.addEventListener("click", () => executarAcaoMobile(botao.dataset.mobileAction));
    });

    document.getElementById("btnMobileNotificacoes")?.addEventListener("click", abrirSheetNotificacoes);
    document.getElementById("btnMobileAcaoContextual")?.addEventListener("click", executarAcaoContextualMobile);
    document.getElementById("btnMobileConfiguracoes")?.addEventListener("click", () => abrirViewMobile("perfil"));
    document.getElementById("mobileProfessorAcademiaCard")?.addEventListener("click", () => abrirViewMobile("perfil"));
    document.getElementById("btnMobileVoltarInicio")?.addEventListener("click", () => abrirViewMobile("dashboard"));
    document.getElementById("btnMobileAbrirMenuInterno")?.addEventListener("click", () => {
      if (typeof abrirMenuLateral === "function") abrirMenuLateral();
    });

    document.getElementById("btnMobileProximaAcao")?.addEventListener("click", () => {
      const original = document.getElementById("dashboardAcaoPrincipalBotao");
      if (original) original.click();
    });

    document.querySelectorAll("[data-mobile-sheet-close]").forEach(botao => {
      botao.addEventListener("click", fecharSheetNotificacoes);
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") fecharSheetNotificacoes();
    });
  }

  function configurarPaginacaoAlunosMobile() {
    const lista = document.getElementById("listaAlunos");
    if (!lista || lista.dataset.mobilePaginacaoConfigurada === "true") return;

    lista.dataset.mobilePaginacaoConfigurada = "true";
    lista.addEventListener("click", event => {
      const botao = event.target.closest(".paginacao button");
      if (!botao || botao.disabled || !ehMobileProfessor()) return;

      window.setTimeout(() => rolarConteudoMobileTopo("smooth"), 0);
    });
  }

  function observarElemento(id, callback) {
    const el = document.getElementById(id);
    if (!el) return;

    const observer = new MutationObserver(callback);
    observer.observe(el, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true
    });
    observadoresMobile.push(observer);
  }

  function configurarSincronizacaoMobile() {
    ["totalRecebido", "totalAReceber", "totalAtrasados", "totalAlunos"].forEach(id => {
      observarElemento(id, atualizarMetricasMobile);
    });

    ["emailUsuario", "nomeClienteDashboard"].forEach(id => {
      observarElemento(id, atualizarIdentidadeMobile);
    });

    [
      "dashboardAcaoPrincipalTitulo",
      "dashboardAcaoPrincipalDescricao",
      "dashboardAcaoPrincipalIcone"
    ].forEach(id => {
      observarElemento(id, atualizarProximaAcaoMobile);
    });

    ["centralNotificacoesContador", "centralNotificacoesLista", "centralNotificacoesCard"].forEach(id => {
      observarElemento(id, atualizarNotificacoesMobile);
    });

    document.querySelectorAll(".view-app").forEach(view => {
      const observer = new MutationObserver(() => atualizarShellMobile(viewAtivaNoDom()));
      observer.observe(view, { attributes: true, attributeFilter: ["class"] });
      observadoresMobile.push(observer);
    });
  }

  function atualizarTudoMobile() {
    atualizarIdentidadeMobile();
    atualizarMesAtualMobile();
    atualizarMetricasMobile();
    atualizarProximaAcaoMobile();
    atualizarNotificacoesMobile();
    atualizarShellMobile(viewAtivaNoDom());
    sincronizarFinanceiroMobile();
  }

  function campoEditavelMobile(elemento) {
    if (!(elemento instanceof HTMLElement)) return false;
    if (elemento.matches('textarea, select, [contenteditable="true"]')) return true;
    if (!elemento.matches('input')) return false;

    const tipo = String(elemento.getAttribute("type") || "text").toLowerCase();
    return !["checkbox", "radio", "range", "color", "file", "button", "submit", "reset", "hidden"].includes(tipo);
  }

  function configurarEstabilidadeViewportMobile() {
    const raiz = document.documentElement;
    const viewportVisual = window.visualViewport;
    let alturaBase = Math.max(window.innerHeight || 0, viewportVisual?.height || 0);
    let timerFoco = null;

    const atualizarViewport = () => {
      if (!ehMobileProfessor()) {
        raiz.style.removeProperty("--mensalize-mobile-viewport");
        document.body.classList.remove("mobile-keyboard-active", "mobile-field-focused");
        return;
      }

      const alturaAtual = Math.max(320, Math.round(viewportVisual?.height || window.innerHeight || alturaBase));
      const campoAtivo = campoEditavelMobile(document.activeElement);

      if (!campoAtivo) alturaBase = Math.max(alturaBase, alturaAtual);

      raiz.style.setProperty("--mensalize-mobile-viewport", `${alturaAtual}px`);
      document.body.classList.toggle(
        "mobile-keyboard-active",
        campoAtivo && alturaBase - alturaAtual > 100
      );
    };

    const manterCampoVisivel = elemento => {
      if (!campoEditavelMobile(elemento) || !ehMobileProfessor()) return;

      window.clearTimeout(timerFoco);
      document.body.classList.add("mobile-field-focused");
      atualizarViewport();

      timerFoco = window.setTimeout(() => {
        atualizarViewport();
        try {
          elemento.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
        } catch (_) {
          elemento.scrollIntoView();
        }
      }, 180);
    };

    document.addEventListener("focusin", event => manterCampoVisivel(event.target), true);
    document.addEventListener("focusout", () => {
      window.clearTimeout(timerFoco);
      timerFoco = window.setTimeout(() => {
        const aindaEditando = campoEditavelMobile(document.activeElement);
        document.body.classList.toggle("mobile-field-focused", aindaEditando);
        atualizarViewport();
      }, 220);
    }, true);

    window.addEventListener("resize", atualizarViewport, { passive: true });
    window.addEventListener("orientationchange", () => window.setTimeout(atualizarViewport, 180), { passive: true });
    viewportVisual?.addEventListener("resize", atualizarViewport, { passive: true });
    viewportVisual?.addEventListener("scroll", atualizarViewport, { passive: true });

    atualizarViewport();
  }

  function iniciar() {
    if (!document.getElementById("mobileProfessorHome")) return;

    configurarEstabilidadeViewportMobile();
    configurarAcoesMobile();
    configurarPaginacaoAlunosMobile();
    configurarFinanceiroMobile();
    configurarSincronizacaoMobile();
    atualizarTudoMobile();

    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const aoMudarViewport = () => {
      if (ehMobileProfessor()) atualizarTudoMobile();
      else {
        fecharSheetNotificacoes();
        document.body.classList.remove("mobile-professor-interna", "mobile-professor-dashboard");
      }
    };

    if (typeof media.addEventListener === "function") media.addEventListener("change", aoMudarViewport);
    else if (typeof media.addListener === "function") media.addListener(aoMudarViewport);

    window.addEventListener("pageshow", atualizarTudoMobile);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && ehMobileProfessor()) atualizarTudoMobile();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }

  window.MensalizeMobileProfessor = {
    atualizar: atualizarTudoMobile,
    abrirView: abrirViewMobile,
    abrirNotificacoes: abrirSheetNotificacoes,
    fecharNotificacoes: fecharSheetNotificacoes,
    rolarTopo: rolarConteudoMobileTopo
  };
})();
