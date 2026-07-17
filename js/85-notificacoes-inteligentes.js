// 85. CENTRAL INTELIGENTE DE NOTIFICAÇÕES — MVP
// ================================================================
// Gera notificações calculadas no front, sem tabela nova no Supabase.
// Foco: poucas notificações, todas com ação clara.

const NOTIFICACOES_MVP_LIMITES_POR_TIPO = {
  "financeiro-atraso": 3,
  "financeiro-vence-hoje": 2,
  "solicitacoes-pendentes": 1,
  "presenca-chamada": 2,
  "presenca-sumindo": 3,
  "evolucao-aptos": 1,
  "aniversario-hoje": 3
};

let notificacoesUltimosCortesPorTipo = {};

let centralNotificacoesAberta = false;
let acoesCentralNotificacoesConfiguradas = false;

/** Escapa todo conteúdo externo antes de renderizar notificações via innerHTML. */
function escaparHtmlNotificacao(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Usa delegação em data-attributes em vez de onclick inline.
 * Isso preserva as ações também quando a lista é clonada para o sheet mobile.
 */
function configurarAcoesCentralNotificacoes() {
  if (acoesCentralNotificacoesConfiguradas) return;
  acoesCentralNotificacoesConfiguradas = true;

  document.addEventListener("click", event => {
    const botao = event.target.closest?.("[data-notificacao-acao-tipo]");
    if (!botao) return;

    notificacoesExecutarAcao(
      botao.dataset.notificacaoAcaoTipo || "",
      botao.dataset.notificacaoAlvo || ""
    );
  });
}

function notificacoesEhAtencaoReal(item) {
  return item && (item.prioridade === "urgente" || item.prioridade === "importante");
}

function notificacoesAtualizarEstadoVisual(totalAtencao = 0, totalNotificacoes = 0) {
  const card = document.getElementById("centralNotificacoesCard");
  const lista = document.getElementById("centralNotificacoesLista");
  const botao = document.getElementById("btnToggleNotificacoesDashboard");

  if (card) {
    card.classList.toggle("central-notificacoes-aberta", centralNotificacoesAberta);
    card.dataset.totalAtencao = String(totalAtencao);
    card.dataset.totalNotificacoes = String(totalNotificacoes);
  }

  if (lista) {
    lista.setAttribute("aria-hidden", centralNotificacoesAberta ? "false" : "true");
  }

  if (botao) {
    botao.textContent = centralNotificacoesAberta ? "Ocultar alertas" : "Ver alertas";
    botao.setAttribute("aria-expanded", centralNotificacoesAberta ? "true" : "false");
    botao.disabled = totalNotificacoes === 0;
  }
}

function configurarToggleCentralNotificacoes() {
  const botao = document.getElementById("btnToggleNotificacoesDashboard");
  const card = document.getElementById("centralNotificacoesCard");

  if (!botao || botao.dataset.toggleConfigurado === "true") return;

  botao.dataset.toggleConfigurado = "true";

  botao.addEventListener("click", () => {
    const totalAtencao = Number(card?.dataset.totalAtencao || 0);
    const totalNotificacoes = Number(card?.dataset.totalNotificacoes || 0);

    centralNotificacoesAberta = !centralNotificacoesAberta;
    notificacoesAtualizarEstadoVisual(totalAtencao, totalNotificacoes);
  });
}


function notificacoesHojeISO() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

function notificacoesDataLocal(dataString) {
  if (!dataString) return null;
  const partes = String(dataString).split("T")[0].split("-");
  if (partes.length !== 3) return null;
  const data = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  return Number.isNaN(data.getTime()) ? null : data;
}

function notificacoesDiasEntre(dataA, dataB) {
  const a = new Date(dataA.getFullYear(), dataA.getMonth(), dataA.getDate());
  const b = new Date(dataB.getFullYear(), dataB.getMonth(), dataB.getDate());
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}

function notificacoesAlunoAtivo(aluno) {
  const status = String(aluno?.status_aluno || "ativo").toLowerCase();
  return status !== "inativo" && status !== "pausado";
}

function notificacoesAlunoPagoNoMes(aluno) {
  if (!aluno) return false;
  return typeof alunosPagosMes !== "undefined" && alunosPagosMes instanceof Set && alunosPagosMes.has(String(aluno.id));
}

function notificacoesPrioridadePeso(prioridade) {
  if (prioridade === "urgente") return 1;
  if (prioridade === "importante") return 2;
  return 3;
}

function notificacoesTelefoneAluno(aluno) {
  if (!aluno) return "";
  if (typeof limparNumeroWhatsApp === "function") {
    return limparNumeroWhatsApp(aluno.telefone || aluno.responsavel_whatsapp || "");
  }
  return String(aluno.telefone || aluno.responsavel_whatsapp || "").replace(/\D/g, "");
}

function notificacoesAbrirWhatsAppAluno(alunoId, tipo = "contato") {
  const aluno = (alunos || []).find(item => String(item.id) === String(alunoId));

  if (!aluno) {
    if (typeof mostrarToast === "function") mostrarToast("Aluno não encontrado.", "erro");
    return;
  }

  const telefone = notificacoesTelefoneAluno(aluno);
  if (!telefone || telefone.length < 10) {
    if (typeof mostrarToast === "function") mostrarToast("Aluno sem WhatsApp válido.", "erro");
    return;
  }

  let mensagem = `Olá, ${aluno.nome}. Tudo bem?`;

  if (tipo === "sumindo") {
    mensagem = `Olá, ${aluno.nome}. Tudo bem?\n\nSentimos sua falta nas últimas aulas. Passando para saber se está tudo certo e se podemos ajudar em algo.`;
  } else if (tipo === "vence-hoje") {
    const data = aluno.vencimento && typeof formatarData === "function" ? formatarData(aluno.vencimento) : "hoje";
    mensagem = `Olá, ${aluno.nome}. Tudo bem?\n\nPassando para lembrar que sua mensalidade vence hoje (${data}). Caso já tenha pago, por favor desconsidere.`;
  }

  window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`, "_blank");
}


async function abrirTelaPresencaTurma(turmaNome = "") {
  if (typeof abrirViewPrincipal === "function") {
    abrirViewPrincipal("presencas");
  }

  const hojeISO = notificacoesHojeISO();
  const data = document.getElementById("presencaData");
  const turma = document.getElementById("presencaTurma");

  if (data) data.value = hojeISO;

  if (typeof preencherTurmasPresenca === "function") {
    preencherTurmasPresenca();
  }

  if (turma && turmaNome) {
    const existe = Array.from(turma.options || []).some(opt => opt.value === turmaNome);
    if (existe) turma.value = turmaNome;
  }

  if (typeof prepararTelaPresencas === "function") {
    await prepararTelaPresencas();
  } else {
    if (typeof carregarMarcacoesPresenca === "function") await carregarMarcacoesPresenca();
    if (typeof renderizarListaPresencas === "function") renderizarListaPresencas();
  }

  const alvoScroll = document.getElementById("listaPresencas") || document.getElementById("presencaTurma") || document.getElementById("viewPresencas");
  if (alvoScroll && typeof alvoScroll.scrollIntoView === "function") {
    alvoScroll.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function notificacoesExecutarAcao(tipo, alvo = "") {
  if (tipo === "cobrar") {
    if (typeof enviarWhatsApp === "function") enviarWhatsApp(alvo);
    return;
  }

  if (tipo === "vence-hoje") {
    notificacoesAbrirWhatsAppAluno(alvo, "vence-hoje");
    return;
  }

  if (tipo === "sumindo") {
    notificacoesAbrirWhatsAppAluno(alvo, "sumindo");
    return;
  }

  if (tipo === "parabens") {
    if (typeof enviarParabensWhatsApp === "function") enviarParabensWhatsApp(alvo);
    return;
  }

  if (tipo === "solicitacoes") {
    if (typeof abrirViewPrincipal === "function") abrirViewPrincipal("solicitacoes");
    return;
  }

  if (tipo === "presencas") {
    abrirTelaPresencaTurma(alvo);
    return;
  }

  if (tipo === "evolucao-lista") {
    if (typeof abrirViewPrincipal === "function") abrirViewPrincipal("evolucao");
    return;
  }

  if (tipo === "evolucao") {
    if (typeof abrirViewPrincipal === "function") abrirViewPrincipal("evolucao");
    setTimeout(() => {
      if (typeof abrirModalGraduacao === "function" && alvo) abrirModalGraduacao(alvo);
    }, 160);
  }
}

function notificacoesCriar({ id, tipoNotificacao, modulo, prioridade, icone, titulo, descricao, acaoTexto, acaoTipo, alvo }) {
  return { id, tipoNotificacao: tipoNotificacao || id, modulo, prioridade, icone, titulo, descricao, acaoTexto, acaoTipo, alvo };
}

async function notificacoesContarSolicitacoesPendentes() {
  if (typeof usuarioAtual === "undefined" || !usuarioAtual || typeof supabaseClient === "undefined" || !supabaseClient) return { total: 0, pagamentos: 0, alteracoes: 0 };

  try {
    const [resAlteracoes, resPagamentos] = await Promise.all([
      supabaseClient
        .from("solicitacoes_alteracao")
        .select("id, status", { count: "exact", head: true })
        .eq("user_id", usuarioAtual.id)
        .eq("status", "pendente"),

      supabaseClient
        .from("solicitacoes_pagamento")
        .select("id, status", { count: "exact", head: true })
        .eq("user_id", usuarioAtual.id)
        .eq("status", "pendente")
    ]);

    const alteracoes = resAlteracoes.count || 0;
    const pagamentos = resPagamentos.count || 0;

    return {
      total: alteracoes + pagamentos,
      pagamentos,
      alteracoes
    };
  } catch (erro) {
    console.warn("[Mensalize] Erro ao contar solicitações pendentes:", erro);
    return { total: 0, pagamentos: 0, alteracoes: 0 };
  }
}

function notificacoesTurmaTemAulaHoje(turma) {
  const hoje = new Date();
  const diaHoje = hoje.getDay();
  const dias = Array.isArray(turma?.dias_semana) ? turma.dias_semana : [];

  return dias.some(dia => {
    if (typeof normalizarDiaSemanaParaNumero === "function") {
      return normalizarDiaSemanaParaNumero(dia) === diaHoje;
    }
    const numero = Number(dia);
    return Number.isInteger(numero) && numero === diaHoje;
  });
}

function notificacoesAulaCanceladaHoje(turma) {
  const hojeISO = notificacoesHojeISO();
  const nome = String(turma?.nome || "").toLowerCase();

  return (aulasCanceladas || []).some(aula => {
    const mesmaData = String(aula.data_aula || "").split("T")[0] === hojeISO;
    const mesmaTurmaId = turma?.id && aula.turma_id && String(aula.turma_id) === String(turma.id);
    const mesmaTurmaNome = nome && String(aula.turma || "").toLowerCase() === nome;
    return mesmaData && (mesmaTurmaId || mesmaTurmaNome);
  });
}

function notificacoesChamadaJaFeitaHoje(turma) {
  const hojeISO = notificacoesHojeISO();
  const nome = String(turma?.nome || "").toLowerCase();

  return (presencasPeriodo || []).some(presenca => {
    const mesmaData = String(presenca.data_aula || "").split("T")[0] === hojeISO;
    const mesmaTurmaId = turma?.id && presenca.turma_id && String(presenca.turma_id) === String(turma.id);
    const mesmaTurmaNome = nome && String(presenca.turma || "").toLowerCase() === nome;
    return mesmaData && (mesmaTurmaId || mesmaTurmaNome);
  });
}

function notificacoesAlunosSumindo() {
  const resultado = [];
  const porAluno = new Map();

  (presencasPeriodo || []).forEach(registro => {
    if (!registro || !registro.aluno_id || !registro.data_aula) return;
    const chave = String(registro.aluno_id);
    if (!porAluno.has(chave)) porAluno.set(chave, []);
    porAluno.get(chave).push(registro);
  });

  (alunos || []).filter(notificacoesAlunoAtivo).forEach(aluno => {
    const registros = (porAluno.get(String(aluno.id)) || [])
      .filter(registro => {
        const cancelada = (aulasCanceladas || []).some(aula => {
          const mesmaData = String(aula.data_aula || "").split("T")[0] === String(registro.data_aula || "").split("T")[0];
          const mesmaTurmaId = registro.turma_id && aula.turma_id && String(aula.turma_id) === String(registro.turma_id);
          const mesmaTurmaNome = registro.turma && aula.turma && String(aula.turma).toLowerCase() === String(registro.turma).toLowerCase();
          return mesmaData && (mesmaTurmaId || mesmaTurmaNome);
        });

        return !cancelada;
      })
      .sort((a, b) => new Date(String(b.data_aula).split("T")[0]) - new Date(String(a.data_aula).split("T")[0]));

    if (registros.length < 2) return;

    const ultimasDuas = registros.slice(0, 2);
    const faltouDuas = ultimasDuas.every(registro => registro.presente !== true);

    if (faltouDuas) {
      resultado.push({ aluno, faltas: 2 });
    }
  });

  return resultado;
}


function notificacoesAplicarLimitesPorTipo(notificacoes = []) {
  const agrupadas = new Map();

  notificacoes.forEach(item => {
    const tipo = item.tipoNotificacao || item.id || "geral";
    if (!agrupadas.has(tipo)) agrupadas.set(tipo, []);
    agrupadas.get(tipo).push(item);
  });

  const visiveis = [];
  const cortes = {};

  agrupadas.forEach((itens, tipo) => {
    const limite = NOTIFICACOES_MVP_LIMITES_POR_TIPO[tipo] || itens.length;
    const ordenados = itens.slice().sort((a, b) => notificacoesPrioridadePeso(a.prioridade) - notificacoesPrioridadePeso(b.prioridade));
    const exibidos = ordenados.slice(0, limite);

    visiveis.push(...exibidos);

    cortes[tipo] = {
      total: ordenados.length,
      exibidos: exibidos.length,
      ocultos: Math.max(ordenados.length - exibidos.length, 0)
    };
  });

  notificacoesUltimosCortesPorTipo = cortes;

  return visiveis.sort((a, b) => {
    const prioridade = notificacoesPrioridadePeso(a.prioridade) - notificacoesPrioridadePeso(b.prioridade);
    if (prioridade !== 0) return prioridade;
    return String(a.modulo || "").localeCompare(String(b.modulo || ""), "pt-BR");
  });
}

function notificacoesRodapeGrupo(prioridade) {
  const cortes = notificacoesUltimosCortesPorTipo || {};
  const rodapes = [];

  if (prioridade === "urgente" && cortes["financeiro-atraso"]?.ocultos > 0) {
    rodapes.push(`+${cortes["financeiro-atraso"].ocultos} aluno${cortes["financeiro-atraso"].ocultos === 1 ? "" : "s"} em atraso fora desta lista. Use o Financeiro para ver todos.`);
  }

  if (prioridade === "importante" && cortes["financeiro-vence-hoje"]?.ocultos > 0) {
    rodapes.push(`+${cortes["financeiro-vence-hoje"].ocultos} aluno${cortes["financeiro-vence-hoje"].ocultos === 1 ? "" : "s"} vencendo hoje fora desta lista.`);
  }

  if (prioridade === "importante" && cortes["presenca-sumindo"]?.ocultos > 0) {
    rodapes.push(`+${cortes["presenca-sumindo"].ocultos} aluno${cortes["presenca-sumindo"].ocultos === 1 ? "" : "s"} também parecem estar sumindo.`);
  }

  if (!rodapes.length) return "";

  return `<div class="notificacoes-grupo-rodape">${rodapes.map(texto => `<p>${texto}</p>`).join("")}</div>`;
}

async function gerarNotificacoesInteligentes() {
  const notificacoes = [];
  const hoje = typeof dataHojeSemHora === "function" ? dataHojeSemHora() : new Date();
  const hojeISO = notificacoesHojeISO();

  // 1. Financeiro: atraso e vence hoje
  (alunos || []).filter(notificacoesAlunoAtivo).forEach(aluno => {
    if (notificacoesAlunoPagoNoMes(aluno)) return;

    const vencimento = notificacoesDataLocal(aluno.vencimento);
    if (!vencimento) return;

    const dias = notificacoesDiasEntre(vencimento, hoje);

    if (dias < 0) {
      notificacoes.push(notificacoesCriar({
        id: `financeiro-atraso-${aluno.id}`,
        tipoNotificacao: "financeiro-atraso",
        modulo: "Financeiro",
        prioridade: "urgente",
        icone: "🚨",
        titulo: "Aluno em atraso",
        descricao: `${aluno.nome} está atrasado há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"}.`,
        acaoTexto: "Cobrar agora",
        acaoTipo: "cobrar",
        alvo: aluno.id
      }));
      return;
    }

    if (dias === 0) {
      notificacoes.push(notificacoesCriar({
        id: `financeiro-vence-hoje-${aluno.id}`,
        tipoNotificacao: "financeiro-vence-hoje",
        modulo: "Financeiro",
        prioridade: "importante",
        icone: "📅",
        titulo: "Vence hoje",
        descricao: `${aluno.nome} vence hoje. Envie um lembrete antes de virar atraso.`,
        acaoTexto: "Lembrar aluno",
        acaoTipo: "vence-hoje",
        alvo: aluno.id
      }));
    }
  });

  // 2. Solicitações pendentes
  const solicitacoes = await notificacoesContarSolicitacoesPendentes();
  if (solicitacoes.total > 0) {
    const temPagamento = solicitacoes.pagamentos > 0;

    notificacoes.push(notificacoesCriar({
      id: "solicitacoes-pendentes",
      tipoNotificacao: "solicitacoes-pendentes",
      modulo: "Solicitações",
      prioridade: temPagamento ? "urgente" : "importante",
      icone: temPagamento ? "💸" : "📝",
      titulo: "Nova solicitação pendente",
      descricao: temPagamento
        ? `Você tem ${solicitacoes.total} solicitação${solicitacoes.total === 1 ? "" : "ões"} pendente${solicitacoes.total === 1 ? "" : "s"}, incluindo pagamento.`
        : `Você tem ${solicitacoes.total} solicitação${solicitacoes.total === 1 ? "" : "ões"} pendente${solicitacoes.total === 1 ? "" : "s"} dos alunos.`,
      acaoTexto: "Ver solicitações",
      acaoTipo: "solicitacoes",
      alvo: ""
    }));
  }

  // 3. Chamada de hoje pendente
  if (typeof moduloPresencaAtivo === "undefined" || moduloPresencaAtivo !== false) {
    const turmasHoje = (turmasCadastradas || [])
      .filter(turma => turma.ativa !== false)
      .filter(notificacoesTurmaTemAulaHoje)
      .filter(turma => !notificacoesAulaCanceladaHoje(turma))
      .filter(turma => !notificacoesChamadaJaFeitaHoje(turma));

    turmasHoje.slice(0, 3).forEach(turma => {
      notificacoes.push(notificacoesCriar({
        id: `presenca-chamada-${turma.id || turma.nome}-${hojeISO}`,
        tipoNotificacao: "presenca-chamada",
        modulo: "Presenças",
        prioridade: "importante",
        icone: "✅",
        titulo: "Chamada de hoje pendente",
        descricao: `${turma.nome} tem aula hoje${turma.horario ? ` às ${turma.horario}` : ""} e a chamada ainda não foi feita.`,
        acaoTexto: "Fazer chamada",
        acaoTipo: "presencas",
        alvo: turma.nome
      }));
    });
  }

  // 4. Aluno sumindo
  if (typeof moduloPresencaAtivo === "undefined" || moduloPresencaAtivo !== false) {
    notificacoesAlunosSumindo().slice(0, 3).forEach(({ aluno }) => {
      notificacoes.push(notificacoesCriar({
        id: `presenca-sumindo-${aluno.id}`,
        tipoNotificacao: "presenca-sumindo",
        modulo: "Presenças",
        prioridade: "importante",
        icone: "👀",
        titulo: "Aluno sumindo",
        descricao: `${aluno.nome} faltou nas últimas 2 aulas. Vale chamar antes de ele abandonar.`,
        acaoTexto: "Chamar aluno",
        acaoTipo: "sumindo",
        alvo: aluno.id
      }));
    });
  }

  // 5. Alunos aptos para avaliação — agregado para evitar poluir a Home
  if ((typeof moduloEvolucaoAtivo === "undefined" || moduloEvolucaoAtivo !== false) && typeof calcularStatusEvolucao === "function") {
    const aptos = (alunos || [])
      .filter(notificacoesAlunoAtivo)
      .map(aluno => ({ aluno, status: calcularStatusEvolucao(aluno) }))
      .filter(item => item.status && item.status.status === "apto");

    if (aptos.length > 0) {
      const nomes = aptos.slice(0, 3).map(item => item.aluno.nome).join(", ");
      const complemento = aptos.length > 3 ? ` e mais ${aptos.length - 3}` : "";

      notificacoes.push(notificacoesCriar({
        id: "evolucao-aptos-agregado",
        tipoNotificacao: "evolucao-aptos",
        modulo: "Graduação",
        prioridade: "importante",
        icone: "📈",
        titulo: `${aptos.length} aluno${aptos.length === 1 ? "" : "s"} apto${aptos.length === 1 ? "" : "s"} para avaliação`,
        descricao: aptos.length === 1
          ? `${aptos[0].aluno.nome} já cumpriu o tempo mínimo e está apto para avaliação.`
          : `${nomes}${complemento} já estão aptos para avaliação.`,
        acaoTexto: "Ver graduação",
        acaoTipo: "evolucao-lista",
        alvo: ""
      }));
    }
  }

  // 6. Aniversariante do dia
  if (typeof obterAniversariantesOrdenados === "function") {
    obterAniversariantesOrdenados()
      .filter(aluno => aluno.aniversario_hoje)
      .slice(0, 3)
      .forEach(aluno => {
        notificacoes.push(notificacoesCriar({
          id: `aniversario-${aluno.id}`,
          tipoNotificacao: "aniversario-hoje",
          modulo: "Aniversariantes",
          prioridade: "informativa",
          icone: "🎂",
          titulo: "Aniversariante do dia",
          descricao: `Hoje é aniversário de ${aluno.nome}.`,
          acaoTexto: "Enviar parabéns",
          acaoTipo: "parabens",
          alvo: aluno.id
        }));
      });
  }

  return notificacoesAplicarLimitesPorTipo(notificacoes);
}

function renderizarCentralNotificacoes(notificacoes) {
  configurarAcoesCentralNotificacoes();

  const card = document.getElementById("centralNotificacoesCard");
  const lista = document.getElementById("centralNotificacoesLista");
  const contador = document.getElementById("centralNotificacoesContador");
  const resumo = document.getElementById("centralNotificacoesResumo");

  if (!card || !lista) return;

  configurarToggleCentralNotificacoes();

  const total = notificacoes.length;
  const totalAtencao = notificacoes.filter(notificacoesEhAtencaoReal).length;

  card.dataset.totalAtencao = String(totalAtencao);
  card.dataset.totalNotificacoes = String(total);

  if (contador) {
    contador.textContent = totalAtencao === 1
      ? "1 precisa de atenção"
      : `${totalAtencao} precisam de atenção`;
    contador.className = totalAtencao > 0 ? "mini-badge status-warn" : "mini-badge status-ok";
  }

  if (resumo) {
    resumo.textContent = totalAtencao > 0
      ? `${totalAtencao} alerta${totalAtencao === 1 ? "" : "s"} realmente precisa${totalAtencao === 1 ? "" : "m"} de ação.`
      : total > 0
        ? "Sem urgências agora. Há apenas avisos informativos disponíveis."
        : "Tudo certo por enquanto. Nenhuma ação urgente agora.";
  }

  if (!total) {
    lista.innerHTML = `
      <div class="notificacoes-vazio">
        <strong>Tudo certo por enquanto.</strong>
        <p>Nenhuma notificação importante para agora.</p>
      </div>
    `;

    notificacoesAtualizarEstadoVisual(totalAtencao, total);
    return;
  }

  const grupos = [
    ["urgente", "Urgentes"],
    ["importante", "Importantes"],
    ["informativa", "Informativas"]
  ];

  lista.innerHTML = grupos.map(([prioridade, titulo]) => {
    const itens = notificacoes.filter(item => item.prioridade === prioridade);
    if (!itens.length) return "";

    return `
      <div class="notificacoes-grupo">
        <div class="notificacoes-grupo-titulo">${titulo}</div>
        ${itens.map(item => {
          const prioridadeClasse = String(item.prioridade || "informativa").replace(/[^a-z0-9_-]/gi, "");
          const iconeSeguro = escaparHtmlNotificacao(item.icone || "🔔");
          const tituloSeguro = escaparHtmlNotificacao(item.titulo || "Notificação");
          const descricaoSegura = escaparHtmlNotificacao(item.descricao || "");
          const moduloSeguro = escaparHtmlNotificacao(item.modulo || "Mensalize");
          const prioridadeSegura = escaparHtmlNotificacao(item.prioridade || "informativa");
          const acaoTipoSegura = escaparHtmlNotificacao(item.acaoTipo || "");
          const alvoSeguro = escaparHtmlNotificacao(item.alvo || "");
          const acaoTextoSeguro = escaparHtmlNotificacao(item.acaoTexto || "Abrir");

          return `
            <div class="notificacao-item prioridade-${prioridadeClasse}">
              <div class="notificacao-icone">${iconeSeguro}</div>
              <div class="notificacao-conteudo">
                <strong>${tituloSeguro}</strong>
                <p>${descricaoSegura}</p>
                <div class="notificacao-meta">
                  <span class="notificacao-tag">${moduloSeguro}</span>
                  <span class="notificacao-tag">${prioridadeSegura}</span>
                </div>
              </div>
              <button
                type="button"
                class="acao-secundaria notificacao-acao"
                data-notificacao-acao-tipo="${acaoTipoSegura}"
                data-notificacao-alvo="${alvoSeguro}"
              >
                ${acaoTextoSeguro}
              </button>
            </div>
          `;
        }).join("")}
        ${notificacoesRodapeGrupo(prioridade)}
      </div>
    `;
  }).join("");

  notificacoesAtualizarEstadoVisual(totalAtencao, total);
}

async function atualizarCentralNotificacoesInteligentes() {
  const lista = document.getElementById("centralNotificacoesLista");
  if (!lista || typeof usuarioAtual === "undefined" || !usuarioAtual) return;

  try {
    const notificacoes = await gerarNotificacoesInteligentes();
    renderizarCentralNotificacoes(notificacoes);

    if (typeof atualizarDashboardExecutivoMensalize === "function") {
      await atualizarDashboardExecutivoMensalize();
    }
  } catch (erro) {
    console.warn("[Mensalize] Erro ao atualizar central de notificações:", erro);
    lista.innerHTML = `<div class="empty-state-mini">Não foi possível carregar as notificações agora.</div>`;
  }
}

window.atualizarCentralNotificacoesInteligentes = atualizarCentralNotificacoesInteligentes;
window.notificacoesExecutarAcao = notificacoesExecutarAcao;
window.abrirTelaPresencaTurma = abrirTelaPresencaTurma;


// ================================================================
// DASHBOARD — CENTRAL DE AÇÃO PROFISSIONAL
// ================================================================

let dashboardAcaoPrincipalAtual = "";

function dashboardDiaDefinirTexto(id, valor) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(valor);
}

function dashboardDiaTextoPlural(total, singular, plural = `${singular}s`) {
  return `${total} ${total === 1 ? singular : plural}`;
}


function dashboardDiaDefinirAcaoCard(acao, texto, contexto = "") {
  const card = document.querySelector(`[data-dashboard-dia-acao="${acao}"]`);
  if (!card) return;

  const acaoVisual = card.querySelector("em");
  if (acaoVisual) acaoVisual.textContent = texto;

  const label = card.querySelector(".dashboard-executivo-label")?.textContent?.trim() || "Ação";
  const numero = card.querySelector("strong")?.textContent?.trim() || "0";
  const detalhe = contexto || card.querySelector("small")?.textContent?.trim() || "";
  card.setAttribute("aria-label", `${label}: ${numero}. ${detalhe}. ${texto}.`);
}

function dashboardExecutivoNumeroInteiro(id) {
  const el = document.getElementById(id);
  const valor = Number(String(el?.textContent || "0").replace(/[^0-9-]/g, ""));
  return Number.isFinite(valor) ? valor : 0;
}

function dashboardExecutivoAbrirFinanceiro(status = "todos") {
  if (typeof abrirViewPrincipal === "function") {
    abrirViewPrincipal("financeiro");
  }

  window.setTimeout(() => {
    const seletor = document.getElementById("financeiroStatus");
    if (!seletor) return;

    const statusPermitidos = new Set(["todos", "atrasado", "pendente", "pago"]);
    seletor.value = statusPermitidos.has(status) ? status : "todos";
    seletor.dispatchEvent(new Event("change", { bubbles: true }));
  }, 80);
}

function dashboardExecutivoExecutarMetrica(acao) {
  if (acao === "financeiro-pago") {
    dashboardExecutivoAbrirFinanceiro("pago");
    return;
  }

  if (acao === "financeiro-atrasado") {
    dashboardExecutivoAbrirFinanceiro("atrasado");
    return;
  }

  if (acao === "financeiro-aberto") {
    dashboardExecutivoAbrirFinanceiro("todos");
    return;
  }

  if (acao === "alunos" && typeof abrirViewPrincipal === "function") {
    abrirViewPrincipal("alunos");
  }
}

function dashboardExecutivoConfigurarAcoesMetricas() {
  const configuracoes = [
    { id: "totalRecebido", acao: "financeiro-pago", rotulo: "Abrir pagamentos recebidos no mês" },
    { id: "totalAReceber", acao: "financeiro-aberto", rotulo: "Abrir valores em aberto no financeiro" },
    { id: "totalAtrasados", acao: "financeiro-atrasado", rotulo: "Abrir alunos em atraso no financeiro" },
    { id: "totalAlunos", acao: "alunos", rotulo: "Abrir lista de alunos" }
  ];

  configuracoes.forEach(config => {
    const valor = document.getElementById(config.id);
    const card = valor?.closest(".card");
    if (!card || card.dataset.metricaExecutivaConfigurada === "true") return;

    card.dataset.metricaExecutivaConfigurada = "true";
    card.dataset.metricaExecutivaAcao = config.acao;
    card.classList.add("dashboard-metrica-interativa");

    if (!card.querySelector(".dashboard-metrica-atalho")) {
      const atalho = document.createElement("span");
      atalho.className = "dashboard-metrica-atalho";
      atalho.setAttribute("aria-hidden", "true");
      atalho.textContent = "↗";
      card.appendChild(atalho);
    }

    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", config.rotulo);

    const executar = () => dashboardExecutivoExecutarMetrica(config.acao);
    card.addEventListener("click", executar);
    card.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      executar();
    });
  });
}

function dashboardExecutivoAtualizarContextoMetricas() {
  dashboardExecutivoConfigurarAcoesMetricas();

  const total = dashboardExecutivoNumeroInteiro("totalAlunos");
  const pagos = dashboardExecutivoNumeroInteiro("totalPagos");
  const pendentes = dashboardExecutivoNumeroInteiro("totalPendentes");
  const atrasados = dashboardExecutivoNumeroInteiro("totalAtrasados");
  const emAberto = pendentes + atrasados;
  const percentualPago = total > 0 ? Math.round((pagos / total) * 100) : 0;

  const recebido = document.getElementById("totalRecebido")?.closest(".card");
  const receber = document.getElementById("totalAReceber")?.closest(".card");
  const atraso = document.getElementById("totalAtrasados")?.closest(".card");
  const alunosCard = document.getElementById("totalAlunos")?.closest(".card");

  [recebido, receber, atraso, alunosCard].forEach(card => {
    card?.classList.remove("metrica-saudavel", "metrica-atencao", "metrica-critica");
  });

  const recebidoTexto = recebido?.querySelector("span");
  if (recebidoTexto) {
    recebidoTexto.textContent = total > 0
      ? `${pagos} de ${total} aluno${total === 1 ? "" : "s"} quitaram o mês • ${percentualPago}% da base.`
      : "Receita confirmada assim que os primeiros pagamentos entrarem.";
  }
  recebido?.classList.add(pagos > 0 ? "metrica-saudavel" : "metrica-atencao");

  const receberTexto = receber?.querySelector("span");
  if (receberTexto) {
    receberTexto.textContent = emAberto > 0
      ? `${pendentes} pendente${pendentes === 1 ? "" : "s"} • ${atrasados} em atraso.`
      : "Nenhum valor em aberto no momento.";
  }
  receber?.classList.add(emAberto > 0 ? "metrica-atencao" : "metrica-saudavel");

  const atrasoTexto = atraso?.querySelector("span");
  if (atrasoTexto) {
    atrasoTexto.textContent = atrasados > 0
      ? `Prioridade: regularizar ${dashboardDiaTextoPlural(atrasados, "aluno", "alunos")}.`
      : "Nenhum aluno com vencimento passado.";
  }
  atraso?.classList.add(atrasados > 0 ? "metrica-critica" : "metrica-saudavel");

  const alunosTexto = alunosCard?.querySelector("span");
  if (alunosTexto) {
    alunosTexto.textContent = total > 0
      ? `${pagos} pago${pagos === 1 ? "" : "s"} no mês • ${emAberto} em aberto.`
      : "Cadastre o primeiro aluno para começar a operação.";
  }
  alunosCard?.classList.add(total > 0 ? "metrica-saudavel" : "metrica-atencao");

  if (recebido) recebido.setAttribute("aria-label", `Recebido no mês. ${recebidoTexto?.textContent || ""} Abrir financeiro.`);
  if (receber) receber.setAttribute("aria-label", `A receber. ${receberTexto?.textContent || ""} Abrir financeiro.`);
  if (atraso) atraso.setAttribute("aria-label", `Atrasados. ${atrasoTexto?.textContent || ""} Abrir atrasados no financeiro.`);
  if (alunosCard) alunosCard.setAttribute("aria-label", `Total de alunos. ${alunosTexto?.textContent || ""} Abrir lista de alunos.`);
}

function dashboardDiaAtualizarCard(acao, valor, status = "neutro") {
  const card = document.querySelector(`[data-dashboard-dia-acao="${acao}"]`);
  if (!card) return;

  card.classList.remove("tem-alerta", "status-ok", "status-neutro", "status-critico", "status-info");

  if (status === "critico") {
    card.classList.add("tem-alerta", "status-critico");
  } else if (status === "alerta" || Number(valor) > 0) {
    card.classList.add("tem-alerta");
  } else if (status === "info") {
    card.classList.add("status-info");
  } else if (status === "ok" || Number(valor) === 0) {
    card.classList.add("status-ok");
  } else {
    card.classList.add("status-neutro");
  }
}

function dashboardDiaAlunoAtivo(aluno) {
  const status = String(aluno?.status_aluno || "ativo").toLowerCase();
  return status !== "inativo" && status !== "pausado";
}

function dashboardDiaFinanceiroHoje() {
  const hoje = typeof dataHojeSemHora === "function" ? dataHojeSemHora() : new Date();
  const resumo = { atrasados: 0, vencemHoje: 0, total: 0, primeiroAtrasadoId: "" };

  (alunos || []).filter(dashboardDiaAlunoAtivo).forEach(aluno => {
    if (!aluno || !aluno.vencimento) return;
    if (typeof alunosPagosMes !== "undefined" && alunosPagosMes instanceof Set && alunosPagosMes.has(String(aluno.id))) return;

    const vencimento = typeof notificacoesDataLocal === "function"
      ? notificacoesDataLocal(aluno.vencimento)
      : new Date(aluno.vencimento);

    if (!vencimento || Number.isNaN(vencimento.getTime())) return;

    const dias = typeof notificacoesDiasEntre === "function"
      ? notificacoesDiasEntre(vencimento, hoje)
      : Math.round((vencimento - hoje) / (1000 * 60 * 60 * 24));

    if (dias < 0) {
      resumo.atrasados++;
      if (!resumo.primeiroAtrasadoId) resumo.primeiroAtrasadoId = aluno.id;
    } else if (dias === 0) {
      resumo.vencemHoje++;
    }
  });

  resumo.total = resumo.atrasados + resumo.vencemHoje;
  return resumo;
}

function dashboardDiaContarChamadasPendentes() {
  if (typeof moduloPresencaAtivo !== "undefined" && moduloPresencaAtivo === false) return 0;

  return (turmasCadastradas || [])
    .filter(turma => turma && turma.ativa !== false)
    .filter(turma => typeof notificacoesTurmaTemAulaHoje === "function" ? notificacoesTurmaTemAulaHoje(turma) : false)
    .filter(turma => typeof notificacoesAulaCanceladaHoje === "function" ? !notificacoesAulaCanceladaHoje(turma) : true)
    .filter(turma => typeof notificacoesChamadaJaFeitaHoje === "function" ? !notificacoesChamadaJaFeitaHoje(turma) : true)
    .length;
}

function dashboardDiaContarAptosGraduacao() {
  if (typeof moduloEvolucaoAtivo !== "undefined" && moduloEvolucaoAtivo === false) return 0;
  if (typeof calcularStatusEvolucao !== "function") return 0;

  return (alunos || [])
    .filter(dashboardDiaAlunoAtivo)
    .map(aluno => calcularStatusEvolucao(aluno))
    .filter(status => status && status.status === "apto")
    .length;
}

function dashboardDiaContarAniversariantesHoje() {
  if (typeof obterAniversariantesOrdenados !== "function") return 0;
  return obterAniversariantesOrdenados().filter(aluno => aluno.aniversario_hoje).length;
}

function dashboardDiaContarAlunosRetencao() {
  if (typeof moduloPresencaAtivo !== "undefined" && moduloPresencaAtivo === false) return 0;
  if (typeof notificacoesAlunosSumindo !== "function") return 0;
  return notificacoesAlunosSumindo().length;
}

function dashboardDiaExecutarAcao(acao) {
  if (acao === "alunos") {
    if (typeof abrirViewPrincipal === "function") abrirViewPrincipal("alunos");
    return;
  }

  if (acao === "cobrancas" || acao === "atrasados") {
    const botaoCobrar = document.getElementById("btnCobrarAtrasados");
    const financeiro = dashboardDiaFinanceiroHoje();

    if (financeiro.atrasados > 0 && botaoCobrar) {
      botaoCobrar.click();
      return;
    }

    if (typeof abrirViewPrincipal === "function") abrirViewPrincipal("alunos");
    if (typeof setFiltro === "function") setFiltro(financeiro.vencemHoje > 0 ? "hoje" : "atrasado");
    return;
  }

  if (acao === "solicitacoes") {
    if (typeof abrirViewPrincipal === "function") abrirViewPrincipal("solicitacoes");
    return;
  }

  if (acao === "presencas") {
    if (typeof abrirViewPrincipal === "function") abrirViewPrincipal("presencas");
    return;
  }

  if (acao === "graduacao") {
    if (typeof abrirViewPrincipal === "function") abrirViewPrincipal("evolucao");
    return;
  }

  if (acao === "aniversariantes") {
    if (typeof abrirViewPrincipal === "function") abrirViewPrincipal("aniversariantes");
    return;
  }

  if (acao === "retencao") {
    const alunoSumindo = typeof notificacoesAlunosSumindo === "function" ? notificacoesAlunosSumindo()[0] : null;
    if (alunoSumindo && alunoSumindo.aluno && typeof notificacoesAbrirWhatsAppAluno === "function") {
      notificacoesAbrirWhatsAppAluno(alunoSumindo.aluno.id, "sumindo");
      return;
    }

    if (typeof abrirViewPrincipal === "function") abrirViewPrincipal("alunos");
  }
}

function dashboardDiaConfigurarAcoes() {
  document.querySelectorAll("[data-dashboard-dia-acao]").forEach(card => {
    if (card.dataset.dashboardAcaoConfigurada === "true") return;
    card.dataset.dashboardAcaoConfigurada = "true";

    card.addEventListener("click", () => {
      dashboardDiaExecutarAcao(card.dataset.dashboardDiaAcao || "");
    });
  });

  const botaoPrincipal = document.getElementById("dashboardAcaoPrincipalBotao");
  const cardPrincipal = document.getElementById("dashboardAcaoPrincipalCard");

  if (botaoPrincipal && botaoPrincipal.dataset.dashboardAcaoConfigurada !== "true") {
    botaoPrincipal.dataset.dashboardAcaoConfigurada = "true";
    botaoPrincipal.addEventListener("click", event => {
      event.stopPropagation();
      dashboardDiaExecutarAcao(dashboardAcaoPrincipalAtual || cardPrincipal?.dataset.dashboardPrioridadeAcao || "");
    });
  }

  if (cardPrincipal && cardPrincipal.dataset.dashboardCardConfigurado !== "true") {
    cardPrincipal.dataset.dashboardCardConfigurado = "true";
    cardPrincipal.addEventListener("click", event => {
      if (event.target && event.target.closest && event.target.closest("button")) return;
      dashboardDiaExecutarAcao(dashboardAcaoPrincipalAtual || cardPrincipal.dataset.dashboardPrioridadeAcao || "");
    });
  }
}

function dashboardDiaMontarPrioridades({ financeiro, solicitacoes, chamadasPendentes, aptosGraduacao, retencao, aniversariantes }) {
  const prioridades = [];

  if (financeiro.atrasados > 0) {
    prioridades.push({
      peso: 10,
      acao: "cobrancas",
      icone: "🚨",
      titulo: financeiro.atrasados === 1 ? "Cobrar 1 aluno em atraso" : `Cobrar ${financeiro.atrasados} alunos em atraso`,
      descricao: "A inadimplência é a ação mais importante de hoje. Abra a cobrança em massa e envie as mensagens pelo WhatsApp.",
      botao: "Cobrar agora",
      meta: financeiro.vencemHoje > 0 ? `${financeiro.vencemHoje} também vence hoje` : "Prioridade financeira"
    });
  }

  if ((solicitacoes.pagamentos || 0) > 0) {
    prioridades.push({
      peso: 9,
      acao: "solicitacoes",
      icone: "💸",
      titulo: "Conferir pagamentos enviados pelos alunos",
      descricao: "Existem comprovantes ou solicitações de pagamento esperando sua análise. Resolver rápido reduz dúvida do aluno.",
      botao: "Resolver pagamentos",
      meta: dashboardDiaTextoPlural(solicitacoes.pagamentos, "pagamento pendente", "pagamentos pendentes")
    });
  } else if ((solicitacoes.total || 0) > 0) {
    prioridades.push({
      peso: 8,
      acao: "solicitacoes",
      icone: "📝",
      titulo: "Responder solicitações pendentes",
      descricao: "Os alunos enviaram pedidos que precisam de decisão. Resolva para manter a operação fluida.",
      botao: "Ver solicitações",
      meta: dashboardDiaTextoPlural(solicitacoes.total, "solicitação", "solicitações")
    });
  }

  if (chamadasPendentes > 0) {
    prioridades.push({
      peso: 7,
      acao: "presencas",
      icone: "✅",
      titulo: chamadasPendentes === 1 ? "Fazer a chamada de hoje" : `Fazer ${chamadasPendentes} chamadas de hoje`,
      descricao: "Manter presença registrada melhora retenção, evolução e histórico do aluno.",
      botao: "Fazer chamada",
      meta: "Rotina operacional"
    });
  }

  if (aptosGraduacao > 0) {
    prioridades.push({
      peso: 6,
      acao: "graduacao",
      icone: "🥋",
      titulo: aptosGraduacao === 1 ? "1 aluno apto para avaliação" : `${aptosGraduacao} alunos aptos para avaliação`,
      descricao: "Graduação é valor percebido alto. Use isso para gerar progresso, engajamento e retenção.",
      botao: "Ver graduação",
      meta: "Oportunidade de valor Pro"
    });
  }

  if (retencao > 0) {
    prioridades.push({
      peso: 5,
      acao: "retencao",
      icone: "👀",
      titulo: retencao === 1 ? "1 aluno pode estar sumindo" : `${retencao} alunos podem estar sumindo`,
      descricao: "Chamar o aluno antes de ele abandonar é uma das ações mais baratas para proteger receita recorrente.",
      botao: "Chamar aluno",
      meta: "Retenção"
    });
  }

  if (financeiro.vencemHoje > 0) {
    prioridades.push({
      peso: 4,
      acao: "cobrancas",
      icone: "📅",
      titulo: financeiro.vencemHoje === 1 ? "1 mensalidade vence hoje" : `${financeiro.vencemHoje} mensalidades vencem hoje`,
      descricao: "Enviar lembrete no dia do vencimento evita atraso e reduz cobrança manual depois.",
      botao: "Ver vencimentos",
      meta: "Prevenção de atraso"
    });
  }

  if (aniversariantes > 0) {
    prioridades.push({
      peso: 3,
      acao: "aniversariantes",
      icone: "🎂",
      titulo: aniversariantes === 1 ? "1 aniversariante hoje" : `${aniversariantes} aniversariantes hoje`,
      descricao: "Relacionamento simples que aumenta proximidade com alunos e responsáveis.",
      botao: "Enviar parabéns",
      meta: "Relacionamento"
    });
  }

  return prioridades.sort((a, b) => b.peso - a.peso);
}

function dashboardDiaAtualizarAcaoPrincipal(prioridades) {
  const card = document.getElementById("dashboardAcaoPrincipalCard");
  const icone = document.getElementById("dashboardAcaoPrincipalIcone");
  const titulo = document.getElementById("dashboardAcaoPrincipalTitulo");
  const descricao = document.getElementById("dashboardAcaoPrincipalDescricao");
  const meta = document.getElementById("dashboardAcaoPrincipalMeta");
  const botao = document.getElementById("dashboardAcaoPrincipalBotao");

  if (!card) return;

  const prioridade = prioridades[0] || {
    acao: "alunos",
    icone: "✨",
    titulo: "Operação em dia",
    descricao: "Nenhuma ação urgente agora. Bom momento para cadastrar alunos, revisar financeiro ou melhorar a comunicação da academia.",
    botao: "Ver alunos",
    meta: "Sem pendências críticas"
  };

  dashboardAcaoPrincipalAtual = prioridade.acao;
  card.dataset.dashboardPrioridadeAcao = prioridade.acao;
  card.classList.toggle("central-acao-principal-ok", prioridades.length === 0);

  if (icone) icone.textContent = prioridade.icone;
  if (titulo) titulo.textContent = prioridade.titulo;
  if (descricao) descricao.textContent = prioridade.descricao;
  if (meta) meta.textContent = prioridade.meta;
  if (botao) botao.textContent = prioridade.botao;
}

async function atualizarDashboardExecutivoMensalize() {
  const container = document.getElementById("centralAcaoDashboard") || document.querySelector(".dashboard-executivo-pro");
  if (!container) return;

  dashboardDiaConfigurarAcoes();

  const statusOperacao = document.getElementById("dashboardStatusOperacao");
  const descricaoCentral = document.getElementById("dashboardCentralDescricao");

  let solicitacoes = { total: 0, pagamentos: 0, alteracoes: 0 };
  try {
    if (typeof notificacoesContarSolicitacoesPendentes === "function") {
      solicitacoes = await notificacoesContarSolicitacoesPendentes();
    }
  } catch (erro) {
    console.warn("[Mensalize] Não foi possível atualizar solicitações da central de ação:", erro);
  }

  const financeiro = dashboardDiaFinanceiroHoje();
  const chamadasPendentes = dashboardDiaContarChamadasPendentes();
  const aptosGraduacao = dashboardDiaContarAptosGraduacao();
  const aniversariantes = dashboardDiaContarAniversariantesHoje();
  const retencao = dashboardDiaContarAlunosRetencao();

  dashboardDiaDefinirTexto("dashboardDiaAtrasados", financeiro.total);
  dashboardDiaDefinirTexto("dashboardDiaSolicitacoes", solicitacoes.total || 0);
  dashboardDiaDefinirTexto("dashboardDiaChamadas", chamadasPendentes);
  dashboardDiaDefinirTexto("dashboardDiaGraduacao", aptosGraduacao);
  dashboardDiaDefinirTexto("dashboardDiaAniversariantes", aniversariantes);
  dashboardDiaDefinirTexto("dashboardDiaRetencao", retencao);

  dashboardDiaDefinirTexto(
    "dashboardDiaCobrancasDetalhe",
    financeiro.atrasados > 0
      ? dashboardDiaTextoPlural(financeiro.atrasados, "aluno em atraso", "alunos em atraso")
      : financeiro.vencemHoje > 0
        ? dashboardDiaTextoPlural(financeiro.vencemHoje, "vence hoje", "vencem hoje")
        : "Nenhuma cobrança crítica"
  );

  dashboardDiaDefinirTexto(
    "dashboardDiaSolicitacoesDetalhe",
    solicitacoes.total > 0
      ? `${solicitacoes.pagamentos || 0} pagamento${(solicitacoes.pagamentos || 0) === 1 ? "" : "s"} • ${solicitacoes.alteracoes || 0} alteração${(solicitacoes.alteracoes || 0) === 1 ? "" : "ões"}`
      : "Nada pendente agora"
  );

  dashboardDiaDefinirTexto(
    "dashboardDiaChamadasDetalhe",
    chamadasPendentes > 0
      ? dashboardDiaTextoPlural(chamadasPendentes, "aula pendente", "aulas pendentes")
      : "Chamadas em dia"
  );

  dashboardDiaDefinirTexto(
    "dashboardDiaGraduacaoDetalhe",
    aptosGraduacao > 0
      ? dashboardDiaTextoPlural(aptosGraduacao, "aluno apto", "alunos aptos")
      : "Sem alunos aptos agora"
  );

  dashboardDiaDefinirTexto(
    "dashboardDiaRetencaoDetalhe",
    retencao > 0
      ? dashboardDiaTextoPlural(retencao, "aluno com risco", "alunos com risco")
      : "Sem risco detectado"
  );

  dashboardDiaDefinirTexto(
    "dashboardDiaAniversariantesDetalhe",
    aniversariantes > 0
      ? dashboardDiaTextoPlural(aniversariantes, "aniversariante hoje", "aniversariantes hoje")
      : "Nenhum hoje"
  );

  dashboardDiaAtualizarCard("cobrancas", financeiro.total, financeiro.atrasados > 0 ? "critico" : financeiro.vencemHoje > 0 ? "alerta" : "ok");
  dashboardDiaAtualizarCard("solicitacoes", solicitacoes.total || 0, (solicitacoes.pagamentos || 0) > 0 ? "critico" : (solicitacoes.total || 0) > 0 ? "alerta" : "ok");
  dashboardDiaAtualizarCard("presencas", chamadasPendentes, chamadasPendentes > 0 ? "alerta" : "ok");
  dashboardDiaAtualizarCard("graduacao", aptosGraduacao, aptosGraduacao > 0 ? "info" : "ok");
  dashboardDiaAtualizarCard("retencao", retencao, retencao > 0 ? "alerta" : "ok");
  dashboardDiaAtualizarCard("aniversariantes", aniversariantes, aniversariantes > 0 ? "info" : "ok");

  dashboardDiaDefinirAcaoCard(
    "cobrancas",
    financeiro.atrasados > 0 ? "Cobrar agora" : financeiro.vencemHoje > 0 ? "Ver vencimentos" : "Em dia",
    document.getElementById("dashboardDiaCobrancasDetalhe")?.textContent || ""
  );
  dashboardDiaDefinirAcaoCard(
    "solicitacoes",
    (solicitacoes.total || 0) > 0 ? "Resolver" : "Sem pendências",
    document.getElementById("dashboardDiaSolicitacoesDetalhe")?.textContent || ""
  );
  dashboardDiaDefinirAcaoCard(
    "presencas",
    chamadasPendentes > 0 ? "Fazer chamada" : "Em dia",
    document.getElementById("dashboardDiaChamadasDetalhe")?.textContent || ""
  );
  dashboardDiaDefinirAcaoCard(
    "graduacao",
    aptosGraduacao > 0 ? "Ver alunos" : "Acompanhar",
    document.getElementById("dashboardDiaGraduacaoDetalhe")?.textContent || ""
  );
  dashboardDiaDefinirAcaoCard(
    "retencao",
    retencao > 0 ? "Chamar aluno" : "Saudável",
    document.getElementById("dashboardDiaRetencaoDetalhe")?.textContent || ""
  );
  dashboardDiaDefinirAcaoCard(
    "aniversariantes",
    aniversariantes > 0 ? "Enviar parabéns" : "Sem ações",
    document.getElementById("dashboardDiaAniversariantesDetalhe")?.textContent || ""
  );

  dashboardExecutivoAtualizarContextoMetricas();

  const prioridades = dashboardDiaMontarPrioridades({
    financeiro,
    solicitacoes,
    chamadasPendentes,
    aptosGraduacao,
    retencao,
    aniversariantes
  });

  dashboardDiaAtualizarAcaoPrincipal(prioridades);

  const totalAcoes = financeiro.total + (solicitacoes.total || 0) + chamadasPendentes + aptosGraduacao + retencao + aniversariantes;
  const totalCritico = financeiro.atrasados + (solicitacoes.pagamentos || 0);

  if (statusOperacao) {
    statusOperacao.classList.remove("status-ok", "status-alerta", "status-critico");

    if (totalCritico > 0) {
      statusOperacao.textContent = totalCritico === 1 ? "1 prioridade crítica" : `${totalCritico} prioridades críticas`;
      statusOperacao.classList.add("status-critico");
    } else if (totalAçõesNormalize(totalAcoes) > 0) {
      statusOperacao.textContent = totalAcoes === 1 ? "1 ação recomendada" : `${totalAcoes} ações recomendadas`;
      statusOperacao.classList.add("status-alerta");
    } else {
      statusOperacao.textContent = "Operação em dia";
      statusOperacao.classList.add("status-ok");
    }
  }

  if (descricaoCentral) {
    descricaoCentral.textContent = totalAcoes > 0
      ? "Priorize o que protege receita, reduz abandono e melhora a experiência dos alunos."
      : "Nenhuma urgência agora. Use este momento para crescer base, revisar processos ou nutrir relacionamento.";
  }
}

function totalAçõesNormalize(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

window.atualizarDashboardExecutivoMensalize = atualizarDashboardExecutivoMensalize;
window.dashboardDiaExecutarAcao = dashboardDiaExecutarAcao;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      if (typeof atualizarDashboardExecutivoMensalize === "function") atualizarDashboardExecutivoMensalize();
    }, 1200);
  });
} else {
  setTimeout(() => {
    if (typeof atualizarDashboardExecutivoMensalize === "function") atualizarDashboardExecutivoMensalize();
  }, 1200);
}
