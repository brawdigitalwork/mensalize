// 22. ADMIN — CLIENTES, LIMITES E DASHBOARD
// ===============================

if (btnAdmin) {
  btnAdmin.addEventListener("click", async function() {
    if (!usuarioEhAdmin) {
      mostrarToast("Acesso admin não liberado para este usuário.", "erro");
      return;
    }

    try {
      document.body.classList.remove("menu-aberto");

      telaLogin.classList.add("escondido");
      app.classList.add("escondido");
      telaAdmin.classList.remove("escondido");

      if (listaClientes) {
        listaClientes.innerHTML = `
          <div class="skeleton-wrapper">
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
          </div>
        `;
      }

      await carregarClientes();
      await carregarDashboard();

    } catch (erro) {
      console.error("Erro ao abrir painel admin:", erro);
      mostrarToast("Erro ao abrir painel admin. Veja o console.", "erro");

      telaLogin.classList.add("escondido");
      app.classList.add("escondido");
      telaAdmin.classList.remove("escondido");
    }
  });
}

if (btnVoltar) {
  btnVoltar.addEventListener("click", function() {
    telaAdmin.classList.add("escondido");
    telaLogin.classList.add("escondido");
    app.classList.remove("escondido");
  });
}

/** Chama uma Edge Function administrativa usando a sessão real do Admin. */
async function executarEdgeAdmin(nomeFuncao, payload) {
  if (!usuarioEhAdmin) {
    throw new Error("Acesso permitido somente ao Administrador do Mensalize.");
  }

  const { data: sessaoData, error: sessaoError } = await supabaseClient.auth.getSession();
  const accessToken = sessaoData?.session?.access_token;

  if (sessaoError || !accessToken) {
    throw new Error("Sua sessão expirou. Entre novamente para continuar.");
  }

  const resposta = await fetch(`${CONFIG.supabaseUrl}/functions/v1/${nomeFuncao}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": CONFIG.supabaseAnonKey,
      "Authorization": `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  const resultado = await resposta.json().catch(() => ({}));

  if (!resposta.ok || resultado.error) {
    throw new Error(resultado.error || "Não foi possível concluir a operação administrativa.");
  }

  return resultado;
}

btnCriarUsuario.addEventListener("click", async function() {
  const email = novoEmail.value.trim();
  const senha = novaSenha.value.trim();

  if (!email || !senha) {
    msgAdmin.textContent = "Preencha email e senha.";
    return;
  }

  btnCriarUsuario.disabled = true;
  const textoBotaoOriginal = btnCriarUsuario.textContent;
  btnCriarUsuario.textContent = "Criando...";
  msgAdmin.textContent = "Criando usuário...";

  try {
    const data = await executarEdgeAdmin("smart-function", {
      email: email,
      senha: senha
    });

    console.log("Resposta criar usuário:", data);

    msgAdmin.textContent = "Usuário criado com sucesso!";

    novoEmail.value = "";
    novaSenha.value = "";

    await carregarClientes();
    await carregarDashboard();

  } catch (err) {
    console.log("Erro completo ao criar usuário:", err);
    msgAdmin.textContent = "Erro: " + (err?.message || "Não foi possível criar o usuário.");
  } finally {
    btnCriarUsuario.disabled = false;
    btnCriarUsuario.textContent = textoBotaoOriginal;
  }
});


let adminFiltroClientesAtual = "todos";
let adminBuscaClientesTexto = "";

function normalizarAdminTexto(valor) {
  return String(valor || "").trim().toLowerCase();
}

/** Escapa textos externos antes de inseri-los em innerHTML do painel Admin. */
function escaparHtmlAdmin(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function adminDataISOHoje() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

function adminSomarDiasDataISO(dataISO, dias) {
  const partes = String(dataISO || adminDataISOHoje()).split("-");
  const data = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  data.setDate(data.getDate() + Number(dias || 0));
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

function adminDataInputTrial(valor) {
  return valor ? String(valor).split("T")[0] : "";
}

function adminCalcularDiasTrial(cliente) {
  if (normalizarPlano(cliente?.plano) !== "trial") return null;

  const fim = adminDataInputTrial(cliente?.trial_fim);
  if (!fim) return null;

  const partes = fim.split("-");
  const dataFim = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  const hoje = new Date();
  const hojeLocal = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  if (Number.isNaN(dataFim.getTime())) return null;
  return Math.ceil((dataFim - hojeLocal) / (1000 * 60 * 60 * 24));
}

function adminResumoTrialCliente(cliente) {
  if (normalizarPlano(cliente?.plano) !== "trial") return "Controle disponível apenas para clientes em Teste Gratuito.";

  const dias = adminCalcularDiasTrial(cliente);
  const fim = adminDataInputTrial(cliente?.trial_fim);

  if (!fim) return "Defina uma data final para controlar o trial pelo Admin.";
  if (dias === null) return "Data final do trial inválida.";
  if (dias < 0) return `Trial encerrado há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"}.`;
  if (dias === 0) return "Trial termina hoje.";
  if (dias === 1) return "Trial termina amanhã.";
  return `Faltam ${dias} dias para o fim do trial.`;
}

function adminPrepararTrialAoSelecionarPlano(clienteId, plano) {
  const inicioInput = document.getElementById(`trial-inicio-${clienteId}`);
  const fimInput = document.getElementById(`trial-fim-${clienteId}`);
  const resumoEl = document.getElementById(`trial-resumo-${clienteId}`);

  if (!inicioInput || !fimInput) return;

  if (plano === "trial") {
    if (!inicioInput.value) inicioInput.value = adminDataISOHoje();
    if (!fimInput.value) fimInput.value = adminSomarDiasDataISO(inicioInput.value, 30);
  }

  if (resumoEl) {
    if (plano !== "trial") {
      resumoEl.textContent = "Trial não é usado neste plano.";
    } else {
      resumoEl.textContent = `Trial configurado de ${inicioInput.value || "--/--/----"} até ${fimInput.value || "--/--/----"}.`;
    }
  }
}

// ---------------------------------------------------------------
// NORMALIZAÇÃO DE PLANOS LEGADOS
// Converte planos descontinuados para seus equivalentes atuais.
// fight   → pro   (mesmo conjunto de módulos)
// premium → pro   (mesmo conjunto de módulos)
// O valor original permanece no banco; esta função é usada apenas
// para resolução de configurações e exibição no admin.
// ---------------------------------------------------------------
function normalizarPlano(plano) {
  if (plano === "fight" || plano === "premium") return "pro";
  if (plano === "basic") return "basic";
  if (plano === "trial") return "trial";
  if (plano === "pro") return "pro";
  return "trial"; // fallback seguro
}

function inicializarFiltrosClientesAdmin() {
  const inputBusca = document.getElementById("adminBuscaClientes");
  const botoesFiltro = document.querySelectorAll("[data-admin-filtro-clientes]");

  if (inputBusca && !inputBusca.dataset.inicializado) {
    inputBusca.dataset.inicializado = "true";
    inputBusca.addEventListener("input", () => {
      adminBuscaClientesTexto = normalizarAdminTexto(inputBusca.value);
      renderizarClientesAdminCache();
    });
  }

  botoesFiltro.forEach(botao => {
    if (botao.dataset.inicializado) return;
    botao.dataset.inicializado = "true";
    botao.addEventListener("click", () => {
      adminFiltroClientesAtual = botao.dataset.adminFiltroClientes || "todos";
      botoesFiltro.forEach(btn => btn.classList.toggle("ativo", btn === botao));
      renderizarClientesAdminCache();
    });
  });
}

let clientesAdminUltimosAlunos = [];
let adminTrialColunasDisponiveis = true;

function clientePassaFiltroAdmin(cliente, alunosDoCliente) {
  const total = alunosDoCliente.length;
  const limite = Number(cliente.limite_alunos || 30);
  const texto = `${cliente.email || ""} ${cliente.nome_empresa || ""}`.toLowerCase();
  const plano = cliente.plano || "trial";
  const planoNormalizado = normalizarPlano(plano);
  const status = cliente.status || "ativo";
  const podeUsar = cliente.pode_usar !== false;

  if (adminBuscaClientesTexto && !texto.includes(adminBuscaClientesTexto)) return false;

  if (adminFiltroClientesAtual === "todos") return true;
  if (adminFiltroClientesAtual === "ativo") return status !== "bloqueado" && podeUsar;
  if (adminFiltroClientesAtual === "bloqueado") return status === "bloqueado" || !podeUsar;

  // Filtros por plano: compara pelo valor normalizado para incluir legados
  // Ex: filtro "pro" captura clientes com plano "fight" ou "premium" no banco
  if (["trial", "basic", "pro"].includes(adminFiltroClientesAtual)) {
    return planoNormalizado === adminFiltroClientesAtual;
  }

  if (adminFiltroClientesAtual === "limite") return total >= limite;

  return true;
}

function renderizarClientesAdminCache() {
  if (!listaClientes) return;

  const clientesBase = (clientesCache || []).filter(c => !c.is_admin);
  const todosAlunosAdmin = clientesAdminUltimosAlunos || [];
  const clientesFiltrados = clientesBase.filter(cliente => {
    const alunosDoCliente = todosAlunosAdmin.filter(a => String(a.user_id) === String(cliente.id));
    return clientePassaFiltroAdmin(cliente, alunosDoCliente);
  });

  listaClientes.innerHTML = "";

  if (clientesBase.length === 0) {
    listaClientes.innerHTML = `<p class="admin-empty-state">Nenhum cliente cadastrado ainda.</p>`;
    return;
  }

  if (clientesFiltrados.length === 0) {
    listaClientes.innerHTML = `<p class="admin-empty-state">Nenhum cliente encontrado para esse filtro.</p>`;
    return;
  }

  clientesFiltrados.forEach(cliente => renderizarCardClienteAdmin(cliente, todosAlunosAdmin));
}

function renderizarCardClienteAdmin(cliente, todosAlunosAdmin) {
  const alunosDoCliente = (todosAlunosAdmin || []).filter(
    a => String(a.user_id) === String(cliente.id)
  );

  const total = alunosDoCliente.length;
  const limite = Math.max(Number(cliente.limite_alunos || 30), 1);
  const porcentagem = Math.min(Math.round((total / limite) * 100), 100);
  const resumoPlano = obterResumoPlanoAdmin(cliente.plano || "trial");
  const statusBloqueado = cliente.status === "bloqueado" || cliente.pode_usar === false;
  const statusTexto = statusBloqueado ? "Bloqueado" : "Ativo";
  const progressoClasse = porcentagem >= 100 ? "danger" : porcentagem >= 80 ? "warn" : "ok";
  const trialInicio = adminDataInputTrial(cliente.trial_inicio);
  const trialFim = adminDataInputTrial(cliente.trial_fim);
  const resumoTrial = adminResumoTrialCliente(cliente);
  const diasTrial = adminCalcularDiasTrial(cliente);
  const nomeClienteRaw = cliente.nome_empresa || cliente.email || "Cliente Mensalize";
  const nomeClienteSeguro = escaparHtmlAdmin(nomeClienteRaw);
  const emailClienteSeguro = escaparHtmlAdmin(cliente.email || "");
  const inicialClienteSegura = escaparHtmlAdmin(String(nomeClienteRaw).charAt(0).toUpperCase() || "C");
  const planoLegadoSeguro = escaparHtmlAdmin(cliente.plano || "");
  const trialInicioSeguro = escaparHtmlAdmin(trialInicio);
  const trialFimSeguro = escaparHtmlAdmin(trialFim);
  const resumoTrialSeguro = escaparHtmlAdmin(resumoTrial);
  const trialChip = normalizarPlano(cliente.plano) === "trial" && diasTrial !== null
    ? `<span class="admin-chip ${diasTrial <= 0 ? "bloqueado" : "plano"}">${diasTrial <= 0 ? "Trial encerrado" : `${diasTrial}d trial`}</span>`
    : "";

  // Detecta se o cliente usa plano legado para exibir aviso informativo
  const planoLegado = ["fight", "premium"].includes(cliente.plano);
  const avisoLegado = planoLegado
    ? `<p class="admin-plano-legado-aviso">Este cliente usa um plano legado (${planoLegadoSeguro}) — equivalente ao Mensalize Pro.</p>`
    : "";

  // Monta select apenas com planos comerciais ativos
  // Planos legados não aparecem como opção para novos clientes
  const selectPlano = `
    <select id="plano-${cliente.id}" onchange="aplicarPresetPlanoCliente('${cliente.id}', this.value)">
      <option value="trial" ${normalizarPlano(cliente.plano) === "trial" ? "selected" : ""}>Teste Gratuito</option>
      <option value="basic" ${normalizarPlano(cliente.plano) === "basic" ? "selected" : ""}>Mensalize</option>
      <option value="pro" ${normalizarPlano(cliente.plano) === "pro" ? "selected" : ""}>Mensalize Pro</option>
    </select>
  `;

  const div = document.createElement("div");
  div.classList.add("admin-simple-card");
  div.dataset.clienteId = cliente.id;

  div.innerHTML = `
    <div class="admin-simple-head">
      <button type="button" class="admin-simple-main" onclick="toggleClienteAlunos('${cliente.id}')">
        <span class="admin-simple-avatar">${inicialClienteSegura}</span>
        <span class="admin-simple-title-wrap">
          <strong>${nomeClienteSeguro}</strong>
          ${cliente.nome_empresa ? `<small>${emailClienteSeguro}</small>` : `<small>Cliente Mensalize</small>`}
        </span>
      </button>

      <div class="admin-simple-actions">
        <span class="admin-chip plano">${resumoPlano.nome}</span>
        ${trialChip}
        <span class="admin-chip ${statusBloqueado ? "bloqueado" : "ativo"}">${statusTexto}</span>
        <button type="button" class="admin-simple-manage" onclick="toggleClienteAlunos('${cliente.id}')">
          Gerenciar
        </button>
        <button type="button" class="admin-simple-delete" onclick="event.stopPropagation(); removerCliente('${cliente.id}')" title="Remover cliente">
          🗑
        </button>
      </div>
    </div>

    <div class="admin-simple-usage">
      <div>
        <strong>${total} / ${limite}</strong>
        <span>alunos usados</span>
      </div>
      <div class="admin-simple-progress">
        <i class="${progressoClasse}" style="width:${porcentagem}%"></i>
      </div>
      <small>${porcentagem}% do limite</small>
    </div>

    <div class="admin-simple-panel escondido" id="detalhes-cliente-${cliente.id}" onclick="event.stopPropagation()">
      ${!adminTrialColunasDisponiveis ? `
        <div class="admin-simple-warning">
          <strong>SQL do trial ainda não foi aplicado</strong>
          <span>As datas aparecem na tela, mas não serão salvas enquanto as colunas trial_inicio e trial_fim não existirem em profiles.</span>
        </div>
      ` : ""}
      <div class="admin-simple-grid">
        <label class="admin-simple-field">
          <span>Plano</span>
          ${selectPlano}
          ${avisoLegado}
          <small id="plano-resumo-${cliente.id}">${resumoPlano.descricao}</small>
        </label>

        <label class="admin-simple-field">
          <span>Status</span>
          <select id="status-${cliente.id}" onchange="sincronizarAcessoClienteAdmin('${cliente.id}')">
            <option value="ativo" ${cliente.status === "ativo" ? "selected" : ""}>Ativo</option>
            <option value="bloqueado" ${cliente.status === "bloqueado" ? "selected" : ""}>Bloqueado</option>
          </select>
          <small>Bloqueado impede o cliente de usar o app.</small>
        </label>

        <label class="admin-simple-field">
          <span>Início do trial</span>
          <input type="date" id="trial-inicio-${cliente.id}" value="${trialInicioSeguro}">
          <small>Data usada para contar o Teste Gratuito.</small>
        </label>

        <label class="admin-simple-field">
          <span>Fim do trial</span>
          <input type="date" id="trial-fim-${cliente.id}" value="${trialFimSeguro}">
          <small id="trial-resumo-${cliente.id}">${resumoTrialSeguro}</small>
        </label>

        <label class="admin-simple-field">
          <span>Limite de alunos</span>
          <input type="number" id="limite-input-${cliente.id}" value="${limite}" min="1">
          <small id="plano-limite-sugerido-${cliente.id}">Sugestão do plano: ${obterConfigPlanoAdmin(cliente.plano || "trial").limite} alunos</small>
        </label>

        <label class="admin-simple-access">
          <span>
            <strong>Acesso ao sistema</strong>
            <small>Controle direto do login do cliente.</small>
          </span>
          <input type="checkbox" id="pode-usar-${cliente.id}" ${!statusBloqueado ? "checked" : ""}>
        </label>
      </div>

      <div class="admin-simple-modules">
        <div>
          <strong>Módulos liberados</strong>
          <small>Definidos automaticamente pelo plano escolhido.</small>
        </div>
        <div id="plano-recursos-${cliente.id}" class="admin-simple-module-list">
          ${renderizarRecursosPlanoSelecionado(cliente.plano || "trial")}
        </div>
      </div>

      <div class="admin-simple-footer">
        <button type="button" class="admin-simple-save" onclick="salvarPermissoesCliente('${cliente.id}')">
          Salvar alterações
        </button>
      </div>

      <details class="admin-simple-students">
        <summary>Ver alunos desse cliente (${total})</summary>
        <div class="cliente-alunos-lista" id="alunos-cliente-${cliente.id}">
          ${renderizarAlunosDoCliente(alunosDoCliente)}
        </div>
      </details>
    </div>
  `;

  listaClientes.appendChild(div);
}

function sincronizarAcessoClienteAdmin(clienteId) {
  const status = document.getElementById(`status-${clienteId}`)?.value || "ativo";
  const acesso = document.getElementById(`pode-usar-${clienteId}`);

  if (!acesso) return;

  if (status === "bloqueado") {
    acesso.checked = false;
    acesso.disabled = true;
  } else {
    acesso.disabled = false;
  }
}

// ---------------------------------------------------------------
// CONFIGURAÇÃO DOS PLANOS COMERCIAIS
//
// Apenas trial, basic e pro são planos comerciais ativos.
// fight e premium são aliases de retrocompatibilidade — apontam
// diretamente para a config do pro via normalizarPlano(), sem
// duplicar módulos ou recursos.
// ---------------------------------------------------------------
const PLANOS_MENSALIZE_ADMIN = {
  trial: {
    nome: "Teste Gratuito",
    tag: "Teste",
    preco: "Grátis por 30 dias",
    limite: 30,
    descricao: "Experimente o Mensalize com todos os recursos liberados durante o período de teste.",
    destaque: "Conheça o sistema completo sem compromisso.",
    modulos: {
      modulo_fight: true,
      modulo_evolucao: true,
      modulo_presenca: true,
      modulo_avisos: true,
      modulo_ranking: true,
      modulo_desafio: true,
      modulo_turmas: true,
    },
    recursos: [
      "Todos os recursos liberados",
      "Até 30 alunos",
      "Cadastro de alunos",
      "Financeiro",
      "Turmas",
      "Presenças",
      "Ranking",
      "Desafio da Aula",
      "Graduação",
      "Solicitações",
      "Área do aluno"
    ]
  },

  basic: {
    nome: "Mensalize",
    tag: "⭐ Mais escolhido",
    preco: "R$ 49,90/mês",
    limite: 100,
    descricao: "Ideal para academias que querem organizar alunos, mensalidades e a rotina administrativa.",
    destaque: "Gestão simples, rápida e profissional.",
    modulos: {
      modulo_fight: false,
      modulo_evolucao: false,
      modulo_presenca: false,
      modulo_avisos: true,
      modulo_ranking: false,
      modulo_desafio: false,
      modulo_turmas: false,
    },
    recursos: [
      "Até 100 alunos",
      "Cadastro de alunos",
      "Controle financeiro",
      "Mensalidades",
      "Cobranças via WhatsApp",
      "Avisos",
      "Dashboard",
      "Área do aluno",
      "Perfil completo do aluno"
    ]
  },

  pro: {
    nome: "Mensalize Pro",
    tag: "Completo",
    preco: "R$ 89,90/mês",
    limite: 300,
    descricao: "Gestão completa da academia com acompanhamento da evolução dos alunos.",
    destaque: "Todos os recursos do Mensalize liberados.",
    modulos: {
      modulo_fight: true,
      modulo_evolucao: true,
      modulo_presenca: true,
      modulo_avisos: true,
      modulo_ranking: true,
      modulo_desafio: true,
      modulo_turmas: true,
    },
    recursos: [
      "Até 300 alunos",
      "Tudo do Mensalize",
      "Turmas",
      "Presenças",
      "Ranking",
      "Desafio da Aula",
      "Graduação",
      "Solicitações",
      "Frequência inteligente",
      "Programa de graduação",
      "Links de técnicas",
      "Todos os recursos futuros"
    ]
  }
};

/**
 * Retorna a configuração de um plano.
 * Planos legados (fight, premium) são normalizados para pro.
 * Plano desconhecido cai em trial como fallback seguro.
 */
function obterConfigPlanoAdmin(plano) {
  const planoNormalizado = normalizarPlano(plano);
  return PLANOS_MENSALIZE_ADMIN[planoNormalizado] || PLANOS_MENSALIZE_ADMIN.trial;
}

function obterResumoPlanoAdmin(plano) {
  const config = obterConfigPlanoAdmin(plano);
  return {
    nome: config.nome,
    descricao: config.descricao,
    tag: config.tag
  };
}

function renderizarRecursosPlanoAdmin(plano) {
  const config = obterConfigPlanoAdmin(plano);
  const chave = normalizarPlano(plano);
  return `
    <div class="admin-plano-resumo-card" id="plano-card-${chave}">
      <div class="admin-plano-resumo-topo">
        <span class="admin-plano-badge-mini">${config.tag}</span>
        <strong>${config.nome}</strong>
      </div>
      <span class="admin-plano-preco">${config.preco || ""}</span>
      <p>${config.destaque}</p>
      <ul>
        ${config.recursos.map(recurso => `<li>${recurso}</li>`).join("")}
      </ul>
    </div>
  `;
}

function renderizarRecursosPlanoSelecionado(plano) {
  const config = obterConfigPlanoAdmin(plano);
  return `
    <div class="admin-recursos-plano-lista">
      <span class="admin-recurso-preco">${config.preco || ""}</span>
      ${config.recursos.map(recurso => `<span>✓ ${recurso}</span>`).join("")}
    </div>
  `;
}

function aplicarPresetPlanoCliente(clienteId, planoSelecionado) {
  const plano = planoSelecionado || document.getElementById(`plano-${clienteId}`)?.value || "trial";
  const config = obterConfigPlanoAdmin(plano);
  const resumo = obterResumoPlanoAdmin(plano);

  const limiteInput = document.getElementById(`limite-input-${clienteId}`);
  const recursosEl = document.getElementById(`plano-recursos-${clienteId}`);
  const resumoEl = document.getElementById(`plano-resumo-${clienteId}`);
  const badgeEl = document.getElementById(`plano-badge-${clienteId}`);
  const limiteSugeridoEl = document.getElementById(`plano-limite-sugerido-${clienteId}`);

  if (limiteInput && Number(limiteInput.value || 0) < config.limite) {
    limiteInput.value = config.limite;
  }

  if (recursosEl) recursosEl.innerHTML = renderizarRecursosPlanoSelecionado(plano);
  if (resumoEl) resumoEl.textContent = resumo.descricao;
  if (badgeEl) badgeEl.textContent = resumo.tag;
  if (limiteSugeridoEl) limiteSugeridoEl.textContent = `${config.limite} alunos sugeridos`;
  adminPrepararTrialAoSelecionarPlano(clienteId, plano);
}

function obterPermissoesDoPlanoAdmin(plano) {
  const config = obterConfigPlanoAdmin(plano);
  return { ...config.modulos };
}

const CAMPOS_CLIENTES_ADMIN_BASE = `
  id,
  email,
  nome_empresa,
  limite_alunos,
  is_admin,
  whatsapp_professor,
  modulo_fight,
  modulo_evolucao,
  modulo_presenca,
  modulo_avisos,
  modulo_ranking,
  modulo_desafio,
  modulo_turmas,
  plano,
  status,
  pode_usar
`;

const CAMPOS_CLIENTES_ADMIN_COM_TRIAL = `${CAMPOS_CLIENTES_ADMIN_BASE},
  trial_inicio,
  trial_fim`;

function erroAdminColunaTrial(error) {
  const mensagem = String(error?.message || "").toLowerCase();
  return mensagem.includes("trial_inicio") || mensagem.includes("trial_fim") || mensagem.includes("column");
}

async function buscarClientesAdminComFallback() {
  let resultado = await supabaseClient.from("profiles").select(CAMPOS_CLIENTES_ADMIN_COM_TRIAL);

  if (!resultado.error) {
    adminTrialColunasDisponiveis = true;
    return resultado;
  }
  if (!erroAdminColunaTrial(resultado.error)) return resultado;

  adminTrialColunasDisponiveis = false;
  console.warn("Campos trial_inicio/trial_fim ainda não existem em profiles. Admin usando fallback temporário sem controle profissional de trial.");

  resultado = await supabaseClient.from("profiles").select(CAMPOS_CLIENTES_ADMIN_BASE);
  if (resultado.data) {
    resultado.data = resultado.data.map(cliente => ({
      ...cliente,
      trial_inicio: null,
      trial_fim: null
    }));
  }

  return resultado;
}

/** Admin: carrega clientes e lista alunos de cada cliente. */
async function carregarClientes() {
  listaClientes.innerHTML = `<div class="skeleton-wrapper"><div class="skeleton-card"></div><div class="skeleton-card"></div></div>`;
  inicializarFiltrosClientesAdmin();

  const [{ data: clientes, error }, { data: todosAlunosAdmin }] = await Promise.all([
    buscarClientesAdminComFallback(),
    supabaseClient.from("alunos").select("id,user_id,nome,telefone,valor,vencimento,status_pagamento,created_at").order("created_at", { ascending: false })
  ]);

  if (error) {
    mostrarToast("Erro ao carregar clientes.", "erro");
    return;
  }

  clientesCache = clientes || [];
  clientesAdminUltimosAlunos = todosAlunosAdmin || [];
  renderizarClientesAdminCache();
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
    const valor = valorParaNumero(aluno.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const nomeAlunoSeguro = escaparHtmlAdmin(aluno.nome || "Aluno");
    const telefoneAlunoSeguro = escaparHtmlAdmin(aluno.telefone || "Não informado");

    return `
      <div class="admin-aluno-row">
        <div class="admin-aluno-info">
          <span class="admin-aluno-nome">${nomeAlunoSeguro}</span>
          <span class="admin-aluno-detalhe">📱 ${telefoneAlunoSeguro} · 💰 ${valor} · 📅 ${dataFmt}</span>
        </div>
        <span class="admin-badge-status ${st.classe}">${st.label}</span>
      </div>
    `;
  }).join("");
}

/** Admin: expande/recolhe lista de alunos de um cliente. */
function toggleClienteAlunos(clienteId) {
  const detalhes = document.getElementById(`detalhes-cliente-${clienteId}`);
  const seta = document.getElementById(`seta-${clienteId}`);
  if (!detalhes) return;

  const aberto = !detalhes.classList.contains("escondido");
  detalhes.classList.toggle("escondido", aberto);
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
  await carregarDashboard();
}

/** Admin: atualiza números gerais do painel administrativo. */
async function carregarDashboard() {
  const { data: clientes, error: erroClientes } = await buscarClientesAdminComFallback();

  const { data: todosAlunos, error: erroAlunos } = await supabaseClient
    .from("alunos")
    .select("id,user_id,nome,telefone,valor,vencimento,status_pagamento,link_pagamento,codigo_publico,created_at,foto_url,modalidade,faixa,grau,turma,status_aluno,data_nascimento,data_ultima_graduacao,tempo_avaliacao_meses,observacoes_internas,data_aula_experimental,observacoes_experimental,responsavel_nome,responsavel_whatsapp");

  if (erroClientes || erroAlunos) {
    console.error("Erro ao carregar dashboard admin:", { erroClientes, erroAlunos });
    mostrarToast("Erro ao carregar dashboard.", "erro");
    return;
  }

  const clientesBase = (clientes || []).filter(cliente => !cliente.is_admin);
  const alunosBase = todosAlunos || [];

  const ativos = clientesBase.filter(cliente => cliente.status !== "bloqueado" && cliente.pode_usar !== false).length;
  const bloqueados = clientesBase.filter(cliente => cliente.status === "bloqueado" || cliente.pode_usar === false).length;

  let noLimite = 0;

  clientesBase.forEach(cliente => {
    const limite = Number(cliente.limite_alunos || 30);
    const alunosDoCliente = alunosBase.filter(a => String(a.user_id) === String(cliente.id));
    if (alunosDoCliente.length >= limite) noLimite++;
  });

  const elTotalClientes = document.getElementById("totalClientes");
  const elTotalAlunos = document.getElementById("totalAlunosAdmin");
  const elClientesLimite = document.getElementById("clientesLimite");
  const elAtivos = document.getElementById("clientesAtivosAdmin");
  const elBloqueados = document.getElementById("clientesBloqueadosAdmin");

  if (elTotalClientes) elTotalClientes.textContent = clientesBase.length;
  if (elTotalAlunos) elTotalAlunos.textContent = alunosBase.length;
  if (elClientesLimite) elClientesLimite.textContent = noLimite;
  if (elAtivos) elAtivos.textContent = ativos;
  if (elBloqueados) elBloqueados.textContent = bloqueados;
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

/** Define filtro atual da lista de alunos e atualiza botão ativo. */
function setFiltro(filtro) {
  const filtroSeguro = FILTROS_ALUNOS_VALIDOS.includes(filtro) ? filtro : "todos";
  filtroAtual = filtroSeguro;

  try {
    localStorage.setItem("mensalize_filtro", filtroAtual);
  } catch (erro) {
    console.log("Não foi possível salvar o filtro:", erro.message);
  }

  sincronizarEstado();
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

  const el = document.getElementById(mapa[filtroAtual]);
  if (el) el.classList.add("filtro-ativo");

  mostrarAlunos();
}

campoBusca.addEventListener("input", function() {
  textoBusca = campoBusca.value.toLowerCase().trim();
  paginaAtual = 1;
  sincronizarEstado();
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
    await executarEdgeAdmin("deletar-usuario", { user_id: clienteParaRemoverId });

    modalRemoverCliente.classList.add("escondido");

    clienteParaRemoverId = null;
    clienteParaRemoverEmail = "";

    await carregarClientes();
    await carregarDashboard();
    await carregarAlunos();

    mostrarToast("Cliente removido com sucesso!");

  } catch (err) {
    console.log("Erro completo:", err);
    mostrarToast(err?.message || "Erro ao remover cliente.", "erro");
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

async function salvarPermissoesCliente(clienteId) {
  const plano = document.getElementById(`plano-${clienteId}`)?.value || "trial";
  const status = document.getElementById(`status-${clienteId}`)?.value || "ativo";
  const podeUsarCheckbox = document.getElementById(`pode-usar-${clienteId}`);
  const podeUsar = status !== "bloqueado" && podeUsarCheckbox?.checked !== false;
  const limiteInput = document.getElementById(`limite-input-${clienteId}`);
  const botaoSalvar = document.querySelector(`[onclick="salvarPermissoesCliente('${clienteId}')"]`);

  if (status === "bloqueado" && podeUsarCheckbox) {
    podeUsarCheckbox.checked = false;
  }

  const limite = Number(limiteInput?.value || obterConfigPlanoAdmin(plano).limite);
  const permissoes = obterPermissoesDoPlanoAdmin(plano);
  const trialInicioInput = document.getElementById(`trial-inicio-${clienteId}`);
  const trialFimInput = document.getElementById(`trial-fim-${clienteId}`);

  // Mantém as datas informadas mesmo quando o plano não é trial.
  // Isso evita o efeito ruim de o Admin preencher a data, salvar e o campo voltar vazio.
  let trialInicio = trialInicioInput?.value || null;
  let trialFim = trialFimInput?.value || null;

  if (plano === "trial") {
    trialInicio = trialInicio || adminDataISOHoje();
    trialFim = trialFim || adminSomarDiasDataISO(trialInicio, 30);
  }

  if (trialInicioInput && trialInicio) trialInicioInput.value = trialInicio;
  if (trialFimInput && trialFim) trialFimInput.value = trialFim;

  if (trialInicio && trialFim && trialFim < trialInicio) {
    mostrarToast("A data final do trial não pode ser menor que a data inicial.", "erro");
    return;
  }

  if (!adminTrialColunasDisponiveis) {
    mostrarToast("Rode primeiro o SQL do trial no Supabase. As colunas trial_inicio/trial_fim ainda não existem.", "erro");
    return;
  }

  const payloadPermissoes = {
    plano: plano,
    status: status,
    pode_usar: podeUsar,
    limite_alunos: limite,
    trial_inicio: trialInicio,
    trial_fim: trialFim,
    ...permissoes
  };

  const textoOriginalBotao = botaoSalvar?.textContent || "Salvar alterações";
  if (botaoSalvar) {
    botaoSalvar.disabled = true;
    botaoSalvar.textContent = "Salvando...";
  }

  const { data: perfilSalvo, error } = await supabaseClient
    .from("profiles")
    .update(payloadPermissoes)
    .eq("id", clienteId)
    .select("id,plano,status,pode_usar,limite_alunos,trial_inicio,trial_fim")
    .single();

  if (botaoSalvar) {
    botaoSalvar.disabled = false;
    botaoSalvar.textContent = textoOriginalBotao;
  }

  if (error) {
    console.log(error);

    if (erroAdminColunaTrial(error)) {
      adminTrialColunasDisponiveis = false;
      mostrarToast("Não salvou: falta rodar o SQL do trial no Supabase.", "erro");
      return;
    }

    mostrarToast("Erro ao salvar plano. Veja o Console.", "erro");
    return;
  }

  const inicioSalvo = adminDataInputTrial(perfilSalvo?.trial_inicio);
  const fimSalvo = adminDataInputTrial(perfilSalvo?.trial_fim);

  if ((trialInicio || "") !== inicioSalvo || (trialFim || "") !== fimSalvo) {
    console.warn("Datas do trial não bateram após salvar:", {
      esperado: { trialInicio, trialFim },
      salvo: { inicioSalvo, fimSalvo }
    });
    mostrarToast("Plano salvo, mas as datas do trial não confirmaram no banco. Confira RLS/SQL.", "erro");
    await carregarClientes();
    await carregarDashboard();
    return;
  }

  mostrarToast(status === "bloqueado" ? "🔒 Cliente bloqueado com sucesso." : "✅ Plano e datas do trial salvos!");
  await carregarClientes();
  await carregarDashboard();
}
