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


let adminFiltroClientesAtual = "todos";
let adminBuscaClientesTexto = "";

function normalizarAdminTexto(valor) {
  return String(valor || "").trim().toLowerCase();
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

function clientePassaFiltroAdmin(cliente, alunosDoCliente) {
  const total = alunosDoCliente.length;
  const limite = Number(cliente.limite_alunos || 30);
  const texto = `${cliente.email || ""} ${cliente.nome_empresa || ""}`.toLowerCase();
  const plano = cliente.plano || "trial";
  const status = cliente.status || "ativo";
  const podeUsar = cliente.pode_usar !== false;

  if (adminBuscaClientesTexto && !texto.includes(adminBuscaClientesTexto)) return false;

  if (adminFiltroClientesAtual === "todos") return true;
  if (adminFiltroClientesAtual === "ativo") return status !== "bloqueado" && podeUsar;
  if (adminFiltroClientesAtual === "bloqueado") return status === "bloqueado" || !podeUsar;
  if (["trial", "basic", "pro", "premium"].includes(adminFiltroClientesAtual)) return plano === adminFiltroClientesAtual;
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
  const limite = Number(cliente.limite_alunos || 30);
  const porcentagem = Math.min(Math.round((total / limite) * 100), 100);
  const corBarra = porcentagem >= 100 ? "#ef4444" : porcentagem >= 75 ? "#facc15" : "#22c55e";
  const resumoPlano = obterResumoPlanoAdmin(cliente.plano || "trial");
  const statusBloqueado = cliente.status === "bloqueado" || cliente.pode_usar === false;

  const div = document.createElement("div");
  div.classList.add("cliente-card-v2", "cliente-card-admin-pro");
  div.dataset.clienteId = cliente.id;

  div.innerHTML = `
    <div class="cliente-header-v2 cliente-header-admin-pro" onclick="toggleClienteAlunos('${cliente.id}')">
      <div class="cliente-header-esq">
        <div class="cliente-avatar">
          ${(cliente.nome_empresa || cliente.email || "C").charAt(0).toUpperCase()}
        </div>
        <div>
          <strong class="cliente-email">${cliente.nome_empresa || cliente.email}</strong>
          <div class="cliente-meta">
            <span class="badge-cliente">${resumoPlano.nome}</span>
            <span class="badge-cliente ${statusBloqueado ? "badge-bloqueado" : "badge-ativo"}">${statusBloqueado ? "Bloqueado" : "Ativo"}</span>
            <span class="cliente-contagem">${total} / ${limite} alunos</span>
          </div>
          ${cliente.nome_empresa ? `<small class="cliente-email-secundario">${cliente.email}</small>` : ""}
        </div>
      </div>
      <div class="cliente-header-dir">
        <button onclick="event.stopPropagation(); removerCliente('${cliente.id}')" class="btn-remover-cliente" title="Remover cliente">🗑</button>
        <button type="button" class="btn-gerenciar-cliente" onclick="event.stopPropagation(); toggleClienteAlunos('${cliente.id}')">Gerenciar</button>
        <span class="cliente-seta" id="seta-${cliente.id}">▼</span>
      </div>
    </div>

    <div class="cliente-barra-wrapper">
      <div class="cliente-barra-fundo">
        <div class="cliente-barra-fill" style="width:${porcentagem}%; background:${corBarra};"></div>
      </div>
      <span class="cliente-barra-label">${porcentagem}% do limite</span>
    </div>

    <div class="cliente-limite-row cliente-limite-row-clean" onclick="event.stopPropagation()">
      <label>Limite de alunos</label>
      <input type="number" id="limite-input-${cliente.id}" value="${limite}" min="1">
      <button class="btn-salvar-limite" onclick="alterarLimite('${cliente.id}')">Salvar limite</button>
    </div>

    <div class="cliente-detalhes-admin escondido" id="detalhes-cliente-${cliente.id}">
      <div class="admin-modulos-box admin-planos-box" onclick="event.stopPropagation()">
        <div class="admin-modulos-titulo admin-modulos-titulo-v2">
          <div>
            <strong>Plano do cliente</strong>
            <span>Escolha o plano. Os módulos são liberados automaticamente pelo pacote.</span>
          </div>
          <span class="admin-plano-badge" id="plano-badge-${cliente.id}">${resumoPlano.tag}</span>
        </div>

        <div class="admin-planos-opcoes-grid">
          ${renderizarRecursosPlanoAdmin("trial")}
          ${renderizarRecursosPlanoAdmin("basic")}
          ${renderizarRecursosPlanoAdmin("pro")}
          ${renderizarRecursosPlanoAdmin("premium")}
        </div>

        <div class="admin-plano-grid admin-plano-grid-v3">
          <div class="admin-config-item admin-config-destaque">
            <label>Plano escolhido</label>
            <select id="plano-${cliente.id}" onchange="aplicarPresetPlanoCliente('${cliente.id}', this.value)">
              <option value="trial" ${cliente.plano === "trial" ? "selected" : ""}>Trial</option>
              <option value="basic" ${cliente.plano === "basic" ? "selected" : ""}>Basic</option>
              <option value="pro" ${cliente.plano === "pro" ? "selected" : ""}>Pro</option>
              <option value="premium" ${cliente.plano === "premium" ? "selected" : ""}>Premium</option>
            </select>
            <small id="plano-resumo-${cliente.id}">${resumoPlano.descricao}</small>
          </div>

          <div class="admin-config-item">
            <label>Status da conta</label>
            <select id="status-${cliente.id}">
              <option value="ativo" ${cliente.status === "ativo" ? "selected" : ""}>Ativo</option>
              <option value="bloqueado" ${cliente.status === "bloqueado" ? "selected" : ""}>Bloqueado</option>
            </select>
          </div>

          <label class="admin-toggle admin-toggle-acesso admin-toggle-acesso-v3">
            <span>
              <strong>🔓 Acesso ao sistema</strong>
              <small>Libera ou bloqueia o login.</small>
            </span>
            <input type="checkbox" id="pode-usar-${cliente.id}" ${cliente.pode_usar !== false ? "checked" : ""}>
          </label>
        </div>

        <div class="admin-plano-aplicado-box">
          <div>
            <strong>Recursos que serão liberados</strong>
            <small id="plano-limite-sugerido-${cliente.id}">${obterConfigPlanoAdmin(cliente.plano || "trial").limite} alunos sugeridos</small>
          </div>
          <div id="plano-recursos-${cliente.id}">
            ${renderizarRecursosPlanoSelecionado(cliente.plano || "trial")}
          </div>
        </div>

        <div class="admin-plano-row admin-plano-row-v2">
          <button class="btn-salvar-modulos" onclick="salvarPermissoesCliente('${cliente.id}')">
            Salvar plano
          </button>
        </div>
      </div>

      <div class="cliente-alunos-lista" id="alunos-cliente-${cliente.id}">
        ${renderizarAlunosDoCliente(alunosDoCliente)}
      </div>
    </div>
  `;

  listaClientes.appendChild(div);
}


const PLANOS_MENSALIZE_ADMIN = {
  trial: {
    nome: "Trial",
    tag: "Teste",
    preco: "R$ 0,00 / 30 dias",
    limite: 30,
    descricao: "Teste gratuito para o professor conhecer o Mensalize com as funções essenciais.",
    destaque: "Para demonstração, parceria e validação inicial.",
    modulos: {
      modulo_evolucao: false,
      modulo_presenca: false,
      modulo_avisos: false,
      modulo_ranking: false,
      modulo_desafio: false,
      modulo_turmas: false
    },
    recursos: [
      "Até 30 alunos",
      "Cadastro de alunos",
      "Controle de mensalidades",
      "Página do aluno",
      "Pix copia e cola",
      "Cobrança via WhatsApp",
      "Solicitação de confirmação de pagamento"
    ]
  },
  basic: {
    nome: "Basic",
    tag: "Entrada",
    preco: "R$ 29,90/mês",
    limite: 50,
    descricao: "Plano de entrada para professor pequeno ou turma única.",
    destaque: "Para organizar alunos, mensalidades, avisos e aniversários.",
    modulos: {
      modulo_evolucao: false,
      modulo_presenca: false,
      modulo_avisos: true,
      modulo_ranking: false,
      modulo_desafio: false,
      modulo_turmas: false
    },
    recursos: [
      "Até 50 alunos",
      "Tudo do Trial",
      "Avisos",
      "Aniversariantes",
      "Financeiro mensal",
      "Página individual do aluno"
    ]
  },
  pro: {
    nome: "Pro",
    tag: "Mais vendido",
    preco: "R$ 49,90/mês",
    limite: 150,
    descricao: "Plano principal para academia de jiu-jitsu ou artes marciais.",
    destaque: "Para vender como pacote principal do Mensalize.",
    modulos: {
      modulo_evolucao: true,
      modulo_presenca: true,
      modulo_avisos: true,
      modulo_ranking: true,
      modulo_desafio: true,
      modulo_turmas: true
    },
    recursos: [
      "Até 150 alunos",
      "Tudo do Basic",
      "Turmas",
      "Presenças",
      "Ranking de presença",
      "Desafio de presença",
      "Evolução/graduação",
      "Aulas canceladas"
    ]
  },
  premium: {
    nome: "Premium",
    tag: "Academia",
    preco: "R$ 79,90/mês",
    limite: 300,
    descricao: "Plano completo para academia maior ou cliente com operação mais avançada.",
    destaque: "Para clientes com mais alunos, suporte mais próximo e tudo liberado.",
    modulos: {
      modulo_evolucao: true,
      modulo_presenca: true,
      modulo_avisos: true,
      modulo_ranking: true,
      modulo_desafio: true,
      modulo_turmas: true
    },
    recursos: [
      "Até 300 alunos",
      "Tudo do Pro",
      "Todos os módulos liberados",
      "Suporte prioritário",
      "Configuração inicial assistida",
      "Ajustes simples sob demanda"
    ]
  }
};

function obterConfigPlanoAdmin(plano) {
  return PLANOS_MENSALIZE_ADMIN[plano] || PLANOS_MENSALIZE_ADMIN.trial;
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
  return `
    <div class="admin-plano-resumo-card" id="plano-card-${plano}">
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
}

function obterPermissoesDoPlanoAdmin(plano) {
  const config = obterConfigPlanoAdmin(plano);
  return { ...config.modulos };
}

/** Admin: carrega clientes e lista alunos de cada cliente. */
async function carregarClientes() {
  listaClientes.innerHTML = `<div class="skeleton-wrapper"><div class="skeleton-card"></div><div class="skeleton-card"></div></div>`;
  inicializarFiltrosClientesAdmin();

  const [{ data: clientes, error }, { data: todosAlunosAdmin }] = await Promise.all([
    supabaseClient.from("profiles").select(`
  id,
  email,
  nome_empresa,
  limite_alunos,
  is_admin,
  whatsapp_professor,

  modulo_evolucao,
  modulo_presenca,
  modulo_avisos,

  modulo_ranking,
  modulo_desafio,
  modulo_turmas,

  plano,
  status,
  pode_usar
`),
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
  const { data: clientes, error: erroClientes } = await supabaseClient
    .from("profiles")
    .select("id,email,nome_empresa,limite_alunos,is_admin,whatsapp_professor,modulo_evolucao,modulo_presenca,modulo_avisos");

  const { data: todosAlunos, error: erroAlunos } = await supabaseClient
    .from("alunos")
    .select("id,user_id,nome,telefone,valor,vencimento,status_pagamento,link_pagamento,codigo_publico,created_at,foto_url,modalidade,faixa,grau,turma,status_aluno,data_nascimento,data_ultima_graduacao,tempo_avaliacao_meses,observacoes_internas,data_aula_experimental,observacoes_experimental,responsavel_nome,responsavel_whatsapp");

  if (erroClientes || erroAlunos) {
    console.error("Erro ao carregar dashboard admin:", {
      erroClientes,
      erroAlunos
    });

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

// Histórico de pagamentos fica na versão com botão de deletar, definida mais abaixo.

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


async function salvarPermissoesCliente(clienteId) {
  const plano = document.getElementById(`plano-${clienteId}`)?.value || "trial";
  const status = document.getElementById(`status-${clienteId}`)?.value || "ativo";
  const podeUsar = document.getElementById(`pode-usar-${clienteId}`)?.checked !== false;
  const limiteInput = document.getElementById(`limite-input-${clienteId}`);
  const limite = Number(limiteInput?.value || obterConfigPlanoAdmin(plano).limite);
  const permissoes = obterPermissoesDoPlanoAdmin(plano);

  const { error } = await supabaseClient
    .from("profiles")
    .update({
      plano: plano,
      status: status,
      pode_usar: podeUsar,
      limite_alunos: limite,
      ...permissoes
    })
    .eq("id", clienteId);

  if (error) {
    console.log(error);
    mostrarToast("Erro ao salvar plano.", "erro");
    return;
  }

  mostrarToast("✅ Plano salvo e permissões aplicadas!");
  await carregarClientes();
  await carregarDashboard();
}