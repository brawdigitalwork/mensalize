// 30.1 LINK DA PÁGINA DO ALUNO + SOLICITAÇÕES
// ===============================

function montarUrlPaginaAluno(codigoPublico) {
  if (!codigoPublico) return "";
  const base = window.location.origin || "";
  return `${base}/aluno.html?codigo=${encodeURIComponent(codigoPublico)}`;
}

function enviarLinkPaginaAluno(id) {
  const aluno = alunos.find(a => String(a.id) === String(id));

  if (!aluno) {
    mostrarToast("Aluno não encontrado.", "erro");
    return;
  }

  const numero = limparNumeroWhatsApp(aluno.telefone);
  if (!numero || numero.length < 10) {
    mostrarToast("Esse aluno ainda não tem WhatsApp cadastrado.", "erro");
    return;
  }

  if (!aluno.codigo_publico) {
    mostrarToast("Esse aluno ainda não tem link público.", "erro");
    return;
  }

  const linkPagina = montarUrlPaginaAluno(aluno.codigo_publico);
  const mensagem = `Olá, ${aluno.nome}. Segue sua página do aluno no ${nomeEmpresa || "Mensalize"}:\n\n${linkPagina}\n\nPor ela você consegue acompanhar sua mensalidade, pagamentos e dados da academia.`;
  const url = `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, "_blank");
}

async function carregarSolicitacoesAlteracao() {
  if (!listaSolicitacoes || !usuarioAtual) return;

  listaSolicitacoes.innerHTML = `<div class="empty-state-mini">Carregando solicitações...</div>`;

  const { data, error } = await supabaseClient
    .from("solicitacoes_alteracao")
    .select("id, aluno_id, user_id, tipo, status, dados_solicitados, observacao, created_at, respondido_em")
    .eq("user_id", usuarioAtual.id)
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    listaSolicitacoes.innerHTML = `<div class="empty-state-mini">Erro ao carregar solicitações.</div>`;
    console.log("Erro ao carregar solicitações:", error.message);
    return;
  }

  const lista = data || [];
  const idsAlunos = [...new Set(lista.map(s => s.aluno_id).filter(Boolean))];
  let nomesPorId = new Map();

  if (idsAlunos.length) {
    const { data: alunosSolicitacoes } = await supabaseClient
      .from("alunos")
      .select("id, nome, turma, faixa, grau, data_ultima_graduacao")
      .in("id", idsAlunos);

    (alunosSolicitacoes || []).forEach(a => nomesPorId.set(String(a.id), a));
  }

  if (totalSolicitacoesPendentes) totalSolicitacoesPendentes.textContent = lista.filter(s => s.status === "pendente").length;
  if (totalSolicitacoesAprovadas) totalSolicitacoesAprovadas.textContent = lista.filter(s => s.status === "aprovada").length;
  if (totalSolicitacoesRecusadas) totalSolicitacoesRecusadas.textContent = lista.filter(s => s.status === "recusada").length;

  if (!lista.length) {
    listaSolicitacoes.innerHTML = `<div class="empty-state-mini">Nenhuma solicitação enviada pelos alunos ainda.</div>`;
    return;
  }

  function descricaoSolicitacao(solicitacao, aluno) {
    const dados = solicitacao.dados_solicitados || {};
    if (solicitacao.tipo === "graduacao") {
      return `
        <p><strong>Pedido:</strong> correção de graduação</p>
        <p><strong>Faixa atual:</strong> ${aluno?.faixa || "Não informada"}</p>
        <p><strong>Faixa solicitada:</strong> ${dados.faixa || dados.nova_faixa || "Sem alteração"}</p>
        <p><strong>Grau atual:</strong> ${aluno?.grau || "Não informado"}</p>
        <p><strong>Grau solicitado:</strong> ${dados.grau || dados.novo_grau || "Sem alteração"}</p>
        <p><strong>Última graduação atual:</strong> ${aluno?.data_ultima_graduacao ? formatarData(aluno.data_ultima_graduacao) : "Não informada"}</p>
        <p><strong>Data solicitada:</strong> ${dados.data_ultima_graduacao ? formatarData(dados.data_ultima_graduacao) : "Sem alteração"}</p>
      `;
    }

    const turmaAtual = aluno?.turma || "Não informada";
    const novaTurma = dados.turma || dados.nova_turma || "Não informada";
    return `
      <p><strong>Pedido:</strong> alterar turma</p>
      <p><strong>Turma atual:</strong> ${turmaAtual}</p>
      <p><strong>Nova turma:</strong> ${novaTurma}</p>
    `;
  }

  listaSolicitacoes.innerHTML = lista.map(solicitacao => {
    const aluno = nomesPorId.get(String(solicitacao.aluno_id));
    const statusTexto = solicitacao.status === "pendente" ? "Pendente" : solicitacao.status === "aprovada" ? "Aprovada" : "Recusada";
    const podeResponder = solicitacao.status === "pendente";

    return `
      <article class="solicitacao-card status-${solicitacao.status}">
        <div>
          <span class="page-eyebrow">${statusTexto}</span>
          <h3>${aluno?.nome || "Aluno"}</h3>
          ${descricaoSolicitacao(solicitacao, aluno)}
          ${solicitacao.observacao ? `<p><strong>Obs. do aluno:</strong> ${solicitacao.observacao}</p>` : ""}
          <small>Enviado em ${new Date(solicitacao.created_at).toLocaleDateString("pt-BR")}</small>
        </div>
        ${podeResponder ? `
          <div class="solicitacao-acoes">
            <button type="button" class="acao-principal" onclick="aprovarSolicitacaoAlteracao('${solicitacao.id}')">Aprovar</button>
            <button type="button" class="acao-perigo" onclick="recusarSolicitacaoAlteracao('${solicitacao.id}')">Recusar</button>
          </div>
        ` : ""}
      </article>
    `;
  }).join("");
}

async function aprovarSolicitacaoAlteracao(id) {
  const { data: solicitacao, error: erroBusca } = await supabaseClient
    .from("solicitacoes_alteracao")
    .select("id, aluno_id, dados_solicitados, tipo, status")
    .eq("id", id)
    .single();

  if (erroBusca || !solicitacao) {
    mostrarToast("Solicitação não encontrada.", "erro");
    return;
  }

  if (solicitacao.status !== "pendente") {
    mostrarToast("Essa solicitação já foi respondida.", "erro");
    return;
  }

  const dados = solicitacao.dados_solicitados || {};
  let atualizacaoAluno = {};

  if (solicitacao.tipo === "graduacao") {
    if (dados.faixa || dados.nova_faixa) atualizacaoAluno.faixa = dados.faixa || dados.nova_faixa;
    if (dados.grau || dados.novo_grau) atualizacaoAluno.grau = dados.grau || dados.novo_grau;
    if (dados.data_ultima_graduacao) atualizacaoAluno.data_ultima_graduacao = dados.data_ultima_graduacao;
  } else {
    const novaTurma = dados.turma || dados.nova_turma || "";
    if (!novaTurma) {
      mostrarToast("A solicitação não possui turma informada.", "erro");
      return;
    }
    atualizacaoAluno.turma = novaTurma;
  }

  if (Object.keys(atualizacaoAluno).length === 0) {
    mostrarToast("Essa solicitação não possui dados para atualizar.", "erro");
    return;
  }

  const { error: erroAluno } = await supabaseClient
    .from("alunos")
    .update(atualizacaoAluno)
    .eq("id", solicitacao.aluno_id);

  if (erroAluno) {
    mostrarToast("Erro ao atualizar dados do aluno.", "erro");
    return;
  }

  const { error: erroSolicitacao } = await supabaseClient
    .from("solicitacoes_alteracao")
    .update({ status: "aprovada", respondido_em: new Date().toISOString() })
    .eq("id", id);

  if (erroSolicitacao) {
    mostrarToast("Aluno atualizado, mas erro ao finalizar solicitação.", "erro");
    return;
  }

  mostrarToast("Solicitação aprovada.");
  await carregarAlunos();
  await carregarSolicitacoesAlteracao();
}

async function recusarSolicitacaoAlteracao(id) {
  const { error } = await supabaseClient
    .from("solicitacoes_alteracao")
    .update({ status: "recusada", respondido_em: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    mostrarToast("Erro ao recusar solicitação.", "erro");
    return;
  }

  mostrarToast("Solicitação recusada.");
  await carregarSolicitacoesAlteracao();
}

// ===============================
// 31. NAVEGAÇÃO PRINCIPAL — SIDEBAR
// ===============================
function abrirViewPrincipal(view) {

  // =====================================================
// PROTEÇÃO SaaS — MÓDULOS
// =====================================================

if (view === "desafio" && !moduloDesafioAtivo) {
  mostrarToast("Seu plano não possui acesso ao módulo Desafio.", "erro");
  return;
}

if (view === "turmas" && !moduloTurmasAtivo) {
  mostrarToast("Seu plano não possui acesso ao módulo Turmas.", "erro");
  return;
}

  const views = {
    dashboard: viewDashboard,
    alunos: viewAlunos,
    financeiro: viewFinanceiro,
    desafio: viewDesafio,
    evolucao: viewEvolucao,
    presencas: viewPresencas,
    turmas: viewTurmas,
    avisos: viewAvisos,
    solicitacoes: viewSolicitacoes,
    aniversariantes: document.getElementById("viewAniversariantes"),
    perfil: viewPerfil
  };

  Object.values(views).forEach(secao => {
    if (secao) secao.classList.remove("ativa");
  });

  if (views[view]) views[view].classList.add("ativa");

  document.querySelectorAll(".menu-item[data-view]").forEach(botao => {
    botao.classList.toggle("ativo", botao.dataset.view === view);
  });

  const textos = {
    dashboard: ["Início", "Tudo que você precisa acompanhar hoje em um só lugar."],
    alunos: ["Alunos", "Consulte, filtre e gerencie todos os alunos cadastrados."],
    financeiro: ["Financeiro", "Acompanhe recebimentos, previsão mensal e relatórios."],
    desafio: ["Desafio", "Acompanhe o ranking de presença dos alunos e turmas."],
    evolucao: ["Evolução", "Acompanhe graduações, alunos aptos e próximos da avaliação."],
    presencas: ["Presenças", "Faça a chamada do dia separada por turma."],
    turmas: ["Turmas", "Organize dias de aula e cancele aulas sem afetar a frequência."],
    avisos: ["Avisos", "Crie avisos rápidos para alunos e turmas."],
    solicitacoes: ["Solicitações", "Aprove ou recuse alterações enviadas pelos alunos."],
    aniversariantes: ["Aniversariantes", "Veja os alunos que fazem aniversário e envie parabéns pelo WhatsApp."],
    perfil: ["Perfil", "Atualize os dados da empresa, WhatsApp e recursos ativos."]
  };

  if (tituloPagina && textos[view]) tituloPagina.textContent = textos[view][0];
  if (descricaoPagina && textos[view]) descricaoPagina.textContent = textos[view][1];

  if (view === "financeiro" && typeof carregarGrafico === "function") {
    carregarGrafico();
  }
  if (view === "desafio" && typeof atualizarDesafioPresencaProfessor === "function") {
    atualizarDesafioPresencaProfessor();
  }
  if (view === "evolucao") {
    renderizarEvolucao();
  }
  if (view === "presencas") {
    prepararTelaPresencas();
  }
  if (view === "turmas" && typeof prepararTelaTurmas === "function") {
    prepararTelaTurmas();
  }
  if (view === "avisos") {
    carregarAvisos();
  }
  if (view === "solicitacoes") {
    carregarSolicitacoesAlteracao();
  }
  if (view === "aniversariantes" && typeof renderizarAniversariantes === "function") {
    renderizarAniversariantes();
  }

  fecharMenuLateral();
  window.scrollTo({ top: 0, behavior: "smooth" });
}


function abrirMenuLateral() {
  document.body.classList.add("menu-aberto");
}

function fecharMenuLateral() {
  document.body.classList.remove("menu-aberto");
}

function inicializarNavegacaoPrincipal() {
  if (btnAbrirMenu) {
    btnAbrirMenu.addEventListener("click", function(event) {
      event.preventDefault();
      event.stopPropagation();
      abrirMenuLateral();
    });
  }

  if (menuOverlay) {
    menuOverlay.addEventListener("click", fecharMenuLateral);
  }

  document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
      fecharMenuLateral();
    }
  });

  if (btnNavDashboard) btnNavDashboard.addEventListener("click", () => abrirViewPrincipal("dashboard"));
  if (btnNavAlunos) btnNavAlunos.addEventListener("click", () => abrirViewPrincipal("alunos"));
  if (btnNavFinanceiro) btnNavFinanceiro.addEventListener("click", () => abrirViewPrincipal("financeiro"));
  const botaoNavDesafio = document.getElementById("btnNavDesafio");
  if (botaoNavDesafio) botaoNavDesafio.addEventListener("click", () => abrirViewPrincipal("desafio"));
  if (btnNavEvolucao) btnNavEvolucao.addEventListener("click", () => abrirViewPrincipal("evolucao"));
  if (btnNavPresencas) btnNavPresencas.addEventListener("click", () => abrirViewPrincipal("presencas"));
  if (btnNavTurmas) btnNavTurmas.addEventListener("click", () => abrirViewPrincipal("turmas"));
  if (btnNavAniversariantes) btnNavAniversariantes.addEventListener("click", () => abrirViewPrincipal("aniversariantes"));
  if (btnNavAvisos) btnNavAvisos.addEventListener("click", () => abrirViewPrincipal("avisos"));
  if (btnNavSolicitacoes) btnNavSolicitacoes.addEventListener("click", () => abrirViewPrincipal("solicitacoes"));
  if (btnNavPerfil) btnNavPerfil.addEventListener("click", () => abrirViewPrincipal("perfil"));

  if (btnNavCadastrar) {
    btnNavCadastrar.addEventListener("click", () => {
      fecharMenuLateral();
      if (btnMostrarForm) btnMostrarForm.click();
    });
  }

  if (btnAbrirCadastroRapido) {
    btnAbrirCadastroRapido.addEventListener("click", () => {
      if (btnMostrarForm) btnMostrarForm.click();
    });
  }

  if (btnAtualizarSolicitacoes) btnAtualizarSolicitacoes.addEventListener("click", carregarSolicitacoesAlteracao);

  document.querySelectorAll("[data-view-target]").forEach(botao => {
    botao.addEventListener("click", () => abrirViewPrincipal(botao.dataset.viewTarget));
  });
}


function limparNumeroWhatsApp(numero) {
  return String(numero || "").replace(/\D/g, "");
}

async function salvarPerfilProfessor(event) {
  event.preventDefault();

  if (!usuarioAtual) {
    mostrarToast("Você precisa estar logado.", "erro");
    return;
  }

  const nome = perfilNomeEmpresa ? perfilNomeEmpresa.value.trim() : "";
  const whatsapp = perfilWhatsApp ? limparNumeroWhatsApp(perfilWhatsApp.value) : "";
  const campoPixCopiaCola = document.getElementById("perfilPixCopiaCola");
  const pixCopiaCola = campoPixCopiaCola ? campoPixCopiaCola.value.trim() : "";

  if (!nome) {
    if (msgPerfil) msgPerfil.textContent = "Informe o nome da empresa ou academia.";
    mostrarToast("Informe o nome da empresa ou academia.", "erro");
    return;
  }

  if (whatsapp && whatsapp.length < 10) {
    if (msgPerfil) msgPerfil.textContent = "Informe um WhatsApp válido com DDD.";
    mostrarToast("Informe um WhatsApp válido com DDD.", "erro");
    return;
  }

  // A tela de Perfil do professor agora salva somente dados públicos.
  // Planos, módulos, ranking e permissões ficam sob controle do Admin.
  const { error } = await supabaseClient
    .from("profiles")
    .update({
      nome_empresa: nome,
      whatsapp_professor: whatsapp || null,
      pix_copia_cola: pixCopiaCola || null
    })
    .eq("id", usuarioAtual.id);

  if (error) {
    if (msgPerfil) msgPerfil.textContent = "Erro ao salvar perfil.";
    mostrarToast("Erro ao salvar perfil.", "erro");
    return;
  }

  nomeEmpresa = nome;
  sincronizarEstado();

  if (nomeClienteDashboard) {
    nomeClienteDashboard.textContent = nome;
  }

  if (perfilWhatsApp) {
    perfilWhatsApp.value = whatsapp;
  }

  if (campoPixCopiaCola) {
    campoPixCopiaCola.value = pixCopiaCola;
  }

  if (msgPerfil) {
    msgPerfil.textContent = "Perfil salvo com sucesso.";
  }

  mostrarToast("Perfil salvo com sucesso!");
}

if (formPerfil) {
  formPerfil.addEventListener("submit", salvarPerfilProfessor);
}



// ===============================
