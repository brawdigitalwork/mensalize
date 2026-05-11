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
// 06. UTILITÁRIOS — VALORES / MOEDA
// ===============================

/**
 * Converte valores digitados em formato brasileiro para número.
 * Exemplos: "R$ 100,00" -> 100 | "1.000,50" -> 1000.5
 */
function valorParaNumero(valor) {
  if (typeof valor === "number") return valor;

  let texto = String(valor || "").trim();
  if (!texto) return 0;

  // Remove R$, espaços e qualquer caractere que não seja número, vírgula, ponto ou sinal negativo
  texto = texto.replace(/[R$\s]/g, "").replace(/[^\d,.-]/g, "");

  const temVirgula = texto.includes(",");
  const temPonto = texto.includes(".");

  if (temVirgula) {
    // Formato brasileiro: 1.000,50 -> 1000.50
    texto = texto.replace(/\./g, "").replace(",", ".");
  } else if (temPonto) {
    const partes = texto.split(".");
    const ultimaParte = partes[partes.length - 1];

    if (partes.length > 2) {
      // Exemplo: 1.000.000 -> 1000000
      texto = texto.replace(/\./g, "");
    } else if (ultimaParte.length === 2) {
      // Exemplo: 100.00 -> 100.00
      texto = texto;
    } else {
      // Exemplo: 10.000 -> 10000
      texto = texto.replace(/\./g, "");
    }
  }

  const numero = Number(texto);
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

// ===============================
// 07. INICIALIZAÇÃO DO SISTEMA
// ===============================

iniciarSistema();

/** Verifica se já existe sessão ativa e abre login ou app. */
async function iniciarSistema() {
  setFiltro("todos");
  const { data } = await supabaseClient.auth.getSession();

  if (data.session) {
    usuarioAtual = data.session.user;
    await mostrarApp();
    await carregarAlunos();
  } else {
    mostrarLogin();
  }
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

  emailLogin.value = "";
  senhaLogin.value = "";
  mensagemLogin.textContent = "";
}

/** Mostra o app principal e carrega permissões do usuário. */
async function mostrarApp() {
  telaLogin.classList.add("escondido");
  telaAdmin.classList.add("escondido");
  app.classList.remove("escondido");

  emailUsuario.textContent = usuarioAtual.email;

  await carregarPerfil();
}

// ===============================
// 09. PERFIL DO USUÁRIO / ADMIN
// ===============================

/** Carrega perfil do usuário logado para saber limite e permissão de admin. */
async function carregarPerfil() {
  btnAdmin.classList.add("escondido");
  usuarioEhAdmin = false;
  limiteAlunos = 30;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("is_admin, limite_alunos, nome_empresa")
    .eq("id", usuarioAtual.id)
    .single();

  if (error) {
    console.log("Erro ao carregar perfil:", error.message);
    return;
  }

  usuarioEhAdmin = data.is_admin === true;
  limiteAlunos = data.limite_alunos || 30;
  
  nomeEmpresa = data.nome_empresa || "Mensalize";

  if (usuarioEhAdmin) {
    btnAdmin.classList.remove("escondido");
  }
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

  if (!email || !senha) {
    mensagemLogin.textContent = "Preencha e-mail e senha.";
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: senha
  });

  if (error) {
    mensagemLogin.textContent = error.message;
    return;
  }

  usuarioAtual = data.user;

  await mostrarApp();
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

// ===============================
// 11. AUTENTICAÇÃO — SAIR
// ===============================

btnSair.addEventListener("click", async function() {
  await supabaseClient.auth.signOut();

  usuarioAtual = null;
  alunos = [];
  alunoEditandoId = null;
  usuarioEhAdmin = false;
  limiteAlunos = 30;

  formAluno.reset();
  modalAluno.classList.add("escondido");
  mostrarLogin();
});

// ===============================
// 12. ALUNOS — CARREGAR DO SUPABASE
// ===============================

/** Busca alunos do usuário atual; admin enxerga todos por causa da RLS/policies. */
async function carregarAlunos() {
  // Mostra skeleton enquanto carrega
  const skeletonLista = document.getElementById("skeletonLista");
  if (skeletonLista) skeletonLista.classList.remove("escondido");

  const { data, error } = await supabaseClient
    .from("alunos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    mostrarToast("Erro ao carregar alunos.", "erro");
    if (skeletonLista) skeletonLista.classList.add("escondido");
    return;
  }

  alunos = data;

  // Carrega quem pagou este mês para o badge e filtro
  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    .toISOString().split("T")[0];
  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    .toISOString().split("T")[0];

  const { data: pagamentosMes } = await supabaseClient
    .from("pagamentos")
    .select("aluno_id")
    .gte("data_pagamento", primeiroDiaMes)
    .lte("data_pagamento", ultimoDiaMes);

  alunosPagosMes = new Set((pagamentosMes || []).map(p => String(p.aluno_id)));

  if (skeletonLista) skeletonLista.classList.add("escondido");

  paginaAtual = 1;
  mostrarAlunos();
  await atualizarPainel();

  if (typeof mostrarBannerVencimentos === "function") {
    mostrarBannerVencimentos();
  }
}

// ===============================
// 13. ALUNOS — CADASTRAR / ATUALIZAR
// ===============================

formAluno.addEventListener("submit", async function(event) {
  event.preventDefault();

  const nome = document.getElementById("nomeAluno").value.trim();
  const telefone = document.getElementById("telefoneAluno").value.trim();
  const valor = valorParaNumero(document.getElementById("valorMensalidade").value);
  const vencimento = document.getElementById("dataVencimento").value;

  // Novo campo: link de pagamento
  const linkPagamento = document.getElementById("linkPagamento").value.trim();

  if (!usuarioAtual) {
    mostrarToast("Você precisa estar logado.", "erro");
    return;
  }

  if (alunoEditandoId) {
    const { error } = await supabaseClient
      .from("alunos")
      .update({
        nome: nome,
        telefone: telefone,
        valor: valor,
        vencimento: vencimento,
        link_pagamento: linkPagamento
      })
      .eq("id", alunoEditandoId);

    if (error) {
      mostrarToast("Erro ao atualizar aluno.", "erro");
      return;
    }

    sairModoEdicao();
    mostrarToast("Aluno atualizado com sucesso!");
  } else {
    if (!usuarioEhAdmin && alunos.length >= limiteAlunos) {
      mostrarToast(`Limite de ${limiteAlunos} alunos atingido.`, "erro");
      return;
    }

    const { error } = await supabaseClient
      .from("alunos")
      .insert({
        user_id: usuarioAtual.id,
        nome: nome,
        telefone: telefone,
        valor: valor,
        vencimento: vencimento,
        link_pagamento: linkPagamento,
        status_pagamento: "pendente"
      });

    if (error) {
      mostrarToast("Erro ao cadastrar aluno.", "erro");
      return;
    }

    mostrarToast("Aluno cadastrado com sucesso!");
  }

  formAluno.reset();
  modalAluno.classList.add("escondido");
  await carregarAlunos();
});

// ===============================
// 14. ALUNOS — CANCELAR EDIÇÃO
// ===============================

btnCancelarEdicao.addEventListener("click", function() {
  sairModoEdicao();
  formAluno.reset();
});

/** Reseta o formulário para modo cadastro. */
function sairModoEdicao() {
  alunoEditandoId = null;
  tituloFormulario.textContent = "Cadastrar aluno";
  btnFormulario.textContent = "Cadastrar aluno";
  btnCancelarEdicao.classList.add("escondido");
}

// ===============================
// 15. UTILITÁRIOS — DATAS
// ===============================

/** Retorna "atrasado" ou "pendente" com base no vencimento. */
function verificarStatus(vencimento) {
  const hoje = new Date();

  const dataHoje = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate()
  );

  const partes = vencimento.split("-");
  const dataVencimento = new Date(
    Number(partes[0]),
    Number(partes[1]) - 1,
    Number(partes[2])
  );

  if (dataHoje > dataVencimento) {
    return "atrasado";
  }

  return "pendente";
}

/** Calcula quantos dias faltam ou há quantos dias venceu. */
function calcularDias(vencimento) {
  const hoje = new Date();

  const dataHoje = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate()
  );

  const partes = vencimento.split("-");
  const dataVencimento = new Date(
    Number(partes[0]),
    Number(partes[1]) - 1,
    Number(partes[2])
  );

  const diff = dataVencimento - dataHoje;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Converte data ISO yyyy-mm-dd para dd/mm/yyyy. */
function formatarData(data) {
  const partes = data.split("-");
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

/** Adiciona um mês respeitando finais de mês como 29, 30 e 31. */
function adicionarUmMes(dataString) {
  const partes = dataString.split("-");
  const ano = Number(partes[0]);
  const mes = Number(partes[1]) - 1;
  const dia = Number(partes[2]);

  const novaData = new Date(ano, mes + 1, dia);

  // Se for dia 29, 30 ou 31 e o mês seguinte não tiver esse dia,
  // joga para o último dia correto do mês seguinte.
  if (novaData.getDate() !== dia) {
    novaData.setDate(0);
  }

  const novoAno = novaData.getFullYear();
  const novoMes = String(novaData.getMonth() + 1).padStart(2, "0");
  const novoDia = String(novaData.getDate()).padStart(2, "0");

  return `${novoAno}-${novoMes}-${novoDia}`;
}

/** Converte data ISO yyyy-mm-dd para objeto Date sem depender de timezone UTC. */
function dataStringParaDate(dataString) {
  const partes = dataString.split("-");
  return new Date(
    Number(partes[0]),
    Number(partes[1]) - 1,
    Number(partes[2])
  );
}

/** Retorna a data de hoje zerando hora, minuto e segundo. */
function dataHojeSemHora() {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
}

/** Calcula quantas mensalidades devem ser registradas quando há atraso acumulado. */
function calcularMensalidadesParaRegistrar(vencimentoAtual) {
  const hoje = dataHojeSemHora();
  const mensalidades = [];
  let vencimento = vencimentoAtual;

  // Registra pelo menos uma mensalidade.
  // Se estiver atrasado há meses, registra todas até chegar no próximo vencimento futuro.
  do {
    mensalidades.push(vencimento);
    vencimento = adicionarUmMes(vencimento);
  } while (dataStringParaDate(vencimento) <= hoje);

  return {
    mensalidades,
    novoVencimento: vencimento
  };
}


// ===============================
// 16. ALUNOS — FILTRAR, ORDENAR, PAGINAR E RENDERIZAR
// ===============================

/** Aplica busca, filtros, ordenação, paginação e renderiza os cards dos alunos. */
function mostrarAlunos() {
  listaAlunos.innerHTML = "";

  if (alunos.length === 0) {
    listaAlunos.innerHTML = `
      <div style="text-align:center; padding:40px; color:#a1a1aa;">
        <p style="font-size:40px; margin-bottom:12px;">📋</p>
        <p>Nenhum aluno cadastrado ainda.</p>
        <p style="font-size:13px; margin-top:6px;">Clique em <strong>+ Novo aluno</strong> para começar.</p>
      </div>`;
    contadorLista.textContent = "0 alunos";
    return;
  }

  // ── 1. Filtra por busca e filtro ──────────────────────────────
  let lista = alunos.filter(function(aluno) {
    const nomeAluno = aluno.nome.toLowerCase();
    const telefoneAluno = aluno.telefone.toLowerCase();

    if (textoBusca && !nomeAluno.includes(textoBusca) && !telefoneAluno.includes(textoBusca)) {
      return false;
    }

    const jaPagou = alunosPagosMes.has(String(aluno.id));
    const status = verificarStatus(aluno.vencimento);
    const dias = calcularDias(aluno.vencimento);

    if (filtroAtual === "pago") return jaPagou;
    if (jaPagou) return filtroAtual === "todos"; // pagos só aparecem em "Todos"

    if (filtroAtual === "pendente" && (status !== "pendente" || dias === 0)) return false;
    if (filtroAtual === "atrasado" && status !== "atrasado") return false;
    if (filtroAtual === "hoje" && dias !== 0) return false;

    return true;
  });

  // ── 2. Ordenação inteligente ──────────────────────────────────
  // atrasados → vence hoje → vence em breve → pendentes → pagos
  function prioridade(aluno) {
    if (alunosPagosMes.has(String(aluno.id))) return 5;
    const status = verificarStatus(aluno.vencimento);
    const dias = calcularDias(aluno.vencimento);
    if (status === "atrasado") return 1;
    if (dias === 0) return 2;
    if (dias <= 3) return 3;
    return 4;
  }

  lista.sort((a, b) => {
    const pa = prioridade(a), pb = prioridade(b);
    if (pa !== pb) return pa - pb;
    return calcularDias(a.vencimento) - calcularDias(b.vencimento);
  });

  // ── 3. Paginação ──────────────────────────────────────────────
  const total = lista.length;
  const totalPaginas = Math.ceil(total / ALUNOS_POR_PAGINA);
  if (paginaAtual > totalPaginas) paginaAtual = 1;

  const inicio = (paginaAtual - 1) * ALUNOS_POR_PAGINA;
  const fim = inicio + ALUNOS_POR_PAGINA;
  const listaPagina = lista.slice(inicio, fim);

  contadorLista.textContent = `${total} aluno${total !== 1 ? "s" : ""}`;

  if (total === 0) {
    listaAlunos.innerHTML = `
      <div style="text-align:center; padding:40px; color:#a1a1aa;">
        <p style="font-size:36px; margin-bottom:12px;">🔍</p>
        <p>Nenhum aluno encontrado para este filtro.</p>
      </div>`;
    return;
  }

  // ── 4. Renderiza cards ────────────────────────────────────────
  listaPagina.forEach(function(aluno) {
    const jaPagou = alunosPagosMes.has(String(aluno.id));
    const status = verificarStatus(aluno.vencimento);
    const dias = calcularDias(aluno.vencimento);

    let textoStatus = "";
    let classeStatus = "";

    if (jaPagou) {
      textoStatus = "✅ Pago este mês";
      classeStatus = "status-pago";
    } else if (status === "atrasado") {
      textoStatus = `⚠ Atrasado ${Math.abs(dias)}d`;
      classeStatus = "status-atrasado";
    } else if (dias === 0) {
      textoStatus = "📅 Vence hoje";
      classeStatus = "status-hoje";
    } else if (dias <= 3) {
      textoStatus = `🔔 Vence em ${dias}d`;
      classeStatus = "status-pendente";
    } else {
      textoStatus = `📆 Vence em ${dias}d`;
      classeStatus = "status-pendente";
    }

    const card = document.createElement("div");
    card.classList.add("aluno-card");
    if (jaPagou) card.classList.add("aluno-pago");

    card.innerHTML = `
  <div class="aluno-premium-topo">
    <div>
      <h3>${aluno.nome}</h3>
      <p>📱 ${aluno.telefone}</p>
    </div>
    <span class="badge-status ${classeStatus}">${textoStatus}</span>
  </div>

  <div class="aluno-premium-grid">
    <div class="info-premium">
      <span>💰 Mensalidade</span>
      <strong>${formatarMoeda(aluno.valor)}</strong>
    </div>
    <div class="info-premium">
      <span>📅 ${jaPagou ? "Próx. vencimento" : "Vencimento"}</span>
      <strong>${formatarData(aluno.vencimento)}</strong>
    </div>
  </div>

  <div class="acoes-premium">
    <button class="acao-principal" onclick="marcarComoPago('${aluno.id}')">
    ✅ Registrar pagamento
    </button>
    <button class="acao-secundaria whatsapp" onclick="enviarWhatsApp('${aluno.id}')">💬 WhatsApp</button>

    <button class="acao-secundaria" onclick="abrirPaginaAluno('${aluno.codigo_publico}')">
      📄 Página do aluno
    </button>

    <button class="acao-secundaria" onclick="abrirHistorico('${aluno.id}')">🕘 Histórico</button>
    <button class="acao-secundaria" onclick="editarAluno('${aluno.id}')">✏ Editar</button>
    <button class="acao-secundaria" onclick="abrirEdicaoRapida('${aluno.id}')">⚡ Valor/Data</button>
    <button class="acao-perigo" onclick="removerAluno('${aluno.id}')">🗑 Remover</button>
  </div>
`;
    listaAlunos.appendChild(card);
  });

  // ── 5. Controles de paginação ─────────────────────────────────
  if (totalPaginas > 1) {
    const paginacao = document.createElement("div");
    paginacao.classList.add("paginacao");

    const btnAnterior = document.createElement("button");
    btnAnterior.textContent = "← Anterior";
    btnAnterior.disabled = paginaAtual === 1;
    btnAnterior.onclick = function() { paginaAtual--; mostrarAlunos(); window.scrollTo({ top: 0, behavior: "smooth" }); };

    const info = document.createElement("span");
    info.textContent = `Página ${paginaAtual} de ${totalPaginas}`;
    info.classList.add("paginacao-info");

    const btnProximo = document.createElement("button");
    btnProximo.textContent = "Próximo →";
    btnProximo.disabled = paginaAtual === totalPaginas;
    btnProximo.onclick = function() { paginaAtual++; mostrarAlunos(); window.scrollTo({ top: 0, behavior: "smooth" }); };

    paginacao.appendChild(btnAnterior);
    paginacao.appendChild(info);
    paginacao.appendChild(btnProximo);
    listaAlunos.appendChild(paginacao);
  }
}

// ===============================
// 17. DASHBOARD FINANCEIRO
// ===============================

/** Atualiza cards do dashboard: pagos, pendentes, atrasados, recebido e previsão. */
async function atualizarPainel() {
  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const { data: pagamentos, error } = await supabaseClient
    .from("pagamentos")
    .select("*")
    .gte("data_pagamento", primeiroDiaMes)
    .lte("data_pagamento", ultimoDiaMes);

  // IDs de alunos que já pagaram este mês
  const alunosQueJaPagaramIds = new Set(
    (pagamentos || []).map(p => String(p.aluno_id))
  );

  let pendentes = 0;
  let atrasados = 0;
  let valorAReceber = 0;
  let previsaoTotal = 0;

  alunos.forEach(function(aluno) {
    const jaPagou = alunosQueJaPagaramIds.has(String(aluno.id));
    previsaoTotal += Number(aluno.valor);

    if (!jaPagou) {
      const status = verificarStatus(aluno.vencimento);
      valorAReceber += Number(aluno.valor);

      if (status === "atrasado") {
        atrasados++;
      } else {
        pendentes++;
      }
    }
  });

  if (error) {
    console.log("Erro ao carregar pagamentos:", error.message);
    totalPagos.textContent = 0;
    totalRecebido.textContent = "R$ 0,00";
    totalPrevisao.textContent = previsaoTotal.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  } else {
    totalPagos.textContent = pagamentos.length;

    const recebido = pagamentos.reduce((total, pagamento) => {
      return total + Number(pagamento.valor);
    }, 0);

    totalRecebido.textContent = recebido.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });

    totalPrevisao.textContent = previsaoTotal.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  totalAlunos.textContent = alunos.length;
  totalPendentes.textContent = pendentes;
  totalAtrasados.textContent = atrasados;
  totalAReceber.textContent = valorAReceber.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

// ===============================
// 18. PAGAMENTOS — CONFIRMAR E REGISTRAR
// ===============================

/** Abre modal de confirmação antes de registrar pagamento. */
function marcarComoPago(id) {
  const aluno = alunos.find(a => String(a.id) === String(id));
  if (!aluno) {
    mostrarToast("Aluno não encontrado.", "erro");
    return;
  }

  pagamentoConfirmandoId = id;

  const calculoPagamento = calcularMensalidadesParaRegistrar(aluno.vencimento);
  const quantidade = calculoPagamento.mensalidades.length;
  const valorMensal = valorParaNumero(aluno.valor);
  const valorTotal = valorMensal * quantidade;

  textoConfirmarPagamento.innerHTML = `
    Confirmar pagamento de <strong>${aluno.nome}</strong>?<br>
    <span style="color:#a1a1aa; font-size:13px;">
      ${quantidade} mensalidade${quantidade > 1 ? "s" : ""} · Total: ${formatarMoeda(valorTotal)} · Novo vencimento: ${formatarData(calculoPagamento.novoVencimento)}
    </span>
  `;
  modalConfirmarPagamento.classList.remove("escondido");
}

btnCancelarPagamento.addEventListener("click", function() {
  pagamentoConfirmandoId = null;
  modalConfirmarPagamento.classList.add("escondido");
});

modalConfirmarPagamento.addEventListener("click", function(e) {
  if (e.target === modalConfirmarPagamento) {
    pagamentoConfirmandoId = null;
    modalConfirmarPagamento.classList.add("escondido");
  }
});

btnConfirmarPagamento.addEventListener("click", async function() {
  if (!pagamentoConfirmandoId) return;

  const id = pagamentoConfirmandoId;
  const aluno = alunos.find(a => String(a.id) === String(id));

  modalConfirmarPagamento.classList.add("escondido");
  pagamentoConfirmandoId = null;

  if (!aluno) {
    mostrarToast("Aluno não encontrado.", "erro");
    return;
  }

  btnConfirmarPagamento.disabled = true;

  const valorPagamento = valorParaNumero(aluno.valor);
  const calculoPagamento = calcularMensalidadesParaRegistrar(aluno.vencimento);

  const pagamentosParaInserir = calculoPagamento.mensalidades.map(() => ({
    aluno_id: aluno.id,
    user_id: aluno.user_id,
    valor: valorPagamento
  }));

  const { error: erroPagamento } = await supabaseClient
    .from("pagamentos")
    .insert(pagamentosParaInserir);

  if (erroPagamento) {
    btnConfirmarPagamento.disabled = false;
    mostrarToast("Erro ao registrar pagamento.", "erro");
    return;
  }

  const { error: erroAtualizarAluno } = await supabaseClient
    .from("alunos")
    .update({
      vencimento: calculoPagamento.novoVencimento
    })
    .eq("id", aluno.id);

  btnConfirmarPagamento.disabled = false;

  if (erroAtualizarAluno) {
    mostrarToast("Pagamento salvo, mas erro ao atualizar vencimento.", "erro");
    return;
  }

  await carregarAlunos();
  mostrarToast("✅ Pagamento registrado e vencimento atualizado!");
});

// ===============================
// 19. ALUNOS — REMOVER
// ===============================

/** Abre modal de confirmação para remover aluno. */
function removerAluno(id) {
  const aluno = alunos.find(a => String(a.id) === String(id));

  if (!aluno) {
    mostrarToast("Aluno não encontrado.", "erro");
    return;
  }

  alunoParaRemoverId = id;
  textoConfirmarRemocao.textContent = `Tem certeza que deseja remover ${aluno.nome}?`;
  modalConfirmarRemocao.classList.remove("escondido");
}

// ===============================
// 20. ALUNOS — EDITAR
// ===============================

/** Preenche o formulário principal com dados do aluno para edição completa. */
function editarAluno(id) {
  const aluno = alunos.find(a => String(a.id) === String(id));

  if (!aluno) {
   mostrarToast("Aluno não encontrado.", "erro");
    return;
  }

  alunoEditandoId = id;

  document.getElementById("nomeAluno").value = aluno.nome;
  document.getElementById("telefoneAluno").value = aluno.telefone;
  document.getElementById("valorMensalidade").value = formatarMoeda(aluno.valor);
  document.getElementById("dataVencimento").value = aluno.vencimento;

  tituloFormulario.textContent = "Editar aluno";
  btnFormulario.textContent = "Atualizar aluno";
  btnCancelarEdicao.classList.remove("escondido");

  modalAluno.classList.remove("escondido");

}

// ===============================
// 21. WHATSAPP — COBRANÇA INDIVIDUAL
// ===============================

/** Monta mensagem de cobrança individual e abre WhatsApp. */
function enviarWhatsApp(id) {
  const aluno = alunos.find(a => String(a.id) === String(id));

  if (!aluno) {
    mostrarToast("Aluno não encontrado.", "erro");
    return;
  }

  const data = formatarData(aluno.vencimento);
  const valorFmt = Number(aluno.valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

  const msg = `*${nomeEmpresa.toUpperCase()}*

Olá, *${aluno.nome}*. Tudo bem?

Identificamos que sua mensalidade com vencimento em *${data}* encontra-se em aberto.

*Valor:* ${valorFmt}

Caso o pagamento já tenha sido realizado, por favor desconsidere esta mensagem e nos envie o comprovante para confirmação no sistema.

Agradecemos pela atenção e permanecemos à disposição.`;

  const tel = aluno.telefone.replace(/\D/g, "");

  if (tel.length < 10) {
    mostrarToast("Telefone inválido. Cadastre com DDD. Ex: 31999999999", "erro");
    return;
  }

  window.open(
    `https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`,
    "_blank"
  );
}

// ===============================
// 22. ADMIN — CLIENTES, LIMITES E DASHBOARD
// ===============================

btnAdmin.addEventListener("click", async function() {
  app.classList.add("escondido");
  telaAdmin.classList.remove("escondido");

  await carregarClientes();
  await carregarDashboard();
});

btnVoltar.addEventListener("click", function() {
  telaAdmin.classList.add("escondido");
  app.classList.remove("escondido");
});

btnCriarUsuario.addEventListener("click", async function() {
  const email = novoEmail.value.trim();
  const senha = novaSenha.value.trim();

  if (!email || !senha) {
    msgAdmin.textContent = "Preencha email e senha.";
    return;
  }

  msgAdmin.textContent = "Criando usuário...";

  try {
    const res = await fetch("https://wdeyorkcrenibtkbgsjw.supabase.co/functions/v1/smart-function", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": CONFIG.supabaseAnonKey,
        "Authorization": `Bearer ${CONFIG.supabaseAnonKey}`
      },
      body: JSON.stringify({
        email: email,
        senha: senha
      })
    });

    const data = await res.json();

    console.log("Resposta criar usuário:", data);

    if (data.error) {
      msgAdmin.textContent = "Erro: " + data.error;
      return;
    }

    msgAdmin.textContent = "Usuário criado com sucesso!";

    novoEmail.value = "";
    novaSenha.value = "";

    await carregarClientes();
    await carregarDashboard();

  } catch (err) {
    console.log("Erro completo ao criar usuário:", err);
    msgAdmin.textContent = "Erro ao criar usuário.";
  }
});

/** Admin: carrega clientes e lista alunos de cada cliente. */
async function carregarClientes() {
  listaClientes.innerHTML = `<div class="skeleton-wrapper"><div class="skeleton-card"></div><div class="skeleton-card"></div></div>`;

  // Busca clientes e todos os alunos em paralelo
  const [{ data: clientes, error }, { data: todosAlunosAdmin }] = await Promise.all([
    supabaseClient.from("profiles").select("*"),
    supabaseClient.from("alunos").select("*").order("created_at", { ascending: false })
  ]);

  if (error) {
    mostrarToast("Erro ao carregar clientes.", "erro");
    return;
  }

  clientesCache = clientes;
  listaClientes.innerHTML = "";

  // Filtra só não-admins para a lista de clientes
  const clientesFiltrados = clientes.filter(c => !c.is_admin);

  if (clientesFiltrados.length === 0) {
    listaClientes.innerHTML = `<p style="color:#a1a1aa; text-align:center; padding:20px;">Nenhum cliente cadastrado ainda.</p>`;
    return;
  }

  clientesFiltrados.forEach(cliente => {
    const alunosDoCliente = (todosAlunosAdmin || []).filter(
      a => String(a.user_id) === String(cliente.id)
    );

    const total = alunosDoCliente.length;
    const limite = cliente.limite_alunos || 30;
    const porcentagem = Math.min(Math.round((total / limite) * 100), 100);
    const corBarra = porcentagem >= 100 ? "#ef4444" : porcentagem >= 75 ? "#facc15" : "#22c55e";

    const div = document.createElement("div");
    div.classList.add("cliente-card-v2");
    div.dataset.clienteId = cliente.id;

    div.innerHTML = `
      <div class="cliente-header-v2" onclick="toggleClienteAlunos('${cliente.id}')">
        <div class="cliente-header-esq">
          <div class="cliente-avatar">
            ${cliente.email.charAt(0).toUpperCase()}
          </div>
          <div>
            <strong class="cliente-email">${cliente.email}</strong>
            <div class="cliente-meta">
              <span class="badge-cliente">CLIENTE</span>
              <span class="cliente-contagem">${total} / ${limite} alunos</span>
            </div>
          </div>
        </div>
        <div class="cliente-header-dir">
          <button onclick="event.stopPropagation(); removerCliente('${cliente.id}')" class="btn-remover-cliente" title="Remover cliente">🗑</button>
          <span class="cliente-seta" id="seta-${cliente.id}">▼</span>
        </div>
      </div>

      <div class="cliente-barra-wrapper">
        <div class="cliente-barra-fundo">
          <div class="cliente-barra-fill" style="width:${porcentagem}%; background:${corBarra};"></div>
        </div>
        <span class="cliente-barra-label">${porcentagem}% do limite</span>
      </div>

      <div class="cliente-limite-row" onclick="event.stopPropagation()">
        <label>Limite de alunos:</label>
        <input type="number" id="limite-input-${cliente.id}" value="${limite}" min="1">
        <button class="btn-salvar-limite" onclick="alterarLimite('${cliente.id}')">Salvar</button>
      </div>

      <div class="cliente-alunos-lista escondido" id="alunos-cliente-${cliente.id}">
        ${renderizarAlunosDoCliente(alunosDoCliente)}
      </div>
    `;

    listaClientes.appendChild(div);
  });
}

/** Admin: gera HTML resumido dos alunos dentro do card do cliente. */
function renderizarAlunosDoCliente(alunosDoCliente) {
  if (alunosDoCliente.length === 0) {
    return `<p class="cliente-sem-alunos">Nenhum aluno cadastrado ainda.</p>`;
  }

  // Ordena: atrasados → vence hoje → pendentes → pagos
  const hoje = new Date();
  const dataHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  function statusAluno(vencimento) {
    const p = vencimento.split("-");
    const dv = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    const diff = Math.ceil((dv - dataHoje) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: `⚠ Atrasado ${Math.abs(diff)}d`, classe: "admin-status-atrasado", ordem: 1 };
    if (diff === 0) return { label: "📅 Vence hoje", classe: "admin-status-hoje", ordem: 2 };
    if (diff <= 3) return { label: `🔔 ${diff}d`, classe: "admin-status-pendente", ordem: 3 };
    return { label: `📆 ${diff}d`, classe: "admin-status-pendente", ordem: 4 };
  }

  const sorted = [...alunosDoCliente].sort((a, b) => {
    return statusAluno(a.vencimento).ordem - statusAluno(b.vencimento).ordem;
  });

  return sorted.map(aluno => {
    const st = statusAluno(aluno.vencimento);
    const p = aluno.vencimento.split("-");
    const dataFmt = `${p[2]}/${p[1]}/${p[0]}`;
    const valor = Number(aluno.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    return `
      <div class="admin-aluno-row">
        <div class="admin-aluno-info">
          <span class="admin-aluno-nome">${aluno.nome}</span>
          <span class="admin-aluno-detalhe">📱 ${aluno.telefone} · 💰 ${valor} · 📅 ${dataFmt}</span>
        </div>
        <span class="admin-badge-status ${st.classe}">${st.label}</span>
      </div>
    `;
  }).join("");
}

/** Admin: expande/recolhe lista de alunos de um cliente. */
function toggleClienteAlunos(clienteId) {
  const lista = document.getElementById(`alunos-cliente-${clienteId}`);
  const seta = document.getElementById(`seta-${clienteId}`);
  if (!lista) return;

  const aberto = !lista.classList.contains("escondido");
  lista.classList.toggle("escondido", aberto);
  if (seta) seta.textContent = aberto ? "▼" : "▲";
}

/** Admin: altera limite de alunos do cliente. */
async function alterarLimite(id) {
  const input = document.getElementById(`limite-input-${id}`);
  if (!input) return;

  const novoLimite = Number(input.value);
  if (!novoLimite || novoLimite < 1) {
    mostrarToast("Limite inválido.", "erro");
    return;
  }

  const { error } = await supabaseClient
    .from("profiles")
    .update({ limite_alunos: novoLimite })
    .eq("id", id);

  if (error) {
    mostrarToast("Erro ao atualizar limite.", "erro");
    return;
  }

  mostrarToast("✅ Limite atualizado com sucesso!");
  await carregarClientes();
}

/** Admin: atualiza números gerais do painel administrativo. */
async function carregarDashboard() {
  const { data: clientes, error: erroClientes } = await supabaseClient
    .from("profiles")
    .select("*");

  const { data: todosAlunos, error: erroAlunos } = await supabaseClient
    .from("alunos")
    .select("*");

  if (erroClientes || erroAlunos) {
    mostrarToast("Erro ao carregar dashboard.", "erro");
    return;
  }

  totalClientes.textContent = clientes.length;
  totalAlunosAdmin.textContent = todosAlunos.length;

  let noLimite = 0;

  clientes.forEach(cliente => {
    const alunosDoCliente = todosAlunos.filter(a => String(a.user_id) === String(cliente.id));

    if (alunosDoCliente.length >= cliente.limite_alunos) {
      noLimite++;
    }
  });

  clientesLimite.textContent = noLimite;
}

/** Admin: abre confirmação para remover cliente. */
function removerCliente(userId) {
  const perfil = clientesCache.find(c => c.id === userId);

  clienteParaRemoverId = userId;
  clienteParaRemoverEmail = perfil ? perfil.email : "este cliente";

  textoRemoverCliente.textContent =
    `Tem certeza que deseja remover ${clienteParaRemoverEmail}? Essa ação removerá a conta, alunos e pagamentos.`;

  modalRemoverCliente.classList.remove("escondido");
}

/** Define filtro atual da lista e atualiza botão ativo. */
function setFiltro(filtro) {
  filtroAtual = filtro;
  paginaAtual = 1;

  document.querySelectorAll(".filtros button").forEach(botao => {
    botao.classList.remove("filtro-ativo");
  });

  const mapa = {
    todos: "filtroTodos",
    pendente: "filtroPendente",
    atrasado: "filtroAtrasado",
    hoje: "filtroHoje",
    pago: "filtroPago"
  };

  const el = document.getElementById(mapa[filtro]);
  if (el) el.classList.add("filtro-ativo");

  mostrarAlunos();
}

// Histórico de pagamentos fica na versão com botão de deletar, definida mais abaixo.

campoBusca.addEventListener("input", function() {
  textoBusca = campoBusca.value.toLowerCase().trim();
  paginaAtual = 1;
  mostrarAlunos();
});

btnFecharModal.addEventListener("click", function() {
  modalHistorico.classList.add("escondido");
});

modalHistorico.addEventListener("click", function(event) {
  if (event.target === modalHistorico) {
    modalHistorico.classList.add("escondido");
  }
});

/** Exibe feedback temporário para o usuário. */
function mostrarToast(mensagem, tipo = "sucesso") {
  toast.textContent = mensagem;

  toast.className = "";
  toast.classList.add("toast", `toast-${tipo}`);
  toast.classList.remove("escondido");

  clearTimeout(toast._timeout);

  toast._timeout = setTimeout(() => {
    toast.classList.add("escondido");
  }, 3500);
}

/** Confirma remoção definitiva de aluno. */
async function confirmarRemocaoAluno() {
  if (!alunoParaRemoverId) return;

  const { error } = await supabaseClient
    .from("alunos")
    .delete()
    .eq("id", alunoParaRemoverId);

  if (error) {
    mostrarToast("Erro ao remover aluno.", "erro");
    return;
  }

  alunoParaRemoverId = null;
  modalConfirmarRemocao.classList.add("escondido");

  await carregarAlunos();

  mostrarToast("Aluno removido com sucesso!");
}

btnCancelarRemocao.addEventListener("click", function() {
  alunoParaRemoverId = null;
  modalConfirmarRemocao.classList.add("escondido");
});

btnConfirmarRemocao.addEventListener("click", confirmarRemocaoAluno);

modalConfirmarRemocao.addEventListener("click", function(event) {
  if (event.target === modalConfirmarRemocao) {
    alunoParaRemoverId = null;
    modalConfirmarRemocao.classList.add("escondido");
  }
});

/** Confirma remoção de cliente via Edge Function protegida. */
async function confirmarRemocaoCliente() {
  if (!clienteParaRemoverId) return;

  try {
    const res = await fetch("https://wdeyorkcrenibtkbgsjw.supabase.co/functions/v1/deletar-usuario", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": CONFIG.supabaseAnonKey,
        "Authorization": `Bearer ${CONFIG.supabaseAnonKey}`
      },
      body: JSON.stringify({ user_id: clienteParaRemoverId })
    });

    const data = await res.json();

    if (data.error) {
      mostrarToast(data.error, "erro");
      return;
    }

    modalRemoverCliente.classList.add("escondido");

    clienteParaRemoverId = null;
    clienteParaRemoverEmail = "";

    await carregarClientes();
    await carregarDashboard();
    await carregarAlunos();

    mostrarToast("Cliente removido com sucesso!");

  } catch (err) {
    console.log("Erro completo:", err);
    mostrarToast("Erro ao remover cliente.", "erro");
  }
}

btnCancelarRemoverCliente.addEventListener("click", function() {
  clienteParaRemoverId = null;
  clienteParaRemoverEmail = "";
  modalRemoverCliente.classList.add("escondido");
});

btnConfirmarRemoverCliente.addEventListener("click", confirmarRemocaoCliente);

modalRemoverCliente.addEventListener("click", function(event) {
  if (event.target === modalRemoverCliente) {
    clienteParaRemoverId = null;
    clienteParaRemoverEmail = "";
    modalRemoverCliente.classList.add("escondido");
  }
});

// ===============================
// 24. MODAL — CADASTRO / EDIÇÃO DE ALUNO
// ===============================

if (btnMostrarForm && modalAluno) {
  btnMostrarForm.onclick = function() {
    alunoEditandoId = null;

    formAluno.reset();

    tituloFormulario.textContent = "Cadastrar aluno";
    btnFormulario.textContent = "Cadastrar aluno";
    btnCancelarEdicao.classList.add("escondido");

    modalAluno.classList.remove("escondido");
  };
}

if (btnFecharModalAluno && modalAluno) {
  btnFecharModalAluno.onclick = function() {
    modalAluno.classList.add("escondido");
  };
}
// ===============================
// 25. NOTIFICAÇÃO DE VENCIMENTOS
// ===============================

/** Mostra alerta quando houver alunos atrasados ou vencendo hoje. */
function mostrarBannerVencimentos() {
  const hoje = new Date();
  const dataHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  let atrasados = 0;
  let venceHoje = 0;

  alunos.forEach(aluno => {
    if (alunosPagosMes.has(String(aluno.id))) return;
    const p = aluno.vencimento.split("-");
    const dv = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    const diff = Math.ceil((dv - dataHoje) / (1000 * 60 * 60 * 24));
    if (diff < 0) atrasados++;
    else if (diff === 0) venceHoje++;
  });

  if (atrasados === 0 && venceHoje === 0) {
    bannerVencimentos.classList.add("escondido");
    return;
  }

  let partes = [];
  if (atrasados > 0) partes.push(`⚠ ${atrasados} aluno${atrasados > 1 ? "s" : ""} atrasado${atrasados > 1 ? "s" : ""}`);
  if (venceHoje > 0) partes.push(`📅 ${venceHoje} vence${venceHoje > 1 ? "m" : ""} hoje`);

  textoBanner.textContent = partes.join("  ·  ");
  bannerVencimentos.classList.remove("escondido");

  btnBannerAtrasados.style.display = atrasados > 0 ? "inline-flex" : "none";
  btnBannerHoje.style.display = venceHoje > 0 ? "inline-flex" : "none";
}

btnFecharBanner.addEventListener("click", () => bannerVencimentos.classList.add("escondido"));
btnBannerAtrasados.addEventListener("click", () => { setFiltro("atrasado"); bannerVencimentos.classList.add("escondido"); });
btnBannerHoje.addEventListener("click", () => { setFiltro("hoje"); bannerVencimentos.classList.add("escondido"); });

// ===============================
// 26. COBRANÇA EM MASSA — ALUNOS ATRASADOS
// ===============================

btnCobrarAtrasados.addEventListener("click", function() {
  const hoje = new Date();
  const dataHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  const atrasados = alunos.filter(aluno => {
    if (alunosPagosMes.has(String(aluno.id))) return false;
    const p = aluno.vencimento.split("-");
    const dv = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return Math.ceil((dv - dataHoje) / (1000 * 60 * 60 * 24)) < 0;
  });

  if (atrasados.length === 0) {
    mostrarToast("Nenhum aluno atrasado no momento! 🎉");
    return;
  }

  listaCobrar.innerHTML = "";

  atrasados.forEach(aluno => {
    const dias = Math.abs(calcularDias(aluno.vencimento));
    const valor = Number(aluno.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const msg = encodeURIComponent(`Olá ${aluno.nome}, sua mensalidade de ${valor} está atrasada há ${dias} dia${dias > 1 ? "s" : ""}. Por favor, entre em contato para regularizar. Obrigado!`);
    const telefone = aluno.telefone.replace(/\D/g, "");
    const telefoneValido = telefone.length >= 10;
    const link = telefoneValido ? `https://wa.me/55${telefone}?text=${msg}` : "#";

    const div = document.createElement("div");
    div.classList.add("cobrar-item");
    div.innerHTML = `
      <div class="cobrar-info">
        <span class="cobrar-nome">${aluno.nome}</span>
        <span class="cobrar-detalhe">${valor} · ${dias}d atrasado</span>
      </div>
      <a href="${link}" target="_blank" class="btn-cobrar-item" onclick="${telefoneValido ? "" : "event.preventDefault(); mostrarToast('Telefone inválido. Cadastre com DDD.', 'erro');"}">💬 Cobrar</a>
    `;
    listaCobrar.appendChild(div);
  });

  modalCobrar.classList.remove("escondido");
});

btnFecharModalCobrar.addEventListener("click", () => modalCobrar.classList.add("escondido"));
modalCobrar.addEventListener("click", e => { if (e.target === modalCobrar) modalCobrar.classList.add("escondido"); });

// ===============================
// 27. UTILITÁRIOS — MÁSCARA MONETÁRIA
// ===============================

const inputValor = document.getElementById("valorMensalidade");

/** Permite apenas caracteres compatíveis com valor monetário. */
function limparCampoMoedaDuranteDigitacao(input) {
  input.value = input.value.replace(/[^\d,.]/g, "");
}

/** Formata campo de valor ao sair do input. */
function formatarCampoMoeda(input) {
  const numero = valorParaNumero(input.value);

  if (!numero) {
    input.value = "";
    return;
  }

  input.value = formatarMoeda(numero);
}

inputValor.addEventListener("input", function() {
  limparCampoMoedaDuranteDigitacao(this);
});

inputValor.addEventListener("blur", function() {
  formatarCampoMoeda(this);
});


// ===============================
// 28. RELATÓRIO — EXPORTAR EXCEL / PDF
// ===============================

/** Monta HTML completo do relatório mensal para exportação. */
function montarRelatorioMensalHTML() {
  const hoje = new Date();
  const mesAno = hoje.toLocaleString("pt-BR", { month: "long", year: "numeric" });

  const totalAlunosRel = alunos.length;
  let pagos = 0;
  let pendentes = 0;
  let atrasados = 0;
  let recebido = 0;
  let aReceber = 0;
  let previsao = 0;

  const linhas = alunos.map(aluno => {
    const pago = alunosPagosMes.has(String(aluno.id));
    const status = pago ? "Pago" : (verificarStatus(aluno.vencimento) === "atrasado" ? "Atrasado" : "Pendente");
    const valor = valorParaNumero(aluno.valor);
    previsao += valor;
    if (pago) {
      pagos++;
      recebido += valor;
    } else {
      aReceber += valor;
      if (status === "Atrasado") atrasados++; else pendentes++;
    }

    return `
      <tr>
        <td>${aluno.nome}</td>
        <td>${aluno.telefone}</td>
        <td>${formatarMoeda(valor)}</td>
        <td>${formatarData(aluno.vencimento)}</td>
        <td>${status}</td>
      </tr>`;
  }).join("");

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório Mensalize - ${mesAno}</title>
      <style>
        body { font-family: Arial, sans-serif; color:#111827; }
        h1 { color:#7c3aed; margin-bottom:4px; }
        .sub { color:#6b7280; margin-bottom:20px; }
        .resumo { display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin-bottom:20px; }
        .box { border:1px solid #ddd; border-radius:10px; padding:10px; }
        .box span { display:block; color:#6b7280; font-size:12px; }
        .box strong { font-size:18px; }
        table { width:100%; border-collapse:collapse; }
        th { background:#7c3aed; color:white; text-align:left; }
        th, td { border:1px solid #ddd; padding:8px; font-size:13px; }
        tr:nth-child(even) { background:#f8f8ff; }
        @media print { .no-print { display:none; } }
      </style>
    </head>
    <body>
      <button class="no-print" onclick="window.print()">Salvar como PDF</button>
      <h1>Relatório Mensalize</h1>
      <div class="sub">${mesAno}</div>
      <div class="resumo">
        <div class="box"><span>Total de alunos</span><strong>${totalAlunosRel}</strong></div>
        <div class="box"><span>Pagos</span><strong>${pagos}</strong></div>
        <div class="box"><span>Pendentes</span><strong>${pendentes}</strong></div>
        <div class="box"><span>Atrasados</span><strong>${atrasados}</strong></div>
        <div class="box"><span>Recebido</span><strong>${formatarMoeda(recebido)}</strong></div>
        <div class="box"><span>A receber</span><strong>${formatarMoeda(aReceber)}</strong></div>
        <div class="box"><span>Previsão do mês</span><strong>${formatarMoeda(previsao)}</strong></div>
      </div>
      <table>
        <thead>
          <tr><th>Nome</th><th>Telefone</th><th>Mensalidade</th><th>Vencimento</th><th>Status</th></tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </body>
    </html>`;
}

btnExportar.addEventListener("click", function() {
  const hoje = new Date();
  const mesAno = hoje
    .toLocaleString("pt-BR", { month: "long", year: "numeric" })
    .replace(" ", "-");

  const html = montarRelatorioMensalHTML();

  const blob = new Blob(["\ufeff" + html], {
    type: "application/vnd.ms-excel;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = `mensalize-relatorio-${mesAno}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);

  mostrarToast("📥 Relatório Excel gerado com sucesso!");
});

// ===============================
// 29. HISTÓRICO — DELETAR PAGAMENTO
// ===============================

/** Remove um pagamento específico do histórico. */
async function deletarPagamento(pagamentoId, alunoId) {
  const { error } = await supabaseClient
    .from("pagamentos")
    .delete()
    .eq("id", pagamentoId);

  if (error) {
    mostrarToast("Erro ao remover pagamento.", "erro");
    return;
  }

  mostrarToast("Pagamento removido.");
  await carregarAlunos();
  abrirHistorico(alunoId);
}

// Histórico com botão de deletar pagamento
/** Abre modal com dados do aluno e histórico de pagamentos. */
async function abrirHistorico(alunoId) {
  const aluno = alunos.find(a => String(a.id) === String(alunoId));

  if (!aluno) {
    mostrarToast("Aluno não encontrado.", "erro");
    return;
  }

  const status = verificarStatus(aluno.vencimento);
  const dias = calcularDias(aluno.vencimento);
  let textoStatus = "Pendente", classeStatus = "status-pendente";
  if (status === "atrasado") { textoStatus = `Atrasado há ${Math.abs(dias)}d`; classeStatus = "status-atrasado"; }
  else if (dias === 0) { textoStatus = "Vence hoje"; classeStatus = "status-hoje"; }
  else if (dias <= 3) { textoStatus = `Vence em ${dias}d`; classeStatus = "status-pendente"; }

  modalNomeAluno.textContent = aluno.nome;
  modalInfoAluno.innerHTML = `
    <p><strong>WhatsApp:</strong> ${aluno.telefone}</p>
    <p><strong>Mensalidade:</strong> ${formatarMoeda(aluno.valor)}</p>
    <p><strong>Vencimento atual:</strong> ${formatarData(aluno.vencimento)}</p>
    <p><strong>Status:</strong> <span class="${classeStatus}">${textoStatus}</span></p>
  `;
  modalListaPagamentos.innerHTML = "<p>Carregando histórico...</p>";
  modalHistorico.classList.remove("escondido");

  const { data, error } = await supabaseClient
    .from("pagamentos").select("*")
    .eq("aluno_id", alunoId)
    .order("data_pagamento", { ascending: false });

  if (error) { modalListaPagamentos.innerHTML = "<p>Erro ao carregar histórico.</p>"; return; }
  if (!data.length) { modalListaPagamentos.innerHTML = "<p style='color:#a1a1aa;text-align:center;padding:20px;'>Nenhum pagamento registrado ainda.</p>"; return; }

  modalListaPagamentos.innerHTML = "";
  data.forEach(pagamento => {
    const div = document.createElement("div");
    div.classList.add("pagamento-item");
    const valor = Number(pagamento.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    div.innerHTML = `
      <span>${formatarData(pagamento.data_pagamento)}</span>
      <strong>${valor}</strong>
      <button onclick="deletarPagamento('${pagamento.id}', '${alunoId}')" class="btn-deletar-pagamento" title="Remover pagamento">🗑</button>
    `;
    modalListaPagamentos.appendChild(div);
  });
}

// ===============================
// 30. EDIÇÃO RÁPIDA — VALOR E VENCIMENTO
// ===============================

/** Abre modal rápido para alterar apenas valor e vencimento. */
function abrirEdicaoRapida(alunoId) {
  const aluno = alunos.find(a => String(a.id) === String(alunoId));
  if (!aluno) {
    mostrarToast("Aluno não encontrado.", "erro");
    return;
  }

  edicaoRapidaAlunoId.value = aluno.id;
  edicaoRapidaNome.textContent = aluno.nome;
  edicaoRapidaValor.value = formatarMoeda(aluno.valor);
  edicaoRapidaVencimento.value = aluno.vencimento;
  modalEdicaoRapida.classList.remove("escondido");
}

/** Fecha modal de edição rápida e limpa o ID selecionado. */
function fecharEdicaoRapida() {
  modalEdicaoRapida.classList.add("escondido");
  edicaoRapidaAlunoId.value = "";
}

btnFecharEdicaoRapida.addEventListener("click", fecharEdicaoRapida);
btnCancelarEdicaoRapida.addEventListener("click", fecharEdicaoRapida);
modalEdicaoRapida.addEventListener("click", e => { if (e.target === modalEdicaoRapida) fecharEdicaoRapida(); });

edicaoRapidaValor.addEventListener("input", function() {
  limparCampoMoedaDuranteDigitacao(this);
});

edicaoRapidaValor.addEventListener("blur", function() {
  formatarCampoMoeda(this);
});

btnSalvarEdicaoRapida.addEventListener("click", async function() {
  const id = edicaoRapidaAlunoId.value;
  const valor = valorParaNumero(edicaoRapidaValor.value);
  const vencimento = edicaoRapidaVencimento.value;

  if (!id || !valor || !vencimento) {
    mostrarToast("Preencha valor e vencimento.", "erro");
    return;
  }

  btnSalvarEdicaoRapida.disabled = true;

  const { error } = await supabaseClient
    .from("alunos")
    .update({ valor, vencimento })
    .eq("id", id);

  btnSalvarEdicaoRapida.disabled = false;

  if (error) {
    mostrarToast("Erro ao atualizar valor/data.", "erro");
    return;
  }

  fecharEdicaoRapida();
  await carregarAlunos();
  mostrarToast("⚡ Valor e vencimento atualizados!");
});

// ===============================
// 31. GRÁFICO — RECEBIMENTOS DOS ÚLTIMOS 6 MESES
// ===============================

/** Busca recebimentos dos últimos 6 meses e renderiza gráfico simples em barras. */
async function carregarGrafico() {
  const areaGrafico = document.getElementById("areaGrafico");
  const graficoBars = document.getElementById("graficoBars");

  areaGrafico.classList.remove("escondido");
  graficoBars.innerHTML = `<p style="color:#a1a1aa;text-align:center;padding:20px;">Carregando gráfico...</p>`;

  const hoje = new Date();
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    meses.push({
      label: d.toLocaleString("pt-BR", { month: "short" }),
      ano: d.getFullYear(),
      mes: d.getMonth() + 1,
      inicio: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0],
      fim: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0]
    });
  }

  const { data: pagamentos } = await supabaseClient
    .from("pagamentos").select("valor, data_pagamento")
    .gte("data_pagamento", meses[0].inicio)
    .lte("data_pagamento", meses[5].fim);

  const totais = meses.map(m => {
    const total = (pagamentos || [])
      .filter(p => p.data_pagamento >= m.inicio && p.data_pagamento <= m.fim)
      .reduce((sum, p) => sum + Number(p.valor), 0);
    return { ...m, total };
  });

  const maxVal = Math.max(...totais.map(t => t.total), 1);

  graficoBars.innerHTML = totais.map(m => {
    const pct = Math.round((m.total / maxVal) * 100);
    const label = m.total > 0 ? m.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0";
    const isMesAtual = m.mes === hoje.getMonth() + 1 && m.ano === hoje.getFullYear();
    return `
      <div class="grafico-col">
        <div class="grafico-valor">${label}</div>
        <div class="grafico-barra-wrap">
          <div class="grafico-barra ${isMesAtual ? "grafico-barra-atual" : ""}" style="height:${Math.max(pct, 3)}%"></div>
        </div>
        <div class="grafico-label">${m.label}</div>
      </div>
    `;
  }).join("");
}

document.getElementById("btnFecharGrafico").addEventListener("click", () => {
  document.getElementById("areaGrafico").classList.add("escondido");
});

// Abre o gráfico ao clicar em "Recebido no mês"
document.querySelector(".card.receita").style.cursor = "pointer";
document.querySelector(".card.receita").addEventListener("click", carregarGrafico);
document.querySelector(".card.receita").title = "Clique para ver gráfico";

// ===============================
// 32. TEMA — CLARO / ESCURO
// ===============================

/** Aplica tema visual e salva preferência no localStorage. */
function aplicarTema(tema) {
  document.documentElement.setAttribute("data-tema", tema);
  btnTema.textContent = tema === "claro" ? "🌙" : "☀️";
  localStorage.setItem("mensalize-tema", tema);
}

btnTema.addEventListener("click", () => {
  const atual = document.documentElement.getAttribute("data-tema");
  aplicarTema(atual === "claro" ? "escuro" : "claro");
});

// Aplica tema salvo
const temaSalvo = localStorage.getItem("mensalize-tema") || "escuro";
aplicarTema(temaSalvo);

//ABRIR PAGINA DO ALUNO

function abrirPaginaAluno(codigo) {
  if (!codigo) {
    mostrarToast("Código público do aluno não encontrado.", "erro");
    return;
  }

  const link = `${window.location.origin}/aluno.html?codigo=${codigo}`;

  window.open(link, "_blank");
}