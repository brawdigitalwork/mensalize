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
    .select("id,user_id,auth_user_id,nome,telefone,valor,vencimento,status_pagamento,link_pagamento,created_at,foto_url,modalidade,faixa,grau,turma,turma_id,status_aluno,data_nascimento,data_inicio_academia,data_ultima_graduacao,tempo_avaliacao_meses,observacoes_internas,data_aula_experimental,observacoes_experimental,responsavel_nome,responsavel_whatsapp");

  queryAlunos = aplicarFiltroUsuario(queryAlunos);

  let queryPagamentosMes = supabaseClient
    .from("pagamentos")
    .select("aluno_id,vencimento_referencia");

  queryPagamentosMes = aplicarFiltroUsuario(queryPagamentosMes);

  // Alunos e pagamentos do mês não dependem um do outro, então carregam em paralelo.
  const [{ data, error }, { data: pagamentosMes, error: erroPagamentosMes }] = await Promise.all([
    queryAlunos.order("created_at", { ascending: false }),
    queryPagamentosMes
      .gte("vencimento_referencia", primeiroDiaMes)
      .lte("vencimento_referencia", ultimoDiaMes)
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
  const idsComCompetenciaPaga = new Set((pagamentosMes || []).map(p => String(p.aluno_id)));
  alunosPagosMes = new Set(
    alunos
      .filter(aluno => idsComCompetenciaPaga.has(String(aluno.id)) && String(aluno.vencimento || "") > ultimoDiaMes)
      .map(aluno => String(aluno.id))
  );
  sincronizarEstado();
  renderizarPainelAcessosPendentes();

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

  if (typeof atualizarCentralNotificacoesInteligentes === "function") {
    await atualizarCentralNotificacoesInteligentes();
  }

  if (typeof atualizarOnboardingProfessor === "function") {
    await atualizarOnboardingProfessor();
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

  let idsTurmasSelecionadas = typeof obterIdsTurmasSelecionadasFormulario === "function"
    ? obterIdsTurmasSelecionadasFormulario()
    : [];

  let turmaSelecionadaNome = turmaAluno ? turmaAluno.value.trim() : "";
  let turmaSelecionadaObj = typeof encontrarTurmaPorNome === "function"
    ? encontrarTurmaPorNome(turmaSelecionadaNome)
    : null;

  // Se marcou turmas mas não escolheu uma principal, usa a primeira como principal.
  if (!turmaSelecionadaObj && idsTurmasSelecionadas.length) {
    turmaSelecionadaObj = (turmasCadastradas || []).find(
      turma => String(turma.id) === String(idsTurmasSelecionadas[0])
    ) || null;
    turmaSelecionadaNome = turmaSelecionadaObj ? turmaSelecionadaObj.nome : "";
  }

  if (turmaSelecionadaNome && !turmaSelecionadaObj) {
    mostrarToast("Selecione uma turma cadastrada em Turmas.", "erro");
    return;
  }

  if (turmaSelecionadaObj && !idsTurmasSelecionadas.includes(String(turmaSelecionadaObj.id))) {
    idsTurmasSelecionadas.unshift(String(turmaSelecionadaObj.id));
  }

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
    const alunoIdSalvo = String(alunoEditandoId);

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
      .eq("id", alunoIdSalvo);

    if (error) {
      mostrarToast("Erro ao atualizar aluno.", "erro");
      return;
    }

    if (typeof sincronizarVinculosAlunoTurmas === "function") {
      const resultadoVinculos = await sincronizarVinculosAlunoTurmas(alunoIdSalvo, idsTurmasSelecionadas);

      if (!resultadoVinculos.ok) {
        console.error("Erro ao salvar vínculos multi-turma:", resultadoVinculos.error);
        mostrarToast("Aluno atualizado, mas houve erro ao salvar as turmas.", "erro");
        return;
      }
    }

    sairModoEdicao();
    mostrarToast("Aluno atualizado com sucesso!");
  } else {
    if (!usuarioEhAdmin && alunos.length >= limiteAlunos) {
      mostrarToast(`Limite de ${limiteAlunos} alunos atingido.`, "erro");
      return;
    }

    const { data: alunoCriado, error } = await supabaseClient
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
      })
      .select("id")
      .single();

    if (error || !alunoCriado) {
      mostrarToast("Erro ao cadastrar aluno.", "erro");
      return;
    }

    if (typeof sincronizarVinculosAlunoTurmas === "function") {
      const resultadoVinculos = await sincronizarVinculosAlunoTurmas(alunoCriado.id, idsTurmasSelecionadas);

      if (!resultadoVinculos.ok) {
        console.error("Erro ao salvar vínculos multi-turma:", resultadoVinculos.error);
        mostrarToast("Aluno cadastrado, mas houve erro ao salvar as turmas.", "erro");
        return;
      }
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
let painelAcessosPendentesAberto = false;

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

function alternarCardAluno(botao) {
  const card = botao.closest(".aluno-card");
  if (!card) return;

  const estavaAberto = card.classList.contains("expandido");

  document.querySelectorAll("#listaAlunos .aluno-card.expandido").forEach(function(cardAberto) {
    if (cardAberto === card) return;
    cardAberto.classList.remove("expandido");
    const botaoAberto = cardAberto.querySelector(".btn-opcoes-aluno");
    if (botaoAberto) {
      botaoAberto.textContent = "Detalhes";
      botaoAberto.setAttribute("aria-expanded", "false");
    }
  });

  const deveAbrir = !estavaAberto;
  card.classList.toggle("expandido", deveAbrir);
  botao.textContent = deveAbrir ? "Ocultar" : "Detalhes";
  botao.setAttribute("aria-expanded", deveAbrir ? "true" : "false");
}

function escaparHtmlAluno(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function obterTextoSeguroAluno(valor, fallback = "Não informado") {
  const texto = String(valor ?? "").trim();
  return texto ? texto : fallback;
}

function obterAlunosAguardandoAcesso() {
  return alunos
    .filter(function(aluno) {
      return !String(aluno.auth_user_id || "").trim();
    })
    .sort(function(a, b) {
      return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {
        sensitivity: "base"
      });
    });
}

function alunoTemWhatsAppParaAcesso(aluno) {
  const limparNumero = typeof limparNumeroWhatsApp === "function"
    ? limparNumeroWhatsApp
    : function(valor) { return String(valor || "").replace(/\D/g, ""); };

  const telefoneAluno = limparNumero(aluno.telefone);
  const telefoneResponsavel = limparNumero(aluno.responsavel_whatsapp);

  return telefoneAluno.length >= 10 || telefoneResponsavel.length >= 10;
}

function renderizarPainelAcessosPendentes() {
  const painel = document.getElementById("painelAcessosPendentes");
  const botaoAlternar = document.getElementById("btnAlternarAcessosPendentes");
  const conteudo = document.getElementById("conteudoAcessosPendentes");
  const lista = document.getElementById("listaAcessosPendentes");
  const contador = document.getElementById("contadorAcessosPendentes");
  const descricao = document.getElementById("descricaoAcessosPendentes");
  const acao = document.getElementById("acaoAcessosPendentes");

  if (!painel || !botaoAlternar || !conteudo || !lista || !contador || !descricao || !acao) return;

  const pendentes = obterAlunosAguardandoAcesso();
  const total = pendentes.length;

  if (total === 0) {
    painelAcessosPendentesAberto = false;
    painel.classList.add("escondido");
    conteudo.classList.add("escondido");
    botaoAlternar.setAttribute("aria-expanded", "false");
    lista.innerHTML = "";
    return;
  }

  painel.classList.remove("escondido");
  contador.textContent = String(total);
  contador.setAttribute("aria-label", `${total} aguardando`);
  descricao.textContent = total === 1
    ? "1 aluno ainda precisa criar login e senha."
    : `${total} alunos ainda precisam criar login e senha.`;
  acao.textContent = painelAcessosPendentesAberto ? "Fechar lista" : "Ver alunos";
  botaoAlternar.setAttribute("aria-expanded", painelAcessosPendentesAberto ? "true" : "false");
  conteudo.classList.toggle("escondido", !painelAcessosPendentesAberto);

  lista.innerHTML = pendentes.map(function(aluno) {
    const nome = obterTextoSeguroAluno(aluno.nome, "Aluno");
    const nomeSeguro = escaparHtmlAluno(nome);
    const inicialSegura = escaparHtmlAluno(nome.charAt(0).toUpperCase() || "A");
    const idSeguro = escaparHtmlAluno(aluno.id);
    const temWhatsApp = alunoTemWhatsAppParaAcesso(aluno);

    return `
      <div class="acesso-pendente-item">
        <div class="acesso-pendente-identidade">
          <span class="acesso-pendente-avatar" aria-hidden="true">${inicialSegura}</span>
          <strong>${nomeSeguro}</strong>
        </div>

        <button
          type="button"
          class="acao-secundaria whatsapp acesso-pendente-enviar"
          ${temWhatsApp ? `onclick="enviarLinkPaginaAluno('${idSeguro}')"` : "disabled"}
          ${temWhatsApp ? "" : `title="Cadastre um WhatsApp para enviar o acesso"`}
        >
          ${temWhatsApp ? "Enviar acesso" : "Sem WhatsApp"}
        </button>
      </div>
    `;
  }).join("");
}

function alternarPainelAcessosPendentes() {
  painelAcessosPendentesAberto = !painelAcessosPendentesAberto;
  renderizarPainelAcessosPendentes();
}

function obterClasseStatusAluno(aluno, jaPagou, status, dias) {
  if (String(aluno.status_aluno || "ativo").toLowerCase() === "inativo") return "status-inativo";
  if (jaPagou) return "status-pago";
  if (status === "atrasado") return "status-atrasado";
  if (dias === 0) return "status-hoje";
  return "status-pendente";
}

function obterTextoStatusFinanceiroAluno(aluno, jaPagou, status, dias) {
  if (String(aluno.status_aluno || "ativo").toLowerCase() === "inativo") return "Aluno inativo";
  if (jaPagou) return "Pago este mês";
  if (status === "atrasado") return `Atrasado ${Math.abs(dias)}d`;
  if (dias === 0) return "Vence hoje";
  if (dias <= 3) return `Vence em ${dias}d`;
  return `Vence em ${dias}d`;
}

function renderizarEstadoVazioAlunos(tipo) {
  const mensagem = tipo === "sem-filtro"
    ? "Nenhum aluno encontrado para este filtro."
    : "Nenhum aluno cadastrado ainda.";

  const apoio = tipo === "sem-filtro"
    ? "Ajuste a busca ou selecione outro filtro para visualizar a lista."
    : "Cadastre o primeiro aluno para começar a controlar mensalidades, presença e graduação.";

  listaAlunos.innerHTML = `
    <div class="alunos-empty-state">
      <div class="alunos-empty-icon">👥</div>
      <h3>${mensagem}</h3>
      <p>${apoio}</p>
      ${tipo === "sem-filtro" ? `<button type="button" class="acao-secundaria" onclick="setFiltro('todos')">Ver todos os alunos</button>` : ``}
    </div>
  `;
}

/** Aplica busca, filtros, ordenação, paginação e renderiza os cards dos alunos. */
function mostrarAlunos() {
  listaAlunos.innerHTML = "";

  if (alunos.length === 0) {
    renderizarEstadoVazioAlunos("sem-alunos");
    contadorLista.textContent = "0 alunos";
    return;
  }

  // ── 1. Filtra por busca e filtro ──────────────────────────────
  let lista = alunos.filter(function(aluno) {
    const nomeAluno = String(aluno.nome || "").toLowerCase();
    const telefoneAluno = String(aluno.telefone || "").toLowerCase();
    const turmaAlunoTexto = String(
      typeof textoTurmasAluno === "function" ? textoTurmasAluno(aluno, "") : (aluno.turma || "")
    ).toLowerCase();
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
    if (String(aluno.status_aluno || "ativo").toLowerCase() === "inativo") return 6;
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
    const diferencaDias = calcularDias(a.vencimento) - calcularDias(b.vencimento);
    if (diferencaDias !== 0) return diferencaDias;
    return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
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
    renderizarEstadoVazioAlunos("sem-filtro");
    return;
  }

  // ── 4. Renderiza cards ────────────────────────────────────────
  listaPagina.forEach(function(aluno) {
    const jaPagou = alunosPagosMes.has(String(aluno.id));
    const status = verificarStatus(aluno.vencimento);
    const dias = calcularDias(aluno.vencimento);
    const textoStatus = obterTextoStatusFinanceiroAluno(aluno, jaPagou, status, dias);
    const classeStatus = obterClasseStatusAluno(aluno, jaPagou, status, dias);
    const nomeAlunoSeguro = escaparHtmlAluno(obterTextoSeguroAluno(aluno.nome, "Aluno"));
    const telefoneAlunoSeguro = escaparHtmlAluno(obterTextoSeguroAluno(aluno.telefone, "Sem telefone"));
    const turmaAlunoSeguro = escaparHtmlAluno(
      typeof textoTurmasAluno === "function"
        ? textoTurmasAluno(aluno, "Sem turma")
        : obterTextoSeguroAluno(aluno.turma, "Sem turma")
    );
    const faixaResumo = moduloEvolucaoAtivo && resumoEvolucaoAluno(aluno) ? escaparHtmlAluno(resumoEvolucaoAluno(aluno)) : "Graduação não informada";
    const statusAlunoTexto = String(aluno.status_aluno || "ativo").toLowerCase() === "inativo" ? "Inativo" : "Ativo";

    const card = document.createElement("div");
    card.classList.add("aluno-card", "aluno-card-executivo");
    if (jaPagou) card.classList.add("aluno-pago");

    card.innerHTML = `
      <div class="aluno-premium-topo aluno-card-resumo">
        <div class="aluno-topo-identidade">
          ${aluno.foto_url
            ? `<img src="${escaparHtmlAluno(aluno.foto_url)}" alt="Foto de ${nomeAlunoSeguro}" class="aluno-card-foto">`
            : `<div class="aluno-card-avatar">${String(aluno.nome || "A").trim().charAt(0).toUpperCase() || "A"}</div>`
          }

          <div class="aluno-resumo-texto">
            <div class="aluno-nome-linha">
              <h3>${nomeAlunoSeguro}</h3>
              <span class="aluno-status-operacional ${statusAlunoTexto === "Inativo" ? "inativo" : "ativo"}">${statusAlunoTexto}</span>
            </div>

            <div class="aluno-resumo-infos">
              <span>${telefoneAlunoSeguro}</span>
              <span>${turmaAlunoSeguro}</span>
              ${moduloEvolucaoAtivo ? `<span>${faixaResumo}</span>` : ""}
            </div>
          </div>
        </div>

        <div class="aluno-resumo-direita">
          <span class="badge-status ${classeStatus}">${escaparHtmlAluno(textoStatus)}</span>
          <button
            type="button"
            class="acao-secundaria btn-opcoes-aluno"
            onclick="alternarCardAluno(this)"
            aria-expanded="false"
          >
            Detalhes
          </button>
        </div>
      </div>

      <div class="aluno-card-kpis" aria-label="Resumo do aluno">
        <div class="aluno-card-kpi">
          <span>Mensalidade</span>
          <strong>${formatarMoeda(aluno.valor)}</strong>
        </div>
        <div class="aluno-card-kpi">
          <span>${jaPagou ? "Próx. vencimento" : "Vencimento"}</span>
          <strong>${formatarData(aluno.vencimento)}</strong>
        </div>
        <div class="aluno-card-kpi">
          <span>Turma</span>
          <strong>${turmaAlunoSeguro}</strong>
        </div>
      </div>

      <div class="aluno-detalhes-recolhiveis">
        <div class="aluno-detalhes-grid">
          <div class="aluno-detalhe-card">
            <span>Contato</span>
            <strong>${telefoneAlunoSeguro}</strong>
          </div>

          <div class="aluno-detalhe-card">
            <span>Graduação</span>
            <strong>${moduloEvolucaoAtivo ? faixaResumo : "Módulo desativado"}</strong>
          </div>

          <div class="aluno-detalhe-card">
            <span>Status financeiro</span>
            <strong>${escaparHtmlAluno(textoStatus)}</strong>
          </div>
        </div>

        <div class="acoes-premium acoes-premium-recolhidas">
          <div class="aluno-acoes-bloco aluno-acoes-principais">
            <span class="aluno-acoes-titulo">Ações principais</span>
            ${jaPagou
              ? `
                <span class="badge-pago-confirmado">Mensalidade paga</span>
                <button class="acao-secundaria" onclick="marcarComoPago('${aluno.id}')">Registrar adiantamento</button>
              `
              : `<button class="acao-principal" onclick="marcarComoPago('${aluno.id}')">Registrar pagamento</button>`
            }

            <button class="acao-secundaria whatsapp" onclick="enviarWhatsApp('${aluno.id}')">WhatsApp</button>
            <button class="acao-secundaria whatsapp" onclick="enviarLinkPaginaAluno('${aluno.id}')">Enviar acesso</button>
          </div>

          <div class="aluno-acoes-bloco aluno-acoes-gestao">
            <span class="aluno-acoes-titulo">Gestão do aluno</span>
            <button class="acao-principal btn-perfil-completo-aluno" onclick="abrirPerfilCompletoAluno('${aluno.id}')">Perfil completo</button>
            <button class="acao-secundaria" onclick="abrirHistorico('${aluno.id}')">Histórico</button>
            ${moduloEvolucaoAtivo ? `<button class="acao-secundaria" onclick="abrirModalGraduacao('${aluno.id}')">Graduação</button>` : ""}
            <button class="acao-secundaria" onclick="editarAluno('${aluno.id}')">Editar</button>
            <button class="acao-perigo" onclick="removerAluno('${aluno.id}')">Remover</button>
          </div>
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

// ===============================
// 17. ALUNOS — PERFIL COMPLETO EXECUTIVO
// ===============================

function obterAlunoPorIdPerfil(alunoId) {
  return alunos.find(aluno => String(aluno.id) === String(alunoId));
}

function valorPerfilAluno(valor, fallback = "Não informado") {
  const texto = String(valor ?? "").trim();
  return texto ? escaparHtmlAluno(texto) : fallback;
}

function dataPerfilAluno(data, fallback = "Não informada") {
  if (!data) return fallback;
  try {
    return formatarData(data);
  } catch (erro) {
    return fallback;
  }
}

function calcularResumoFinanceiroPerfil(aluno) {
  const jaPagou = alunosPagosMes.has(String(aluno.id));
  const status = verificarStatus(aluno.vencimento);
  const dias = calcularDias(aluno.vencimento);

  if (jaPagou) {
    return {
      titulo: "Mensalidade em dia",
      detalhe: `Próximo vencimento em ${formatarData(aluno.vencimento)}`,
      classe: "ok"
    };
  }

  if (status === "atrasado") {
    return {
      titulo: `Atrasado há ${Math.abs(dias)} dia${Math.abs(dias) !== 1 ? "s" : ""}`,
      detalhe: `Vencimento em ${formatarData(aluno.vencimento)}`,
      classe: "alerta"
    };
  }

  if (dias === 0) {
    return {
      titulo: "Vence hoje",
      detalhe: `Mensalidade de ${formatarMoeda(aluno.valor)}`,
      classe: "atenção"
    };
  }

  return {
    titulo: `Vence em ${dias} dia${dias !== 1 ? "s" : ""}`,
    detalhe: `Vencimento em ${formatarData(aluno.vencimento)}`,
    classe: "neutro"
  };
}

function fecharPerfilCompletoAluno() {
  const modal = document.getElementById("modalPerfilCompletoAluno");
  if (modal) modal.remove();
  document.body.classList.remove("perfil-aluno-aberto");
}

function abrirPerfilCompletoAluno(alunoId) {
  const aluno = obterAlunoPorIdPerfil(alunoId);
  if (!aluno) {
    mostrarToast("Aluno não encontrado.", "erro");
    return;
  }

  fecharPerfilCompletoAluno();

  const financeiro = calcularResumoFinanceiroPerfil(aluno);
  const nome = escaparHtmlAluno(obterTextoSeguroAluno(aluno.nome, "Aluno"));
  const telefone = valorPerfilAluno(aluno.telefone, "Sem telefone");
  const turma = escaparHtmlAluno(
    typeof textoTurmasAluno === "function"
      ? textoTurmasAluno(aluno, "Sem turma")
      : valorPerfilAluno(aluno.turma, "Sem turma")
  );
  const statusAluno = String(aluno.status_aluno || "ativo").toLowerCase() === "inativo" ? "Inativo" : "Ativo";
  const faixa = moduloEvolucaoAtivo && resumoEvolucaoAluno(aluno) ? escaparHtmlAluno(resumoEvolucaoAluno(aluno)) : "Graduação não informada";
  const observacoes = valorPerfilAluno(aluno.observacoes_internas, "Nenhuma observação interna cadastrada.");
  const responsavel = valorPerfilAluno(aluno.responsavel_nome, "Não informado");
  const responsavelWhats = valorPerfilAluno(aluno.responsavel_whatsapp, "Não informado");

  const modal = document.createElement("div");
  modal.id = "modalPerfilCompletoAluno";
  modal.className = "perfil-aluno-overlay";
  modal.innerHTML = `
    <section class="perfil-aluno-modal" role="dialog" aria-modal="true" aria-labelledby="perfilAlunoTitulo">
      <button type="button" class="perfil-aluno-fechar" onclick="fecharPerfilCompletoAluno()" aria-label="Fechar perfil do aluno">×</button>

      <header class="perfil-aluno-hero">
        <div class="perfil-aluno-identidade">
          ${aluno.foto_url
            ? `<img src="${escaparHtmlAluno(aluno.foto_url)}" alt="Foto de ${nome}" class="perfil-aluno-foto">`
            : `<div class="perfil-aluno-avatar">${String(aluno.nome || "A").trim().charAt(0).toUpperCase() || "A"}</div>`
          }
          <div>
            <span class="page-eyebrow">Perfil do aluno</span>
            <h2 id="perfilAlunoTitulo">${nome}</h2>
            <p>${turma} • ${faixa}</p>
          </div>
        </div>
        <span class="perfil-aluno-status ${statusAluno === "Inativo" ? "inativo" : "ativo"}">${statusAluno}</span>
      </header>

      <div class="perfil-aluno-kpis">
        <article class="perfil-aluno-kpi ${financeiro.classe}">
          <span>Financeiro</span>
          <strong>${escaparHtmlAluno(financeiro.titulo)}</strong>
          <small>${escaparHtmlAluno(financeiro.detalhe)}</small>
        </article>
        <article class="perfil-aluno-kpi">
          <span>Mensalidade</span>
          <strong>${formatarMoeda(aluno.valor)}</strong>
          <small>Valor cadastrado</small>
        </article>
        <article class="perfil-aluno-kpi">
          <span>Vencimento</span>
          <strong>${formatarData(aluno.vencimento)}</strong>
          <small>Data atual</small>
        </article>
      </div>

      <div class="perfil-aluno-grid">
        <article class="perfil-aluno-bloco">
          <h3>Dados principais</h3>
          <dl>
            <div><dt>Telefone</dt><dd>${telefone}</dd></div>
            <div><dt>Turma</dt><dd>${turma}</dd></div>
            <div><dt>Nascimento</dt><dd>${dataPerfilAluno(aluno.data_nascimento)}</dd></div>
            <div><dt>Entrada na academia</dt><dd>${dataPerfilAluno(aluno.data_inicio_academia)}</dd></div>
          </dl>
        </article>

        <article class="perfil-aluno-bloco">
          <h3>Graduação</h3>
          <dl>
            <div><dt>Faixa atual</dt><dd>${faixa}</dd></div>
            <div><dt>Última graduação</dt><dd>${dataPerfilAluno(aluno.data_ultima_graduacao)}</dd></div>
            <div><dt>Tempo mínimo</dt><dd>${aluno.tempo_avaliacao_meses ? `${Number(aluno.tempo_avaliacao_meses)} meses` : "Não informado"}</dd></div>
          </dl>
        </article>

        <article class="perfil-aluno-bloco">
          <h3>Responsável</h3>
          <dl>
            <div><dt>Nome</dt><dd>${responsavel}</dd></div>
            <div><dt>WhatsApp</dt><dd>${responsavelWhats}</dd></div>
          </dl>
        </article>

        <article class="perfil-aluno-bloco perfil-aluno-observacoes">
          <h3>Observações internas</h3>
          <p>${observacoes}</p>
        </article>
      </div>

      <footer class="perfil-aluno-acoes">
        <button type="button" class="acao-principal" onclick="enviarWhatsApp('${aluno.id}')">Chamar no WhatsApp</button>
        <button type="button" class="acao-secundaria" onclick="abrirHistorico('${aluno.id}')">Ver histórico</button>
        ${moduloEvolucaoAtivo ? `<button type="button" class="acao-secundaria" onclick="abrirModalGraduacao('${aluno.id}')">Graduação</button>` : ""}
        <button type="button" class="acao-secundaria" onclick="editarAluno('${aluno.id}')">Editar cadastro</button>
      </footer>
    </section>
  `;

  modal.addEventListener("click", function(event) {
    if (event.target === modal) fecharPerfilCompletoAluno();
  });

  document.body.appendChild(modal);
  document.body.classList.add("perfil-aluno-aberto");
}

document.addEventListener("keydown", function(event) {
  if (event.key === "Escape") {
    fecharPerfilCompletoAluno();
  }
});
