// 07. INICIALIZAÇÃO DO SISTEMA
// ===============================

// iniciarSistema() agora é chamado em js/99-app.js, após carregar todos os módulos.

/** Verifica se já existe sessão ativa e abre login ou app. */
async function iniciarSistema() {
  setFiltro(typeof obterFiltroSalvoAlunos === "function" ? obterFiltroSalvoAlunos() : "todos");

  /*
    O Mensalize agora sempre abre na tela de login.
    Mesmo que exista uma sessão antiga salva pelo Supabase,
    ela é encerrada e o professor precisa clicar em Entrar.
  */
  try {
    await supabaseClient.auth.signOut();
  } catch (erro) {
    console.warn("Não foi possível encerrar a sessão anterior:", erro);
  }

  usuarioAtual = null;
  sincronizarEstado();
  mostrarLogin();
}

// ===============================
// 08. CONTROLE DE TELAS — LOGIN / APP
// ===============================

/** Mostra a tela de login e limpa dados sensíveis dos campos. */
function mostrarLogin() {
  telaLogin.classList.remove("escondido");
  app.classList.add("escondido");
  telaAdmin.classList.add("escondido");

  btnAdmin.classList.add("escondido");

  preencherEmailProfessorSalvo();
  senhaLogin.value = "";
  mensagemLogin.textContent = "";
  mensagemLogin.classList.remove("erro", "sucesso");

  if (btnEntrar) {
    btnEntrar.disabled = false;
    btnEntrar.textContent = "Entrar";
  }
}


// ===============================
// 08.1 LOGIN — LEMBRAR APENAS E-MAIL
// ===============================

const LOGIN_PROFESSOR_EMAIL_KEY = "mensalize:login-professor-email";

function obterEmailProfessorSalvo() {
  try {
    return localStorage.getItem(LOGIN_PROFESSOR_EMAIL_KEY) || "";
  } catch (erro) {
    console.warn("Erro ao ler e-mail salvo:", erro);
    return "";
  }
}

function salvarEmailProfessorNoAparelho(email) {
  try {
    localStorage.setItem(LOGIN_PROFESSOR_EMAIL_KEY, email);
  } catch (erro) {
    console.warn("Erro ao salvar e-mail:", erro);
  }
}

function apagarEmailProfessorSalvo() {
  try {
    localStorage.removeItem(LOGIN_PROFESSOR_EMAIL_KEY);
  } catch (erro) {
    console.warn("Erro ao apagar e-mail salvo:", erro);
  }
}

function preencherEmailProfessorSalvo() {
  const lembrarEmailProfessor = document.getElementById("lembrarEmailProfessor");
  const emailSalvo = obterEmailProfessorSalvo();

  if (emailLogin) emailLogin.value = emailSalvo;
  if (senhaLogin) senhaLogin.value = "";

  if (lembrarEmailProfessor) {
    lembrarEmailProfessor.checked = Boolean(emailSalvo);
  }
}

/** Bloqueia a abertura do app quando o Admin desativa a conta do cliente. */
async function bloquearAcessoCliente(motivo = "Conta bloqueada pelo administrador.") {
  telaLogin.classList.remove("escondido");
  app.classList.add("escondido");
  telaAdmin.classList.add("escondido");
  btnAdmin.classList.add("escondido");

  if (emailLogin) emailLogin.value = usuarioAtual?.email || "";
  if (senhaLogin) senhaLogin.value = "";
  if (mensagemLogin) {
    mensagemLogin.textContent = motivo;
    mensagemLogin.classList.add("erro");
  }

  try {
    await supabaseClient.auth.signOut();
  } catch (erro) {
    console.warn("Erro ao encerrar sessão bloqueada:", erro);
  }

  usuarioAtual = null;
  sincronizarEstado();
}

/** Mostra o app principal e carrega permissões do usuário. */
async function mostrarApp() {
  telaLogin.classList.add("escondido");
  telaAdmin.classList.add("escondido");
  app.classList.remove("escondido");

  emailUsuario.textContent = usuarioAtual.email;

  return await carregarPerfil();
}


// ===============================
// 08.2 PLANO, TRIAL E UPGRADE
// ===============================
const MENSALIZE_UPGRADE_WHATSAPP = "5531982924913";
const MENSALIZE_TRIAL_TOTAL_DIAS = 30;
const MENSALIZE_TRIAL_BANNER_KEY_PREFIX = "mensalize:trial-banner-fechado";

const MENSALIZE_PLANOS_INTERFACE = {
  trial: {
    nome: "Teste Gratuito",
    descricao: "Teste com recursos liberados por tempo limitado.",
    tag: "Teste"
  },
  basic: {
    nome: "Mensalize",
    descricao: "Gestão de alunos, financeiro, cobranças e avisos.",
    tag: "Plano ativo"
  },
  pro: {
    nome: "Mensalize Pro",
    descricao: "Gestão completa com turmas, presenças, graduação, desafio e Programa Fight.",
    tag: "Completo"
  }
};

const MENSALIZE_UPGRADE_MODULOS = {
  desafio: {
    nome: "Desafio da Aula",
    texto: "Ranking mensal com presença, técnica, atitude e pontos extras para aumentar engajamento dos alunos.",
    beneficios: [
      "Ranking mensal por aluno e turma.",
      "Pontos extras por técnica, atitude e participação.",
      "Mais motivação e retenção dentro da academia."
    ]
  },
  evolucao: {
    nome: "Graduação / Evolução",
    texto: "Acompanhe faixa, grau, frequência e alunos aptos para avaliação sem controle manual em planilha.",
    beneficios: [
      "Alunos aptos para avaliação no dashboard.",
      "Critérios de frequência e tempo por aluno.",
      "Histórico de graduação mais organizado."
    ]
  },
  programaFight: {
    nome: "Programa de Graduação",
    texto: "Organize técnicas, categorias e vídeos por faixa para entregar uma experiência mais profissional ao aluno.",
    beneficios: [
      "Conteúdos por faixa e categoria.",
      "Links de vídeo para estudo do aluno.",
      "Mais valor percebido no portal do aluno."
    ]
  },
  turmas: {
    nome: "Turmas",
    texto: "Organize horários, professores, dias de aula e alunos vinculados sem improviso.",
    beneficios: [
      "Cadastro de turmas e horários.",
      "Alunos separados por turma.",
      "Base pronta para frequência e relatórios."
    ]
  },
  presencas: {
    nome: "Presenças",
    texto: "Faça chamadas por turma e use a frequência para acompanhar presença, evolução e retenção.",
    beneficios: [
      "Chamada do dia por turma.",
      "Histórico de presenças e faltas.",
      "Frequência usada nos critérios de graduação."
    ]
  },
  avisos: {
    nome: "Avisos",
    texto: "Publique comunicados para os alunos diretamente no portal, sem depender só de grupos de WhatsApp.",
    beneficios: [
      "Avisos ativos, agendados e expirados.",
      "Comunicação mais organizada com alunos.",
      "Mais profissionalismo no portal do aluno."
    ]
  },
  pro: {
    nome: "Mensalize Pro",
    texto: "Libere os recursos avançados do Mensalize para profissionalizar a operação da academia.",
    beneficios: [
      "Turmas, presenças e frequência inteligente.",
      "Graduação, evolução e alunos aptos para avaliação.",
      "Desafio da Aula, Programa Fight e recursos avançados."
    ]
  }
};

function normalizarPlanoInterface(plano) {
  if (plano === "fight" || plano === "premium") return "pro";
  if (plano === "basic") return "basic";
  if (plano === "pro") return "pro";
  return "trial";
}

function obterPlanoInterface(plano) {
  const chave = normalizarPlanoInterface(plano);
  return MENSALIZE_PLANOS_INTERFACE[chave] || MENSALIZE_PLANOS_INTERFACE.trial;
}

function dataLocalISOUpgrade(data = new Date()) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

function normalizarDataTrial(valor) {
  if (!valor) return null;

  const texto = String(valor).split("T")[0];
  const partes = texto.split("-");
  if (partes.length !== 3) return null;

  const data = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  return Number.isNaN(data.getTime()) ? null : data;
}

function obterPeriodoTrialConta() {
  if (usuarioEhAdmin || normalizarPlanoInterface(planoAtual) !== "trial") {
    return { inicio: null, fim: null };
  }

  const inicio = normalizarDataTrial(
    trialInicioConta || usuarioAtual?.created_at || usuarioAtual?.confirmed_at || usuarioAtual?.last_sign_in_at
  );

  if (!inicio) return { inicio: null, fim: null };

  const fimInformado = normalizarDataTrial(trialFimConta);
  const fim = fimInformado || new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + Number(trialDiasTotal || MENSALIZE_TRIAL_TOTAL_DIAS));

  return { inicio, fim };
}

function calcularDiasRestantesTrial() {
  const { fim } = obterPeriodoTrialConta();
  if (!fim) return null;

  const hoje = new Date();
  const hojeLocal = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.ceil((fim - hojeLocal) / (1000 * 60 * 60 * 24));
}

function textoDiasTrial(dias) {
  if (dias === null || dias === undefined) return "dias restantes não disponíveis";
  if (dias <= 0) return "teste encerrado";
  if (dias === 1) return "1 dia restante";
  return `${dias} dias restantes`;
}

function obterChaveBannerTrialFechado() {
  const userId = usuarioAtual?.id || "anonimo";
  return `${MENSALIZE_TRIAL_BANNER_KEY_PREFIX}:${userId}`;
}

function bannerTrialFechadoHoje() {
  try {
    return localStorage.getItem(obterChaveBannerTrialFechado()) === dataLocalISOUpgrade();
  } catch (erro) {
    console.warn("Erro ao ler preferência do banner de trial:", erro);
    return false;
  }
}

function registrarBannerTrialFechadoHoje() {
  try {
    localStorage.setItem(obterChaveBannerTrialFechado(), dataLocalISOUpgrade());
  } catch (erro) {
    console.warn("Erro ao salvar preferência do banner de trial:", erro);
  }
}

function atualizarPerfilPlano() {
  const card = document.getElementById("perfilPlanoCard");
  const nomeEl = document.getElementById("perfilPlanoNome");
  const detalheEl = document.getElementById("perfilPlanoDetalhe");
  const botaoUpgrade = document.getElementById("btnPerfilVerUpgrade");

  if (!card || !nomeEl || !detalheEl) return;

  const planoNormalizado = normalizarPlanoInterface(planoAtual);
  const config = obterPlanoInterface(planoAtual);
  const diasTrial = calcularDiasRestantesTrial();

  card.classList.remove("perfil-plano-trial", "perfil-plano-basic", "perfil-plano-pro", "perfil-plano-expirado");

  if (usuarioEhAdmin) {
    card.classList.add("perfil-plano-pro");
    nomeEl.textContent = "Administrador do Mensalize";
    detalheEl.textContent = "Acesso administrativo. Planos comerciais e período de teste não se aplicam a esta conta.";
    if (botaoUpgrade) botaoUpgrade.classList.add("escondido");
    return;
  }

  card.classList.add(`perfil-plano-${planoNormalizado}`);

  if (planoNormalizado === "trial") {
    const periodoTrial = obterPeriodoTrialConta();
    const fimTexto = periodoTrial.fim ? periodoTrial.fim.toLocaleDateString("pt-BR") : "data final não definida";

    nomeEl.textContent = `Teste Gratuito — ${textoDiasTrial(diasTrial)}`;
    detalheEl.textContent = diasTrial !== null && diasTrial <= 0
      ? `Seu teste gratuito terminou em ${fimTexto}. Escolha um plano para evitar interrupções.`
      : `Você está experimentando o Mensalize. Trial válido até ${fimTexto}.`;
    if (diasTrial !== null && diasTrial <= 0) card.classList.add("perfil-plano-expirado");
  } else {
    nomeEl.textContent = config.nome;
    detalheEl.textContent = config.descricao;
  }

  if (botaoUpgrade) {
    botaoUpgrade.classList.toggle("escondido", planoNormalizado === "pro");
  }
}

function atualizarBannerTrialPlano() {
  const banner = document.getElementById("bannerTrialPlano");
  const titulo = document.getElementById("bannerTrialTitulo");
  const texto = document.getElementById("bannerTrialTexto");

  if (!banner || !titulo || !texto) return;

  if (usuarioEhAdmin) {
    banner.classList.add("escondido");
    banner.classList.remove("banner-trial-expirado");
    return;
  }

  const planoNormalizado = normalizarPlanoInterface(planoAtual);
  const diasTrial = calcularDiasRestantesTrial();
  const deveMostrar = planoNormalizado === "trial" && diasTrial !== null && diasTrial <= 7 && !bannerTrialFechadoHoje();

  if (!deveMostrar) {
    banner.classList.add("escondido");
    return;
  }

  banner.classList.toggle("banner-trial-expirado", diasTrial <= 0);

  if (diasTrial <= 0) {
    titulo.textContent = "Seu teste gratuito terminou";
    texto.textContent = "Escolha um plano para continuar usando o Mensalize sem interrupções.";
  } else if (diasTrial === 1) {
    titulo.textContent = "Seu teste gratuito termina amanhã";
    texto.textContent = "Ative um plano agora para continuar usando o Mensalize sem risco de pausa.";
  } else {
    titulo.textContent = `Seu teste termina em ${diasTrial} dias`;
    texto.textContent = "Esse é o melhor momento para escolher um plano e manter a academia organizada.";
  }

  banner.classList.remove("escondido");
}

function atualizarInterfacePlanoConta() {
  atualizarPerfilPlano();
  atualizarBannerTrialPlano();
}

function montarMensagemUpgradeWhatsApp(moduloNome) {
  const academia = nomeEmpresa || "minha academia";
  const email = usuarioAtual?.email || "";
  const planoTexto = obterPlanoInterface(planoAtual).nome;

  return [
    `Olá, quero conhecer o Mensalize Pro.`,
    `Academia: ${academia}.`,
    email ? `E-mail: ${email}.` : "",
    `Plano atual: ${planoTexto}.`,
    `Tenho interesse no recurso: ${moduloNome}.`
  ].filter(Boolean).join("\n");
}

function abrirModalUpgradePlano(modulo = "pro") {
  const config = MENSALIZE_UPGRADE_MODULOS[modulo] || MENSALIZE_UPGRADE_MODULOS.pro;
  const modal = document.getElementById("modalUpgradePlano");
  const titulo = document.getElementById("modalUpgradeTitulo");
  const descricao = document.getElementById("modalUpgradeDescricao");
  const nomeModulo = document.getElementById("modalUpgradeModuloNome");
  const textoModulo = document.getElementById("modalUpgradeModuloTexto");
  const lista = document.getElementById("modalUpgradeBeneficiosLista");
  const btnWhatsApp = document.getElementById("btnUpgradeWhatsApp");

  if (!modal) {
    mostrarToast("Este recurso faz parte do Mensalize Pro.", "erro");
    return;
  }

  if (titulo) titulo.textContent = `Desbloqueie ${config.nome}`;
  if (descricao) descricao.textContent = "Seu plano atual não inclui este recurso. Veja o que o Mensalize Pro libera para sua academia.";
  if (nomeModulo) nomeModulo.textContent = config.nome;
  if (textoModulo) textoModulo.textContent = config.texto;
  if (lista) lista.innerHTML = config.beneficios.map(item => `<li>${item}</li>`).join("");

  if (btnWhatsApp) {
    const mensagem = montarMensagemUpgradeWhatsApp(config.nome);
    btnWhatsApp.href = `https://wa.me/${MENSALIZE_UPGRADE_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
  }

  document.body.classList.remove("menu-aberto");
  modal.classList.remove("escondido");
}

function fecharModalUpgradePlano() {
  const modal = document.getElementById("modalUpgradePlano");
  if (modal) modal.classList.add("escondido");
}

function inicializarUpgradePlano() {
  const modal = document.getElementById("modalUpgradePlano");
  const btnFechar = document.getElementById("btnFecharModalUpgrade");
  const btnDepois = document.getElementById("btnUpgradeDepois");
  const btnPerfil = document.getElementById("btnPerfilVerUpgrade");
  const btnBanner = document.getElementById("btnBannerTrialUpgrade");
  const btnFecharBanner = document.getElementById("btnFecharBannerTrial");

  if (btnFechar && btnFechar.dataset.upgradeConfigurado !== "true") {
    btnFechar.dataset.upgradeConfigurado = "true";
    btnFechar.addEventListener("click", fecharModalUpgradePlano);
  }

  if (btnDepois && btnDepois.dataset.upgradeConfigurado !== "true") {
    btnDepois.dataset.upgradeConfigurado = "true";
    btnDepois.addEventListener("click", fecharModalUpgradePlano);
  }

  if (modal && modal.dataset.upgradeConfigurado !== "true") {
    modal.dataset.upgradeConfigurado = "true";
    modal.addEventListener("click", event => {
      if (event.target === modal) fecharModalUpgradePlano();
    });
  }

  if (btnPerfil && btnPerfil.dataset.upgradeConfigurado !== "true") {
    btnPerfil.dataset.upgradeConfigurado = "true";
    btnPerfil.addEventListener("click", () => abrirModalUpgradePlano("pro"));
  }

  if (btnBanner && btnBanner.dataset.upgradeConfigurado !== "true") {
    btnBanner.dataset.upgradeConfigurado = "true";
    btnBanner.addEventListener("click", () => abrirModalUpgradePlano("pro"));
  }

  if (btnFecharBanner && btnFecharBanner.dataset.upgradeConfigurado !== "true") {
    btnFecharBanner.dataset.upgradeConfigurado = "true";
    btnFecharBanner.addEventListener("click", () => {
      registrarBannerTrialFechadoHoje();
      const banner = document.getElementById("bannerTrialPlano");
      if (banner) banner.classList.add("escondido");
    });
  }
}

// ===============================
// 09. PERFIL DO USUÁRIO / ADMIN
// ===============================

const CAMPOS_PERFIL_BASE = `
      is_admin,
      limite_alunos,
      nome_empresa,
      whatsapp_professor,
      pix_copia_cola,
      modulo_fight,
      modulo_evolucao,
      modulo_presenca,
      modulo_avisos,
      modulo_ranking,
      modulo_desafio,
      modulo_turmas,
      plano,
      status,
      pode_usar,
      presenca_minima_percentual,
      frequencia_periodo_meses,
      ranking_geral_ativo,
      ranking_turma_ativo,
      ranking_turmas_ativo,
      ranking_minimo_aulas
    `;

const CAMPOS_PERFIL_COM_TRIAL = `${CAMPOS_PERFIL_BASE},
      trial_inicio,
      trial_fim`;

async function buscarPerfilUsuarioAtual() {
  let resultado = await supabaseClient
    .from("profiles")
    .select(CAMPOS_PERFIL_COM_TRIAL)
    .eq("id", usuarioAtual.id)
    .single();

  if (!resultado.error) return resultado;

  const mensagem = String(resultado.error?.message || "").toLowerCase();
  const erroColunaTrial = mensagem.includes("trial_inicio") || mensagem.includes("trial_fim") || mensagem.includes("column");

  if (!erroColunaTrial) return resultado;

  console.warn("Campos trial_inicio/trial_fim ainda não existem em profiles. Usando fallback temporário pelo created_at do usuário.");

  resultado = await supabaseClient
    .from("profiles")
    .select(CAMPOS_PERFIL_BASE)
    .eq("id", usuarioAtual.id)
    .single();

  if (resultado.data) {
    resultado.data.trial_inicio = null;
    resultado.data.trial_fim = null;
  }

  return resultado;
}

/** Carrega perfil do usuário logado para saber limite e permissão de admin. */
async function carregarPerfil() {
  btnAdmin.classList.add("escondido");
  usuarioEhAdmin = false;
  limiteAlunos = 30;

  const { data, error } = await buscarPerfilUsuarioAtual();

  if (error) {
    console.log("Erro ao carregar perfil:", error.message);
    return false;
  }

  usuarioEhAdmin = data.is_admin === true;
  limiteAlunos = data.limite_alunos || 30;

  nomeEmpresa = data.nome_empresa || "Mensalize";

  if (nomeClienteDashboard) {
    nomeClienteDashboard.textContent = nomeEmpresa;
  }

  if (perfilNomeEmpresa) {
    perfilNomeEmpresa.value = nomeEmpresa;
  }

  if (perfilWhatsApp) {
    perfilWhatsApp.value = data.whatsapp_professor || "";
  }

  if (perfilPixCopiaCola) {
    perfilPixCopiaCola.value = data.pix_copia_cola || "";
  }

  window.moduloFightAtivo = data.modulo_fight === true;

  moduloEvolucaoAtivo = data.modulo_evolucao !== false;
  moduloPresencaAtivo = data.modulo_presenca === true;
  moduloAvisosAtivo = data.modulo_avisos === true;

  presencaMinimaPercentual = Number(data.presenca_minima_percentual || 70);
  frequenciaPeriodoMeses = Number(data.frequencia_periodo_meses || 6);
  rankingGeralAtivo = data.ranking_geral_ativo !== false;
  rankingTurmaAtivo = data.ranking_turma_ativo !== false;
  rankingTurmasAtivo = data.ranking_turmas_ativo !== false;
  rankingMinimoAulas = Number(data.ranking_minimo_aulas || 4);

  planoAtual = data.plano || "trial";
  statusConta = data.status || "ativo";
  podeUsarSistema = data.pode_usar !== false && statusConta !== "bloqueado";
  trialInicioConta = data.trial_inicio || usuarioAtual?.created_at || usuarioAtual?.confirmed_at || null;
  trialFimConta = data.trial_fim || null;
  trialDiasTotal = MENSALIZE_TRIAL_TOTAL_DIAS;

  if (!usuarioEhAdmin && !podeUsarSistema) {
    await bloquearAcessoCliente("Sua conta está bloqueada. Fale com o administrador do Mensalize para regularizar o acesso.");
    return false;
  }

  moduloRankingAtivo = data.modulo_ranking !== false;
  moduloDesafioAtivo = data.modulo_desafio !== false;
  moduloTurmasAtivo = data.modulo_turmas !== false;
  window.moduloFightAtivo = data.modulo_fight === true;

  document.querySelectorAll(".modulo-fight").forEach(el => {
    el.classList.toggle("escondido", !window.moduloFightAtivo);
  });

  if (perfilModuloEvolucao) perfilModuloEvolucao.checked = moduloEvolucaoAtivo;
  if (perfilModuloPresenca) perfilModuloPresenca.checked = moduloPresencaAtivo;
  if (perfilModuloAvisos) perfilModuloAvisos.checked = moduloAvisosAtivo;
  if (perfilPresencaMinima) perfilPresencaMinima.value = presencaMinimaPercentual;
  if (perfilPeriodoFrequencia) perfilPeriodoFrequencia.value = frequenciaPeriodoMeses;
  if (perfilRankingGeral) perfilRankingGeral.checked = rankingGeralAtivo;
  if (perfilRankingTurma) perfilRankingTurma.checked = rankingTurmaAtivo;
  if (perfilRankingTurmas) perfilRankingTurmas.checked = rankingTurmasAtivo;
  if (perfilRankingMinimoAulas) perfilRankingMinimoAulas.value = rankingMinimoAulas;

  aplicarModulosInterface();
  if (typeof aplicarModuloFightInterface === "function") aplicarModuloFightInterface();
  inicializarUpgradePlano();
  atualizarInterfacePlanoConta();
  sincronizarEstado();

  const btnDesafio = document.getElementById("btnNavDesafio");
  const btnTurmas = document.getElementById("btnNavTurmas");

  if (btnDesafio) {
    btnDesafio.classList.remove("escondido");
    btnDesafio.classList.toggle("modulo-bloqueado", !moduloDesafioAtivo);
  }

  if (btnTurmas) {
    btnTurmas.classList.remove("escondido");
    btnTurmas.classList.toggle("modulo-bloqueado", !moduloTurmasAtivo);
  }

  const btnSolicitacoes = document.getElementById("btnNavSolicitacoes");
  if (btnSolicitacoes) {
    btnSolicitacoes.classList.remove("modulo-bloqueado");
  }

  if (usuarioEhAdmin) {
    btnAdmin.classList.remove("escondido");
  }

  return true;
}


// ===============================
// CRIAR CONTA
// ===============================



// ===============================
// 10. AUTENTICAÇÃO — ENTRAR
// ===============================

btnEntrar.addEventListener("click", async function() {
  const email = emailLogin.value.trim();
  const senha = senhaLogin.value.trim();
  const lembrarEmailProfessor = document.getElementById("lembrarEmailProfessor");

  if (!email || !senha) {
    mensagemLogin.textContent = "Preencha e-mail e senha.";
    mensagemLogin.classList.add("erro");
    mensagemLogin.classList.remove("sucesso");
    return;
  }

  btnEntrar.disabled = true;
  btnEntrar.textContent = "Entrando...";
  mensagemLogin.textContent = "";
  mensagemLogin.classList.remove("erro", "sucesso");

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: senha
  });

  if (error) {
    mensagemLogin.textContent = "E-mail ou senha incorretos. Confira e tente novamente.";
    mensagemLogin.classList.add("erro");
    mensagemLogin.classList.remove("sucesso");

    btnEntrar.disabled = false;
    btnEntrar.textContent = "Entrar";
    return;
  }

  if (lembrarEmailProfessor && lembrarEmailProfessor.checked) {
    salvarEmailProfessorNoAparelho(email);
  } else {
    apagarEmailProfessorSalvo();
  }

  usuarioAtual = data.user;
  sincronizarEstado();

  const acessoLiberado = await mostrarApp();

  btnEntrar.disabled = false;
  btnEntrar.textContent = "Entrar";

  if (!acessoLiberado) return;

  await carregarAlunos();
});

emailLogin.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    btnEntrar.click();
  }
});

senhaLogin.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    btnEntrar.click();
  }
});

const btnMostrarSenhaLogin = document.getElementById("btnMostrarSenhaLogin");

if (btnMostrarSenhaLogin) {
  btnMostrarSenhaLogin.textContent = "Ver";
  btnMostrarSenhaLogin.setAttribute("aria-label", "Mostrar senha");

  btnMostrarSenhaLogin.addEventListener("click", function() {
    const senhaEstaVisivel = senhaLogin.type === "text";

    senhaLogin.type = senhaEstaVisivel ? "password" : "text";
    btnMostrarSenhaLogin.textContent = senhaEstaVisivel ? "Ver" : "Ocultar";
    btnMostrarSenhaLogin.setAttribute(
      "aria-label",
      senhaEstaVisivel ? "Mostrar senha" : "Ocultar senha"
    );
  });
}

// ===============================
// 11. AUTENTICAÇÃO — SAIR
// ===============================

btnSair.addEventListener("click", async function() {
  await supabaseClient.auth.signOut();

  usuarioAtual = null;
  alunos = [];
  sincronizarEstado();
  alunoEditandoId = null;
  usuarioEhAdmin = false;
  limiteAlunos = 30;

  formAluno.reset();
  modalAluno.classList.add("escondido");
  mostrarLogin();
});

// ===============================
