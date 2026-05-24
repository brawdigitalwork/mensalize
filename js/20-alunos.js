// 12. ALUNOS — CARREGAR DO SUPABASE
// ===============================

/** Busca alunos do usuário atual; admin enxerga todos por causa da RLS/policies. */
async function carregarAlunos() {
  // Mostra skeleton enquanto carrega
  const skeletonLista = document.getElementById("skeletonLista");
  if (skeletonLista) skeletonLista.classList.remove("escondido");

  aplicarFiltroSalvoAlunos();

  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    .toISOString().split("T")[0];
  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    .toISOString().split("T")[0];

  let queryAlunos = supabaseClient
    .from("alunos")
    .select("id,user_id,nome,telefone,valor,vencimento,status_pagamento,link_pagamento,codigo_publico,created_at,foto_url,modalidade,faixa,grau,turma,turma_id,status_aluno,data_nascimento,data_inicio_academia,data_ultima_graduacao,tempo_avaliacao_meses,observacoes_internas,data_aula_experimental,observacoes_experimental,responsavel_nome,responsavel_whatsapp");

  queryAlunos = aplicarFiltroUsuario(queryAlunos);

  let queryPagamentosMes = supabaseClient
    .from("pagamentos")
    .select("aluno_id");

  queryPagamentosMes = aplicarFiltroUsuario(queryPagamentosMes);

  // Alunos e pagamentos do mês não dependem um do outro, então carregam em paralelo.
  const [{ data, error }, { data: pagamentosMes, error: erroPagamentosMes }] = await Promise.all([
    queryAlunos.order("created_at", { ascending: false }),
    queryPagamentosMes
      .gte("data_pagamento", primeiroDiaMes)
      .lte("data_pagamento", ultimoDiaMes)
  ]);

  if (error) {
    mostrarToast("Erro ao carregar alunos.", "erro");
    if (skeletonLista) skeletonLista.classList.add("escondido");
    return;
  }

  if (erroPagamentosMes) {
    console.log("Erro ao carregar pagamentos do mês:", erroPagamentosMes.message);
  }

  alunos = data || [];
  alunosPagosMes = new Set((pagamentosMes || []).map(p => String(p.aluno_id)));
  sincronizarEstado();

  // Turmas e frequência também podem carregar em paralelo; a renderização vem depois.
  await Promise.all([
    typeof carregarTurmasSistema === "function" ? carregarTurmasSistema() : Promise.resolve(),
    typeof carregarDadosFrequencia === "function" ? carregarDadosFrequencia() : Promise.resolve()
  ]);

  if (skeletonLista) skeletonLista.classList.add("escondido");

  paginaAtual = 1;
  sincronizarEstado();
  mostrarAlunos();

  // Painel, pagamentos recentes e ranking dependem dos dados acima, mas entre si são independentes.
  await Promise.all([
    typeof atualizarPainel === "function" ? atualizarPainel() : Promise.resolve(),
    typeof carregarUltimosPagamentos === "function" ? carregarUltimosPagamentos() : Promise.resolve(),
    typeof carregarRankingDashboard === "function" ? carregarRankingDashboard() : Promise.resolve()
  ]);

  preencherTurmasPresenca();
  if (typeof preencherSelectsTurmas === "function") preencherSelectsTurmas();
  if (typeof atualizarResumoAniversariantes === "function") {
    atualizarResumoAniversariantes();
  }

  if (typeof mostrarBannerVencimentos === "function") {
    mostrarBannerVencimentos();
  }

  if (typeof renderizarDesafioPresencaProfessor === "function") {
    renderizarDesafioPresencaProfessor();
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

  const turmaSelecionadaNome = turmaAluno ? turmaAluno.value.trim() : "";
  const turmaSelecionadaObj = typeof encontrarTurmaPorNome === "function" ? encontrarTurmaPorNome(turmaSelecionadaNome) : null;

  const dadosExtrasAluno = {
    data_nascimento: dataNascimentoAluno && dataNascimentoAluno.value ? dataNascimentoAluno.value : null,
    data_inicio_academia: dataInicioAcademia && dataInicioAcademia.value ? dataInicioAcademia.value : null,
    faixa: faixaAluno ? faixaAluno.value : null,
    grau: grauAluno ? grauAluno.value : null,
    turma: turmaSelecionadaNome || null,
    turma_id: turmaSelecionadaObj ? turmaSelecionadaObj.id : null,
    status_aluno: statusAluno ? statusAluno.value : "ativo",
    data_ultima_graduacao: dataUltimaGraduacao && dataUltimaGraduacao.value ? dataUltimaGraduacao.value : null,
    tempo_avaliacao_meses: tempoMinimoAvaliacao && tempoMinimoAvaliacao.value ? Number(tempoMinimoAvaliacao.value) : null,
    observacoes_internas: observacoesInternas ? observacoesInternas.value.trim() : null,
    data_aula_experimental: dataExperimental && dataExperimental.value ? dataExperimental.value : null,
    responsavel_nome: responsavelNome ? responsavelNome.value.trim() : null,
    responsavel_whatsapp: responsavelWhatsApp ? limparNumeroWhatsApp(responsavelWhatsApp.value) : null
  };

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
        data_nascimento: dataNascimentoAluno && dataNascimentoAluno.value ? dataNascimentoAluno.value : null,
        valor: valor,
        vencimento: vencimento,
        link_pagamento: linkPagamento,
        ...dadosExtrasAluno
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
        data_nascimento: dataNascimentoAluno && dataNascimentoAluno.value ? dataNascimentoAluno.value : null,
        valor: valor,
        vencimento: vencimento,
        link_pagamento: linkPagamento,
        status_pagamento: "pendente",
        ...dadosExtrasAluno
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
  let seguranca = 0;

  do {
  mensalidades.push(vencimento);
  vencimento = adicionarUmMes(vencimento);

  seguranca++;

  if (seguranca > 24) {
    console.error("Loop infinito evitado no cálculo de mensalidades");
    break;
  }

  } while (dataStringParaDate(vencimento) <= hoje);

  return {
    mensalidades,
    novoVencimento: vencimento
  };
}


// ===============================
// 16. ALUNOS — FILTRAR, ORDENAR, PAGINAR E RENDERIZAR
// ===============================

const FILTROS_ALUNOS_VALIDOS = ["todos", "pendente", "atrasado", "hoje", "pago"];

function obterFiltroSalvoAlunos() {
  try {
    const filtroSalvo = localStorage.getItem("mensalize_filtro");
    return FILTROS_ALUNOS_VALIDOS.includes(filtroSalvo) ? filtroSalvo : "todos";
  } catch (erro) {
    return "todos";
  }
}

function aplicarFiltroSalvoAlunos() {
  const filtroSalvo = obterFiltroSalvoAlunos();
  if (FILTROS_ALUNOS_VALIDOS.includes(filtroSalvo)) {
    filtroAtual = filtroSalvo;
  }
}

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
    const nomeAluno = String(aluno.nome || "").toLowerCase();
    const telefoneAluno = String(aluno.telefone || "").toLowerCase();
    const turmaAlunoTexto = String(aluno.turma || "").toLowerCase();
    const faixaAlunoTexto = String(aluno.faixa || "").toLowerCase();

    if (
      textoBusca &&
      !nomeAluno.includes(textoBusca) &&
      !telefoneAluno.includes(textoBusca) &&
      !turmaAlunoTexto.includes(textoBusca) &&
      !faixaAlunoTexto.includes(textoBusca)
    ) {
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
    <div class="aluno-topo-identidade">
      ${aluno.foto_url ? `<img src="${aluno.foto_url}" alt="Foto de ${aluno.nome}" class="aluno-card-foto">` : `<div class="aluno-card-avatar">${String(aluno.nome || "A").trim().charAt(0).toUpperCase() || "A"}</div>`}
      <div>
        <h3>${aluno.nome}</h3>
        <p>📱 ${aluno.telefone}</p>
        ${moduloEvolucaoAtivo && resumoEvolucaoAluno(aluno) ? `<p class="aluno-evolucao-resumo">🥋 ${resumoEvolucaoAluno(aluno)}</p>` : ""}
        ${moduloPresencaAtivo && aluno.responsavel_nome ? `<p class="aluno-evolucao-resumo">👤 Resp.: ${aluno.responsavel_nome}</p>` : ""}
      </div>
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

  <div class="acoes-premium acoes-premium-recolhidas">
    <div class="acoes-primarias-card">
      ${jaPagou
        ? `<span class="badge-pago-confirmado">✅ Mensalidade paga</span>`
        : `<button class="acao-principal" onclick="marcarComoPago('${aluno.id}')">✅ Registrar pagamento</button>`
      }
      <button class="acao-secundaria whatsapp" onclick="enviarWhatsApp('${aluno.id}')">💬 WhatsApp</button>
      <button class="acao-secundaria btn-mais-acoes" type="button" onclick="this.closest('.aluno-card').classList.toggle('expandido')" aria-label="Mostrar mais ações">···</button>
    </div>

    <div class="acoes-secundarias-card">
      <button class="acao-secundaria" onclick="abrirPaginaAluno('${aluno.codigo_publico}')">
        📄 Página do aluno
      </button>
      <button class="acao-secundaria whatsapp" onclick="enviarLinkPaginaAluno('${aluno.id}')">
        🔗 Enviar página
      </button>

      <button class="acao-secundaria" onclick="abrirHistorico('${aluno.id}')">🕘 Histórico</button>
      ${moduloEvolucaoAtivo ? `<button class="acao-secundaria" onclick="abrirModalGraduacao('${aluno.id}')">🥋 Graduação</button>` : ""}
      <button class="acao-secundaria" onclick="editarAluno('${aluno.id}')">✏ Editar</button>
      <button class="acao-perigo" onclick="removerAluno('${aluno.id}')">🗑 Remover</button>
    </div>
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
