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
        ${itens.map(item => `
          <div class="notificacao-item prioridade-${item.prioridade}">
            <div class="notificacao-icone">${item.icone}</div>
            <div class="notificacao-conteudo">
              <strong>${item.titulo}</strong>
              <p>${item.descricao}</p>
              <div class="notificacao-meta">
                <span class="notificacao-tag">${item.modulo}</span>
                <span class="notificacao-tag">${item.prioridade}</span>
              </div>
            </div>
            <button type="button" class="acao-secundaria notificacao-acao" onclick="notificacoesExecutarAcao('${item.acaoTipo}', '${String(item.alvo || "").replace(/'/g, "\\'")}')">
              ${item.acaoTexto}
            </button>
          </div>
        `).join("")}
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
  } catch (erro) {
    console.warn("[Mensalize] Erro ao atualizar central de notificações:", erro);
    lista.innerHTML = `<div class="empty-state-mini">Não foi possível carregar as notificações agora.</div>`;
  }
}

window.atualizarCentralNotificacoesInteligentes = atualizarCentralNotificacoesInteligentes;
window.notificacoesExecutarAcao = notificacoesExecutarAcao;
window.abrirTelaPresencaTurma = abrirTelaPresencaTurma;
