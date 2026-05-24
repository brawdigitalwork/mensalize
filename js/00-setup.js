/**
 * MENSALIZE — SCRIPT PRINCIPAL
 * ------------------------------------------------------------
 * Este arquivo controla:
 * 1. Conexão com Supabase
 * 2. Login, sessão e perfil do usuário
 * 3. CRUD de alunos
 * 4. Registro e histórico de pagamentos
 * 5. Dashboard financeiro
 * 6. Painel admin
 * 7. Cobranças via WhatsApp
 * 8. Exportação de relatório
 * 9. Tema claro/escuro
 * 10. PWA/UX helpers
 *
 * Observação:
 * O sistema já usa RLS no Supabase. Mesmo assim, o frontend também
 * organiza as ações para melhorar UX e evitar operações indevidas.
 */

// ===============================
// 01. CONEXÃO COM O SUPABASE
// ===============================

const supabaseClient = supabase.createClient(
  CONFIG.supabaseUrl,
  CONFIG.supabaseAnonKey
);

// ===============================
// 02. CONFIGURAÇÕES VISUAIS DO SISTEMA
// ===============================

document.getElementById("loginNomeApp").textContent = CONFIG.nomeApp;
document.getElementById("loginSlogan").textContent = CONFIG.slogan;
document.getElementById("nomeApp").textContent = CONFIG.nomeApp;
document.getElementById("slogan").textContent = CONFIG.slogan;

// ===============================
// 03. ESTADO GLOBAL DA APLICAÇÃO
// ===============================

let alunos = [];
let usuarioAtual = null;
let alunoEditandoId = null;
let limiteAlunos = 30;
let usuarioEhAdmin = false;
let filtroAtual = "todos";
let textoBusca = "";
let nomeEmpresa = "Mensalize";
let moduloEvolucaoAtivo = true;
let moduloPresencaAtivo = false;
let moduloAvisosAtivo = false;
let filtroEvolucaoAtual = "todos";
let presencaMarcacoes = new Map();
let turmasCadastradas = [];
let aulasCanceladas = [];
let presencasPeriodo = [];
let presencaMinimaPercentual = 70;
let frequenciaPeriodoMeses = 6;
let rankingGeralAtivo = true;
let rankingTurmaAtivo = true;
let rankingTurmasAtivo = true;
let rankingMinimoAulas = 4;


let planoAtual = "trial";
let statusConta = "ativo";
let podeUsarSistema = true;

let moduloRankingAtivo = true;
let moduloDesafioAtivo = true;
let moduloTurmasAtivo = true;

// Estado centralizado: mantém um ponto único para depuração e próximas evoluções.
const estado = window.estado = {
  usuario: null,
  alunos: [],
  filtro: "todos",
  pagina: 1,
  textoBusca: "",
  nomeEmpresa: "Mensalize",
  moduloEvolucao: true,
  moduloPresenca: false,
  moduloAvisos: false,
  turmas: [],
  aulasCanceladas: [],
  presencaMinima: 70,
  frequenciaPeriodo: 6,
  rankingGeral: true,
  rankingTurma: true,
  rankingTurmas: true,
  rankingMinimoAulas: 4
};

function sincronizarEstado() {
  estado.usuario = usuarioAtual;
  estado.alunos = alunos;
  estado.filtro = filtroAtual;
  estado.pagina = paginaAtual;
  estado.textoBusca = textoBusca;
  estado.nomeEmpresa = nomeEmpresa;
  estado.moduloEvolucao = moduloEvolucaoAtivo;
  estado.moduloPresenca = moduloPresencaAtivo;
  estado.moduloAvisos = moduloAvisosAtivo;
  estado.turmas = turmasCadastradas;
  estado.aulasCanceladas = aulasCanceladas;
  estado.presencaMinima = presencaMinimaPercentual;
  estado.frequenciaPeriodo = frequenciaPeriodoMeses;
  estado.rankingGeral = rankingGeralAtivo;
  estado.rankingTurma = rankingTurmaAtivo;
  estado.rankingTurmas = rankingTurmasAtivo;
  estado.rankingMinimoAulas = rankingMinimoAulas;
}

// ===============================
// 04. ELEMENTOS DO DOM — LOGIN / ADMIN
// ===============================

const telaLogin = document.getElementById("telaLogin");
const app = document.getElementById("app");
const telaAdmin = document.getElementById("telaAdmin");

const emailLogin = document.getElementById("emailLogin");
const senhaLogin = document.getElementById("senhaLogin");
const btnEntrar = document.getElementById("btnEntrar");
const btnSair = document.getElementById("btnSair");
const mensagemLogin = document.getElementById("mensagemLogin");
const emailUsuario = document.getElementById("emailUsuario");


const btnAdmin = document.getElementById("btnAdmin");
const btnVoltar = document.getElementById("btnVoltar");

const novoEmail = document.getElementById("novoEmail");
const novaSenha = document.getElementById("novaSenha");
const btnCriarUsuario = document.getElementById("btnCriarUsuario");
const msgAdmin = document.getElementById("msgAdmin");
const listaClientes = document.getElementById("listaClientes");
const totalClientes = document.getElementById("totalClientes");
const totalAlunosAdmin = document.getElementById("totalAlunosAdmin");
const campoBusca = document.getElementById("campoBusca");
const clientesLimite = document.getElementById("clientesLimite");



// ===============================
// 05. ELEMENTOS DO DOM — SISTEMA PRINCIPAL
// ===============================

let clientesCache = [];
const formAluno = document.getElementById("formAluno");
const btnMostrarForm = document.getElementById("btnMostrarForm");
const listaAlunos = document.getElementById("listaAlunos");
const toast = document.getElementById("toast");
const contadorLista = document.getElementById("contadorLista");
const modalHistorico = document.getElementById("modalHistorico");
const modalNomeAluno = document.getElementById("modalNomeAluno");
const modalInfoAluno = document.getElementById("modalInfoAluno");
const modalListaPagamentos = document.getElementById("modalListaPagamentos");
const modalAluno = document.getElementById("modalAluno");
const btnFecharModalAluno = document.getElementById("btnFecharModalAluno");
const btnFecharModal = document.getElementById("btnFecharModal");
const modalConfirmarRemocao = document.getElementById("modalConfirmarRemocao");
const textoConfirmarRemocao = document.getElementById("textoConfirmarRemocao");
const btnCancelarRemocao = document.getElementById("btnCancelarRemocao");
const btnConfirmarRemocao = document.getElementById("btnConfirmarRemocao");
const modalRemoverCliente = document.getElementById("modalRemoverCliente");
const textoRemoverCliente = document.getElementById("textoRemoverCliente");
const btnCancelarRemoverCliente = document.getElementById("btnCancelarRemoverCliente");
const btnConfirmarRemoverCliente = document.getElementById("btnConfirmarRemoverCliente");

let clienteParaRemoverId = null;
let clienteParaRemoverEmail = "";

let alunoParaRemoverId = null;
let pagamentoConfirmandoId = null;

// Set com IDs dos alunos que já pagaram este mês (atualizado junto com os alunos)
let alunosPagosMes = new Set();

// Controle de paginação
const ALUNOS_POR_PAGINA = 20;
let paginaAtual = 1;

const totalAlunos = document.getElementById("totalAlunos");
const totalPagos = document.getElementById("totalPagos");
const totalPendentes = document.getElementById("totalPendentes");
const totalAtrasados = document.getElementById("totalAtrasados");
const totalRecebido = document.getElementById("totalRecebido");
const totalAReceber = document.getElementById("totalAReceber");
const totalPrevisao = document.getElementById("totalPrevisao");

const tituloFormulario = document.getElementById("tituloFormulario");
const btnFormulario = document.getElementById("btnFormulario");
const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");

const modalConfirmarPagamento = document.getElementById("modalConfirmarPagamento");
const textoConfirmarPagamento = document.getElementById("textoConfirmarPagamento");
const btnConfirmarPagamento = document.getElementById("btnConfirmarPagamento");
const btnCancelarPagamento = document.getElementById("btnCancelarPagamento");

const btnTema = document.getElementById("btnTema");
const bannerVencimentos = document.getElementById("bannerVencimentos");
const textoBanner = document.getElementById("textoBanner");
const btnBannerAtrasados = document.getElementById("btnBannerAtrasados");
const btnBannerHoje = document.getElementById("btnBannerHoje");
const btnFecharBanner = document.getElementById("btnFecharBanner");
const btnCobrarAtrasados = document.getElementById("btnCobrarAtrasados");
const btnExportar = document.getElementById("btnExportar");
const modalCobrar = document.getElementById("modalCobrar");
const btnFecharModalCobrar = document.getElementById("btnFecharModalCobrar");
const listaCobrar = document.getElementById("listaCobrar");
const modalEdicaoRapida = document.getElementById("modalEdicaoRapida");
const btnFecharEdicaoRapida = document.getElementById("btnFecharEdicaoRapida");
const btnCancelarEdicaoRapida = document.getElementById("btnCancelarEdicaoRapida");
const btnSalvarEdicaoRapida = document.getElementById("btnSalvarEdicaoRapida");
const edicaoRapidaAlunoId = document.getElementById("edicaoRapidaAlunoId");
const edicaoRapidaNome = document.getElementById("edicaoRapidaNome");
const edicaoRapidaValor = document.getElementById("edicaoRapidaValor");
const edicaoRapidaVencimento = document.getElementById("edicaoRapidaVencimento");

// ===============================
// 05.1 ELEMENTOS DO DOM — DASHBOARD PROFISSIONAL
// ===============================
const tituloPagina = document.getElementById("tituloPagina");
const descricaoPagina = document.getElementById("descricaoPagina");
const viewDashboard = document.getElementById("viewDashboard");
const viewAlunos = document.getElementById("viewAlunos");
const viewFinanceiro = document.getElementById("viewFinanceiro");
const viewPerfil = document.getElementById("viewPerfil");
const btnNavDashboard = document.getElementById("btnNavDashboard");
const btnNavAlunos = document.getElementById("btnNavAlunos");
const btnNavFinanceiro = document.getElementById("btnNavFinanceiro");
const btnNavDesafio = document.getElementById("btnNavDesafio");
const btnNavPerfil = document.getElementById("btnNavPerfil");
const btnAbrirMenu = document.getElementById("btnAbrirMenu");
const menuOverlay = document.getElementById("menuOverlay");
const btnNavCadastrar = document.getElementById("btnNavCadastrar");
const btnAbrirCadastroRapido = document.getElementById("btnAbrirCadastroRapido");
const ultimosPagamentos = document.getElementById("ultimosPagamentos");
const financeiroRecebidoMirror = document.getElementById("financeiroRecebidoMirror");
const financeiroAReceberMirror = document.getElementById("financeiroAReceberMirror");
const financeiroPrevisaoMirror = document.getElementById("financeiroPrevisaoMirror");
const nomeClienteDashboard = document.getElementById("nomeClienteDashboard");
const formPerfil = document.getElementById("formPerfil");
const perfilNomeEmpresa = document.getElementById("perfilNomeEmpresa");
const perfilWhatsApp = document.getElementById("perfilWhatsApp");
const perfilPixCopiaCola = document.getElementById("perfilPixCopiaCola");
const msgPerfil = document.getElementById("msgPerfil");
const btnNavEvolucao = document.getElementById("btnNavEvolucao");
const btnNavAvisos = document.getElementById("btnNavAvisos");
const btnNavSolicitacoes = document.getElementById("btnNavSolicitacoes");
const btnNavPresencas = document.getElementById("btnNavPresencas");
const btnNavTurmas = document.getElementById("btnNavTurmas");
const btnNavAniversariantes = document.getElementById("btnNavAniversariantes");
const viewEvolucao = document.getElementById("viewEvolucao");
const viewPresencas = document.getElementById("viewPresencas");
const viewTurmas = document.getElementById("viewTurmas");
const viewAvisos = document.getElementById("viewAvisos");
const viewSolicitacoes = document.getElementById("viewSolicitacoes");
const perfilModuloEvolucao = document.getElementById("perfilModuloEvolucao");
const perfilModuloPresenca = document.getElementById("perfilModuloPresenca");
const perfilModuloAvisos = document.getElementById("perfilModuloAvisos");
const perfilPresencaMinima = document.getElementById("perfilPresencaMinima");
const perfilPeriodoFrequencia = document.getElementById("perfilPeriodoFrequencia");
const perfilRankingGeral = document.getElementById("perfilRankingGeral");
const perfilRankingTurma = document.getElementById("perfilRankingTurma");
const perfilRankingTurmas = document.getElementById("perfilRankingTurmas");
const perfilRankingMinimoAulas = document.getElementById("perfilRankingMinimoAulas");
const faixaAluno = document.getElementById("faixaAluno");
const grauAluno = document.getElementById("grauAluno");
const turmaAluno = document.getElementById("turmaAluno");
const dataNascimentoAluno = document.getElementById("dataNascimentoAluno");
const statusAluno = document.getElementById("statusAluno");
const dataInicioAcademia = document.getElementById("dataInicioAcademia");
const dataUltimaGraduacao = document.getElementById("dataUltimaGraduacao");
const tempoMinimoAvaliacao = document.getElementById("tempoMinimoAvaliacao");
const observacoesInternas = document.getElementById("observacoesInternas");
const dataExperimental = document.getElementById("dataExperimental");
const responsavelNome = document.getElementById("responsavelNome");
const responsavelWhatsApp = document.getElementById("responsavelWhatsApp");
const totalAptosGraduacao = document.getElementById("totalAptosGraduacao");
const totalProximosGraduacao = document.getElementById("totalProximosGraduacao");
const totalEmEvolucao = document.getElementById("totalEmEvolucao");
const dashboardAptosGraduacao = document.getElementById("dashboardAptosGraduacao");
const dashboardProximosGraduacao = document.getElementById("dashboardProximosGraduacao");
const dashboardEvolucaoTexto = document.getElementById("dashboardEvolucaoTexto");
const listaEvolucao = document.getElementById("listaEvolucao");
const formAviso = document.getElementById("formAviso");
const avisoTitulo = document.getElementById("avisoTitulo");
const avisoTurma = document.getElementById("avisoTurma");
const avisoMensagem = document.getElementById("avisoMensagem");
const msgAviso = document.getElementById("msgAviso");
const listaSolicitacoes = document.getElementById("listaSolicitacoes");
const totalSolicitacoesPendentes = document.getElementById("totalSolicitacoesPendentes");
const totalSolicitacoesAprovadas = document.getElementById("totalSolicitacoesAprovadas");
const totalSolicitacoesRecusadas = document.getElementById("totalSolicitacoesRecusadas");
const btnAtualizarSolicitacoes = document.getElementById("btnAtualizarSolicitacoes");
const listaAvisos = document.getElementById("listaAvisos");
const presencaData = document.getElementById("presencaData");
const presencaTurma = document.getElementById("presencaTurma");
const btnAtualizarChamada = document.getElementById("btnAtualizarChamada");
const btnMarcarTodosPresentes = document.getElementById("btnMarcarTodosPresentes");
const btnLimparChamada = document.getElementById("btnLimparChamada");
const btnSalvarChamada = document.getElementById("btnSalvarChamada");
const listaPresencas = document.getElementById("listaPresencas");
const presencaTotalPresentes = document.getElementById("presencaTotalPresentes");
const presencaTotalFaltas = document.getElementById("presencaTotalFaltas");
const presencaTotalAlunos = document.getElementById("presencaTotalAlunos");
const formTurma = document.getElementById("formTurma");
const turmaNome = document.getElementById("turmaNome");
const turmaHorario = document.getElementById("turmaHorario");
const turmaProfessor = document.getElementById("turmaProfessor");
const turmaAtiva = document.getElementById("turmaAtiva");
const msgTurma = document.getElementById("msgTurma");
const listaTurmas = document.getElementById("listaTurmas");
const btnSalvarTurma = document.getElementById("btnSalvarTurma");
const btnCancelarEdicaoTurma = document.getElementById("btnCancelarEdicaoTurma");

let turmaEditandoId = null;
const formCancelarAula = document.getElementById("formCancelarAula");
const cancelarTurma = document.getElementById("cancelarTurma");
const cancelarData = document.getElementById("cancelarData");
const cancelarMotivo = document.getElementById("cancelarMotivo");
const cancelarObservacao = document.getElementById("cancelarObservacao");
const msgCancelarAula = document.getElementById("msgCancelarAula");
const listaAulasCanceladas = document.getElementById("listaAulasCanceladas");
const modalGraduacao = document.getElementById("modalGraduacao");
const btnFecharModalGraduacao = document.getElementById("btnFecharModalGraduacao");
const btnCancelarGraduacao = document.getElementById("btnCancelarGraduacao");
const btnSalvarGraduacao = document.getElementById("btnSalvarGraduacao");
const graduacaoAlunoId = document.getElementById("graduacaoAlunoId");
const graduacaoAlunoNome = document.getElementById("graduacaoAlunoNome");
const novaFaixaGraduacao = document.getElementById("novaFaixaGraduacao");
const novoGrauGraduacao = document.getElementById("novoGrauGraduacao");
const dataGraduacaoRegistro = document.getElementById("dataGraduacaoRegistro");
const observacaoGraduacao = document.getElementById("observacaoGraduacao");
const viewDesafio = document.getElementById("viewDesafio");
const listaRankingDesafioProfessor = document.getElementById("listaRankingDesafioProfessor");
const btnAtualizarDesafio = document.getElementById("btnAtualizarDesafio");

// ===============================
// 06. UTILITÁRIOS — VALORES / MOEDA
// ===============================

/**
 * Converte valores digitados em formato brasileiro para número.
 * Exemplos: "R$ 100,00" -> 100 | "1.000,50" -> 1000.5
 */
function valorParaNumero(valor) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;

  let texto = String(valor || "").trim();
  if (!texto) return 0;

  texto = texto
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "");

  if (!texto || texto === "," || texto === "." || texto === "-" || texto === "-," || texto === "-.") {
    return 0;
  }

  const negativo = texto.startsWith("-");
  texto = texto.replace(/-/g, "");

  const ultimaVirgula = texto.lastIndexOf(",");
  const ultimoPonto = texto.lastIndexOf(".");
  const temVirgula = ultimaVirgula !== -1;
  const temPonto = ultimoPonto !== -1;

  if (temVirgula && temPonto) {
    // Usa o último separador como decimal: 1.234,56 ou 1,234.56.
    const indiceDecimal = Math.max(ultimaVirgula, ultimoPonto);
    const inteiro = texto.slice(0, indiceDecimal).replace(/[,.]/g, "");
    const decimal = texto.slice(indiceDecimal + 1).replace(/[,.]/g, "");
    texto = `${inteiro}.${decimal}`;
  } else if (temVirgula) {
    // No sistema brasileiro, vírgula é decimal: 19,99 -> 19.99.
    const partes = texto.split(",");
    const decimal = partes.pop() || "";
    const inteiro = partes.join("").replace(/\./g, "");
    texto = `${inteiro}.${decimal}`;
  } else if (temPonto) {
    const partes = texto.split(".");
    const ultimaParte = partes[partes.length - 1] || "";

    if (partes.length === 2 && ultimaParte.length <= 2) {
      // Permite ponto como decimal também: 19.99 ou 19.9.
      texto = `${partes[0]}.${ultimaParte}`;
    } else {
      // Pontos com 3 dígitos finais continuam sendo milhar: 10.000 -> 10000.
      texto = texto.replace(/\./g, "");
    }
  }

  const numero = Number(`${negativo ? "-" : ""}${texto}`);
  return Number.isFinite(numero) ? numero : 0;
}

/**
 * Formata qualquer valor numérico para moeda brasileira.
 */
function formatarMoeda(valor) {
  return Number(valorParaNumero(valor)).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

/**
 * Aplica filtro de usuário nas consultas principais.
 * Isso evita que um cliente veja/some dados de outros clientes caso alguma policy/RLS esteja ampla demais.
 * Admin continua vendo tudo.
 */
function aplicarFiltroUsuario(query) {
  if (!usuarioEhAdmin && usuarioAtual && usuarioAtual.id) {
    return query.eq("user_id", usuarioAtual.id);
  }

  return query;
}

/** Executa consultas Supabase com erro padronizado para manutenção/debug. */
async function executarQuery(callback, msgErro = "Algo deu errado.") {
  try {
    const resultado = await callback();
    if (resultado && resultado.error) {
      console.error("[Mensalize]", msgErro, resultado.error);
      mostrarToast(msgErro, "erro");
      return null;
    }
    return resultado ? resultado.data : null;
  } catch (erro) {
    console.error("[Mensalize]", msgErro, erro);
    mostrarToast(msgErro, "erro");
    return null;
  }
}

// ===============================
