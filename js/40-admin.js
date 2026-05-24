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


function obterResumoPlanoAdmin(plano) {
  const mapa = {
    trial: {
      nome: "Trial",
      descricao: "Teste controlado, ideal para liberar acesso inicial sem entregar todos os módulos.",
      tag: "Teste"
    },
    basic: {
      nome: "Basic",
      descricao: "Plano básico para gestão financeira, alunos e ranking essencial.",
      tag: "Entrada"
    },
    pro: {
      nome: "Pro",
      descricao: "Plano completo com presença, turmas, desafio e recursos avançados.",
      tag: "Completo"
    }
  };

  return mapa[plano] || mapa.trial;
}

function aplicarPresetPlanoCliente(clienteId, planoSelecionado) {
  const plano = planoSelecionado || document.getElementById(`plano-${clienteId}`)?.value || "trial";
  const resumo = obterResumoPlanoAdmin(plano);

  const ranking = document.getElementById(`mod-ranking-${clienteId}`);
  const desafio = document.getElementById(`mod-desafio-${clienteId}`);
  const turmas = document.getElementById(`mod-turmas-${clienteId}`);
  const resumoEl = document.getElementById(`plano-resumo-${clienteId}`);
  const badgeEl = document.getElementById(`plano-badge-${clienteId}`);

  if (plano === "trial") {
    if (ranking) ranking.checked = true;
    if (desafio) desafio.checked = false;
    if (turmas) turmas.checked = false;
  }

  if (plano === "basic") {
    if (ranking) ranking.checked = true;
    if (desafio) desafio.checked = true;
    if (turmas) turmas.checked = false;
  }

  if (plano === "pro") {
    if (ranking) ranking.checked = true;
    if (desafio) desafio.checked = true;
    if (turmas) turmas.checked = true;
  }

  if (resumoEl) resumoEl.textContent = resumo.descricao;
  if (badgeEl) badgeEl.textContent = resumo.tag;
}

/** Admin: carrega clientes e lista alunos de cada cliente. */
async function carregarClientes() {
  listaClientes.innerHTML = `<div class="skeleton-wrapper"><div class="skeleton-card"></div><div class="skeleton-card"></div></div>`;

  // Busca clientes e todos os alunos em paralelo
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

      <div class="cliente-limite-row cliente-limite-row-clean" onclick="event.stopPropagation()">
        <label>Limite de alunos:</label>
        <input type="number" id="limite-input-${cliente.id}" value="${limite}" min="1">
        <button class="btn-salvar-limite" onclick="alterarLimite('${cliente.id}')">Salvar</button>
        <span class="cliente-limite-hint">Clique no cliente para ver plano, permissões e alunos.</span>
      </div>

      <div class="cliente-detalhes-admin escondido" id="detalhes-cliente-${cliente.id}">

<div class="admin-modulos-box admin-planos-box" onclick="event.stopPropagation()">

  <div class="admin-modulos-titulo admin-modulos-titulo-v2">
    <div>
      <strong>Plano e permissões</strong>
      <span>Controle o que o cliente pode acessar. O professor não altera isso no Perfil.</span>
    </div>
    <span class="admin-plano-badge" id="plano-badge-${cliente.id}">${obterResumoPlanoAdmin(cliente.plano || "trial").tag}</span>
  </div>

  <div class="admin-plano-grid">
    <div class="admin-config-item admin-config-destaque">
      <label>Plano do cliente</label>
      <select id="plano-${cliente.id}" onchange="aplicarPresetPlanoCliente('${cliente.id}', this.value)">
        <option value="trial" ${cliente.plano === "trial" ? "selected" : ""}>Trial</option>
        <option value="basic" ${cliente.plano === "basic" ? "selected" : ""}>Basic</option>
        <option value="pro" ${cliente.plano === "pro" ? "selected" : ""}>Pro</option>
      </select>
      <small id="plano-resumo-${cliente.id}">${obterResumoPlanoAdmin(cliente.plano || "trial").descricao}</small>
    </div>

    <div class="admin-config-item">
      <label>Status da conta</label>
      <select id="status-${cliente.id}">
        <option value="ativo" ${cliente.status === "ativo" ? "selected" : ""}>Ativo</option>
        <option value="bloqueado" ${cliente.status === "bloqueado" ? "selected" : ""}>Bloqueado</option>
      </select>
    </div>
  </div>

  <div class="admin-modulos-grid admin-modulos-grid-v2">

    <label class="admin-toggle admin-toggle-acesso">
      <span>
        <strong>🔓 Acesso ao sistema</strong>
        <small>Bloqueia ou libera o login do cliente.</small>
      </span>
      <input type="checkbox" id="pode-usar-${cliente.id}" ${cliente.pode_usar !== false ? "checked" : ""}>
    </label>

    <label class="admin-toggle">
      <span>
        <strong>🏆 Ranking</strong>
        <small>Ranking de presença na área do aluno.</small>
      </span>
      <input type="checkbox" id="mod-ranking-${cliente.id}" ${cliente.modulo_ranking !== false ? "checked" : ""}>
    </label>

    <label class="admin-toggle">
      <span>
        <strong>🎯 Desafio</strong>
        <small>Tela de desafio de presença do professor.</small>
      </span>
      <input type="checkbox" id="mod-desafio-${cliente.id}" ${cliente.modulo_desafio !== false ? "checked" : ""}>
    </label>

    <label class="admin-toggle">
      <span>
        <strong>📚 Turmas</strong>
        <small>Gestão de turmas e frequência por turma.</small>
      </span>
      <input type="checkbox" id="mod-turmas-${cliente.id}" ${cliente.modulo_turmas !== false ? "checked" : ""}>
    </label>

  </div>

  <div class="admin-plano-row admin-plano-row-v2">
    <button class="btn-salvar-modulos" onclick="salvarPermissoesCliente('${cliente.id}')">
      Salvar plano e permissões
    </button>
  </div>

</div>

        <div class="cliente-alunos-lista" id="alunos-cliente-${cliente.id}">
          ${renderizarAlunosDoCliente(alunosDoCliente)}
        </div>
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
  filtroAtual = filtro;
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

  const el = document.getElementById(mapa[filtro]);
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

  const plano = document.getElementById(`plano-${clienteId}`).value;

  const status = document.getElementById(`status-${clienteId}`).value;

  const podeUsar = document.getElementById(`pode-usar-${clienteId}`).checked;

  const moduloRanking = document.getElementById(`mod-ranking-${clienteId}`).checked;

  const moduloDesafio = document.getElementById(`mod-desafio-${clienteId}`).checked;

  const moduloTurmas = document.getElementById(`mod-turmas-${clienteId}`).checked;

  const { error } = await supabaseClient
    .from("profiles")
    .update({
      plano: plano,
      status: status,
      pode_usar: podeUsar,

      modulo_ranking: moduloRanking,
      modulo_desafio: moduloDesafio,
      modulo_turmas: moduloTurmas
    })
    .eq("id", clienteId);

  if (error) {
    console.log(error);

    mostrarToast(
      "Erro ao salvar permissões.",
      "erro"
    );

    return;
  }

  mostrarToast(
    "✅ Permissões salvas!"
  );

}