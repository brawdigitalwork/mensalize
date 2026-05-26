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

  let queryPagamentos = supabaseClient
    .from("pagamentos")
    .select("id,user_id,aluno_id,valor,data_pagamento,created_at");

  queryPagamentos = aplicarFiltroUsuario(queryPagamentos);

  const { data: pagamentos, error } = await queryPagamentos
    .gte("data_pagamento", primeiroDiaMes)
    .lte("data_pagamento", ultimoDiaMes);

  const pagamentosValidos = pagamentos || [];

  // Conta alunos únicos pagos no mês, não a quantidade de linhas na tabela pagamentos.
  const alunosQueJaPagaramIds = new Set(
    pagamentosValidos.map(p => String(p.aluno_id))
  );

  let pendentes = 0;
  let atrasados = 0;
  let valorAReceber = 0;
  let previsaoTotal = 0;

  alunos.forEach(function(aluno) {
    const jaPagou = alunosQueJaPagaramIds.has(String(aluno.id));
    const valorAluno = valorParaNumero(aluno.valor);

    previsaoTotal += valorAluno;

    if (!jaPagou) {
      const status = verificarStatus(aluno.vencimento);
      valorAReceber += valorAluno;

      if (status === "atrasado") {
        atrasados++;
      } else {
        pendentes++;
      }
    }
  });

  const recebido = pagamentosValidos.reduce((total, pagamento) => {
    return total + valorParaNumero(pagamento.valor);
  }, 0);

  if (error) {
    console.log("Erro ao carregar pagamentos:", error.message);
    totalPagos.textContent = 0;
    totalRecebido.textContent = "R$ 0,00";
    totalPrevisao.textContent = formatarMoeda(previsaoTotal);
  } else {
    totalPagos.textContent = alunosQueJaPagaramIds.size;
    totalRecebido.textContent = formatarMoeda(recebido);
    totalPrevisao.textContent = formatarMoeda(previsaoTotal);
  }

  totalAlunos.textContent = alunos.length;
  totalPendentes.textContent = pendentes;
  totalAtrasados.textContent = atrasados;
  totalAReceber.textContent = formatarMoeda(valorAReceber);

  atualizarMiniGraficosFinanceiros({
    recebido,
    valorAReceber,
    atrasados,
    totalAlunosDashboard: alunos.length,
    pagamentosValidos
  });

  atualizarEspelhosFinanceiros();
  atualizarResumoEvolucao();
}


// ===============================
// 17.1 MINI GRÁFICOS DOS CARDS FINANCEIROS
// ===============================

function limitarNumeroGrafico(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : 0;
}

function gerarSerieVisualFinanceira(valorAtual, tipo = "neutro") {
  const base = limitarNumeroGrafico(valorAtual);

  if (base <= 0) {
    return [0, 0, 0, 0, 0, 0, 0];
  }

  const curvas = {
    receita: [0.44, 0.56, 0.50, 0.68, 0.63, 0.82, 1],
    receber: [0.86, 0.92, 0.78, 0.88, 0.74, 0.68, 1],
    atraso: [0.58, 0.64, 0.70, 0.66, 0.82, 0.76, 1],
    alunos: [0.72, 0.76, 0.80, 0.84, 0.88, 0.94, 1]
  };

  return (curvas[tipo] || curvas.receita).map(fator => Math.max(0, Math.round(base * fator)));
}

function gerarSerieRecebidosDoMes(pagamentosValidos = []) {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const buckets = Array.from({ length: 7 }, () => 0);

  pagamentosValidos.forEach(pagamento => {
    if (!pagamento || !pagamento.data_pagamento) return;

    const data = new Date(`${String(pagamento.data_pagamento).split("T")[0]}T12:00:00`);
    if (Number.isNaN(data.getTime()) || data.getMonth() !== mes || data.getFullYear() !== ano) return;

    const indice = Math.min(6, Math.floor(((data.getDate() - 1) / diasNoMes) * 7));
    buckets[indice] += valorParaNumero(pagamento.valor);
  });

  const temValor = buckets.some(valor => valor > 0);
  if (!temValor) return gerarSerieVisualFinanceira(0, "receita");

  // Mantém o gráfico vivo mesmo quando os pagamentos ficaram concentrados em poucos dias.
  for (let i = 1; i < buckets.length; i++) {
    if (buckets[i] === 0 && buckets[i - 1] > 0) {
      buckets[i] = Math.round(buckets[i - 1] * 0.32);
    }
  }

  return buckets;
}

function gerarSerieAlunos(alunosLista = []) {
  const totalAtual = alunosLista.length;
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);
  const serie = [];

  for (let i = 0; i < 6; i++) {
    const limite = new Date(inicio.getFullYear(), inicio.getMonth() + i + 1, 0, 23, 59, 59);
    const totalAteMes = alunosLista.filter(aluno => {
      if (!aluno.created_at) return true;
      const criadoEm = new Date(aluno.created_at);
      return !Number.isNaN(criadoEm.getTime()) && criadoEm <= limite;
    }).length;

    serie.push(totalAteMes);
  }

  if (!serie.some(valor => valor > 0)) {
    return gerarSerieVisualFinanceira(totalAtual, "alunos");
  }

  return serie;
}

function criarSparklineSVG(valores = []) {
  const serie = (valores.length ? valores : [0, 0, 0, 0, 0, 0, 0]).map(limitarNumeroGrafico);
  const largura = 150;
  const altura = 44;
  const margem = 4;
  const maximo = Math.max(...serie, 1);
  const minimo = Math.min(...serie, 0);
  const intervalo = Math.max(maximo - minimo, 1);

  const pontos = serie.map((valor, indice) => {
    const x = margem + (indice * ((largura - margem * 2) / Math.max(serie.length - 1, 1)));
    const y = altura - margem - (((valor - minimo) / intervalo) * (altura - margem * 2));
    return [Number(x.toFixed(2)), Number(y.toFixed(2))];
  });

  const linha = pontos.map(([x, y], indice) => `${indice === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const area = `${linha} L${largura - margem},${altura - margem} L${margem},${altura - margem} Z`;

  return `
    <svg class="mini-chart-svg" viewBox="0 0 ${largura} ${altura}" aria-hidden="true" focusable="false">
      <path class="mini-chart-area" d="${area}"></path>
      <path class="mini-chart-line" d="${linha}"></path>
      <circle class="mini-chart-dot" cx="${pontos[pontos.length - 1][0]}" cy="${pontos[pontos.length - 1][1]}" r="3.2"></circle>
    </svg>
  `;
}

function inserirMiniGraficoCard(elementoValor, opcoes) {
  if (!elementoValor) return;

  const card = elementoValor.closest(".card");
  if (!card) return;

  let grafico = card.querySelector(".mini-card-chart");
  if (!grafico) {
    grafico = document.createElement("div");
    grafico.className = "mini-card-chart";
    card.appendChild(grafico);
  }

  card.classList.add("card-com-mini-grafico");
  grafico.className = `mini-card-chart mini-card-chart-${opcoes.tipo}`;
  grafico.innerHTML = `
    ${criarSparklineSVG(opcoes.serie)}
    <span>${opcoes.legenda}</span>
  `;
}

function atualizarMiniGraficosFinanceiros(dados = {}) {
  try {
    const recebido = limitarNumeroGrafico(dados.recebido);
    const valorAReceber = limitarNumeroGrafico(dados.valorAReceber);
    const atrasadosQtd = limitarNumeroGrafico(dados.atrasados);
    const totalAlunosDashboard = limitarNumeroGrafico(dados.totalAlunosDashboard);

    inserirMiniGraficoCard(totalRecebido, {
      tipo: "receita",
      serie: gerarSerieRecebidosDoMes(dados.pagamentosValidos || []),
      legenda: recebido > 0 ? "Movimento do mês" : "Sem recebimentos ainda"
    });

    inserirMiniGraficoCard(totalAReceber, {
      tipo: "receber",
      serie: gerarSerieVisualFinanceira(valorAReceber, "receber"),
      legenda: "Tendência de cobrança"
    });

    inserirMiniGraficoCard(totalAtrasados, {
      tipo: "atraso",
      serie: gerarSerieVisualFinanceira(atrasadosQtd, "atraso"),
      legenda: atrasadosQtd > 0 ? "Atenção aos atrasos" : "Nenhum atraso no momento"
    });

    inserirMiniGraficoCard(totalAlunos, {
      tipo: "alunos",
      serie: gerarSerieAlunos(alunos),
      legenda: totalAlunosDashboard > 0 ? "Crescimento da base" : "Sem alunos cadastrados"
    });
  } catch (error) {
    console.warn("[Mensalize] Não foi possível renderizar os mini gráficos:", error);
  }
}



/** Carrega os 3 pagamentos mais recentes para a dashboard inicial. */
async function carregarUltimosPagamentos() {
  if (!ultimosPagamentos) return;

  ultimosPagamentos.innerHTML = `<div class="empty-state-mini">Carregando últimos pagamentos...</div>`;

  let queryUltimos = supabaseClient
    .from("pagamentos")
    .select("id,user_id,aluno_id,valor,data_pagamento,created_at")
    .order("data_pagamento", { ascending: false })
    .limit(3);

  queryUltimos = aplicarFiltroUsuario(queryUltimos);

  const { data, error } = await queryUltimos;

  if (error) {
    console.log("Erro ao carregar últimos pagamentos:", error.message);
    ultimosPagamentos.innerHTML = `<div class="empty-state-mini">Não foi possível carregar os últimos pagamentos.</div>`;
    return;
  }

  if (!data || data.length === 0) {
    ultimosPagamentos.innerHTML = `<div class="empty-state-mini">Nenhum pagamento registrado ainda.</div>`;
    return;
  }

  ultimosPagamentos.innerHTML = "";

  data.forEach(pagamento => {
    const aluno = alunos.find(a => String(a.id) === String(pagamento.aluno_id));
    const nomeAluno = aluno ? aluno.nome : "Aluno removido ou não encontrado";
    const dataPagamento = pagamento.data_pagamento ? formatarData(String(pagamento.data_pagamento).split("T")[0]) : "Data não informada";

    const item = document.createElement("div");
    item.className = "pagamento-recente-item";
    item.innerHTML = `
      <div>
        <strong>${nomeAluno}</strong>
        <span>Pago em ${dataPagamento}</span>
      </div>
      <span class="pagamento-recente-valor">${formatarMoeda(pagamento.valor)}</span>
    `;

    ultimosPagamentos.appendChild(item);
  });
}

/** Espelha os números principais na aba Financeiro. */
function atualizarEspelhosFinanceiros() {
  // Se a aba Financeiro mensal existir, ela deve respeitar mês e status selecionados,
  // não apenas copiar os cards do dashboard do mês atual.
  if (financeiroMes && listaFinanceiroMensal && typeof carregarResumoFinanceiroMensal === "function") {
    carregarResumoFinanceiroMensal({ silencioso: true });
    return;
  }

  if (financeiroRecebidoMirror && totalRecebido) {
    financeiroRecebidoMirror.textContent = totalRecebido.textContent;
  }

  if (financeiroAReceberMirror && totalAReceber) {
    financeiroAReceberMirror.textContent = totalAReceber.textContent;
  }

  if (financeiroPrevisaoMirror && totalPrevisao) {
    financeiroPrevisaoMirror.textContent = totalPrevisao.textContent;
  }
}

// ===============================
// 17.3 FINANCEIRO — MÊS, STATUS E DETALHAMENTO
// ===============================

function obterMesAtualFinanceiro() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

function obterPeriodoFinanceiroSelecionado() {
  const valorMes = financeiroMes && financeiroMes.value
    ? String(financeiroMes.value).slice(0, 7)
    : obterMesAtualFinanceiro();

  const [anoTexto, mesTexto] = valorMes.split("-");
  const ano = Number(anoTexto);
  const mesNumero = Number(mesTexto);

  if (!Number.isFinite(ano) || !Number.isFinite(mesNumero) || mesNumero < 1 || mesNumero > 12) {
    const fallback = obterMesAtualFinanceiro();
    const [anoFallback, mesFallback] = fallback.split("-").map(Number);
    const fimFallback = new Date(anoFallback, mesFallback, 0);
    return {
      mes: fallback,
      inicio: `${fallback}-01`,
      fim: `${anoFallback}-${String(mesFallback).padStart(2, "0")}-${String(fimFallback.getDate()).padStart(2, "0")}`,
      ano: anoFallback,
      mesNumero: mesFallback
    };
  }

  const fimData = new Date(ano, mesNumero, 0);
  const mesFormatado = `${ano}-${String(mesNumero).padStart(2, "0")}`;

  return {
    mes: mesFormatado,
    inicio: `${mesFormatado}-01`,
    fim: `${ano}-${String(mesNumero).padStart(2, "0")}-${String(fimData.getDate()).padStart(2, "0")}`,
    ano,
    mesNumero
  };
}

function normalizarFiltroFinanceiroStatus(valor) {
  const status = String(valor || "todos").trim().toLowerCase();
  const mapa = {
    todos: "todos",
    todo: "todos",
    pago: "pago",
    pagos: "pago",
    pendente: "pendente",
    pendentes: "pendente",
    atrasado: "atrasado",
    atrasados: "atrasado"
  };

  return mapa[status] || "todos";
}

function statusFinanceiroTexto(status) {
  const mapa = {
    todos: "Todos",
    pago: "Pago",
    pendente: "Pendente",
    atrasado: "Atrasado"
  };

  return mapa[normalizarFiltroFinanceiroStatus(status)] || "Status";
}

function dataFinanceiroParaDate(dataString) {
  if (!dataString) return null;
  const partes = String(dataString).split("-");
  if (partes.length !== 3) return null;
  const data = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  return Number.isNaN(data.getTime()) ? null : data;
}

function classificarFinanceiroAlunoMes(aluno, pagosSet, dataFimPeriodo) {
  if (!aluno) return "pendente";
  if (pagosSet && pagosSet.has(String(aluno.id))) return "pago";

  const vencimento = dataFinanceiroParaDate(aluno.vencimento);
  const fimPeriodo = dataFinanceiroParaDate(dataFimPeriodo);
  const hoje = dataHojeSemHora ? dataHojeSemHora() : new Date();
  const dataComparacao = fimPeriodo && fimPeriodo < hoje ? fimPeriodo : hoje;

  if (vencimento && vencimento < dataComparacao) return "atrasado";
  return "pendente";
}

function montarLinhaFinanceiroMensal(item) {
  const aluno = item.aluno || {};
  const status = normalizarFiltroFinanceiroStatus(item.status);
  const classeStatus = status === "pago" ? "status-pago" : status === "atrasado" ? "status-atrasado" : "status-pendente";
  const turma = aluno.turma ? ` • ${aluno.turma}` : "";
  const vencimento = aluno.vencimento ? formatarData(aluno.vencimento) : "Sem vencimento";
  const valorEsperado = formatarMoeda(item.valorMensalidade || 0);
  const valorPago = formatarMoeda(item.valorPago || 0);
  const datasPagamento = item.datasPagamento && item.datasPagamento.length
    ? item.datasPagamento.map(formatarData).join(", ")
    : "Sem pagamento no mês";

  return `
    <div class="financeiro-linha-mensal ${classeStatus}">
      <div>
        <strong>${aluno.nome || "Aluno sem nome"}</strong>
        <span>${statusFinanceiroTexto(status)}${turma} • Vencimento: ${vencimento}</span>
        <span>${datasPagamento}</span>
      </div>
      <div class="financeiro-linha-dir">
        <strong>${status === "pago" ? valorPago : valorEsperado}</strong>
        <span class="status-badge ${classeStatus}">${statusFinanceiroTexto(status)}</span>
      </div>
    </div>
  `;
}

let carregandoFinanceiroMensal = false;

async function carregarResumoFinanceiroMensal(opcoes = {}) {
  if (!usuarioAtual || !listaFinanceiroMensal) return;
  if (carregandoFinanceiroMensal) return;

  const periodo = obterPeriodoFinanceiroSelecionado();
  const filtroStatus = normalizarFiltroFinanceiroStatus(financeiroStatus ? financeiroStatus.value : "todos");

  if (financeiroMes && !financeiroMes.value) {
    financeiroMes.value = periodo.mes;
  }

  carregandoFinanceiroMensal = true;

  if (!opcoes.silencioso) {
    listaFinanceiroMensal.innerHTML = `<div class="empty-state-mini">Carregando financeiro...</div>`;
  }

  let queryPagamentos = supabaseClient
    .from("pagamentos")
    .select("id,user_id,aluno_id,valor,data_pagamento,created_at");

  queryPagamentos = aplicarFiltroUsuario(queryPagamentos);

  const { data: pagamentos, error } = await queryPagamentos
    .gte("data_pagamento", periodo.inicio)
    .lte("data_pagamento", periodo.fim);

  carregandoFinanceiroMensal = false;

  if (error) {
    console.log("Erro ao carregar financeiro mensal:", error.message);
    listaFinanceiroMensal.innerHTML = `<div class="empty-state-mini">Erro ao carregar o financeiro deste mês.</div>`;
    if (!opcoes.silencioso) mostrarToast("Erro ao carregar financeiro.", "erro");
    return;
  }

  const pagamentosValidos = pagamentos || [];
  const pagamentosPorAluno = new Map();

  pagamentosValidos.forEach(pagamento => {
    const alunoId = String(pagamento.aluno_id);
    const acumulado = pagamentosPorAluno.get(alunoId) || { total: 0, datas: [], quantidade: 0 };
    acumulado.total += valorParaNumero(pagamento.valor);
    acumulado.quantidade += 1;
    if (pagamento.data_pagamento) acumulado.datas.push(String(pagamento.data_pagamento).split("T")[0]);
    pagamentosPorAluno.set(alunoId, acumulado);
  });

  const pagosSet = new Set(pagamentosValidos.map(p => String(p.aluno_id)));

  const resumo = {
    recebido: pagamentosValidos.reduce((total, pagamento) => total + valorParaNumero(pagamento.valor), 0),
    aReceber: 0,
    previsao: 0,
    pagos: 0,
    pendentes: 0,
    atrasados: 0
  };

  let linhas = (alunos || []).map(aluno => {
    const valorMensalidade = valorParaNumero(aluno.valor);
    const status = classificarFinanceiroAlunoMes(aluno, pagosSet, periodo.fim);
    const pagamentoAluno = pagamentosPorAluno.get(String(aluno.id)) || { total: 0, datas: [], quantidade: 0 };

    resumo.previsao += valorMensalidade;
    if (status === "pago") resumo.pagos += 1;
    if (status === "pendente") {
      resumo.pendentes += 1;
      resumo.aReceber += valorMensalidade;
    }
    if (status === "atrasado") {
      resumo.atrasados += 1;
      resumo.aReceber += valorMensalidade;
    }

    return {
      aluno,
      status,
      valorMensalidade,
      valorPago: pagamentoAluno.total,
      datasPagamento: pagamentoAluno.datas.sort(),
      quantidadePagamentos: pagamentoAluno.quantidade
    };
  });

  if (filtroStatus !== "todos") {
    linhas = linhas.filter(item => item.status === filtroStatus);
  }

  linhas.sort((a, b) => {
    const ordem = { atrasado: 1, pendente: 2, pago: 3 };
    return (ordem[a.status] || 9) - (ordem[b.status] || 9) || String(a.aluno.nome || "").localeCompare(String(b.aluno.nome || ""), "pt-BR");
  });

  if (financeiroRecebidoMirror) financeiroRecebidoMirror.textContent = formatarMoeda(resumo.recebido);
  if (financeiroAReceberMirror) financeiroAReceberMirror.textContent = formatarMoeda(resumo.aReceber);
  if (financeiroPrevisaoMirror) financeiroPrevisaoMirror.textContent = formatarMoeda(resumo.previsao);
  if (financeiroPagosMirror) financeiroPagosMirror.textContent = resumo.pagos;
  if (financeiroPendentesMirror) financeiroPendentesMirror.textContent = resumo.pendentes;
  if (financeiroAtrasadosMirror) financeiroAtrasadosMirror.textContent = resumo.atrasados;
  if (financeiroListaContador) financeiroListaContador.textContent = `${linhas.length} aluno${linhas.length === 1 ? "" : "s"}`;

  if (!linhas.length) {
    listaFinanceiroMensal.innerHTML = `<div class="empty-state-mini">Nenhum aluno encontrado para esse mês e status.</div>`;
  } else {
    listaFinanceiroMensal.innerHTML = linhas.map(montarLinhaFinanceiroMensal).join("");
  }
}

function inicializarFinanceiroMensal() {
  if (financeiroMes && !financeiroMes.value) {
    financeiroMes.value = obterMesAtualFinanceiro();
  }

  if (financeiroStatus) {
    financeiroStatus.value = normalizarFiltroFinanceiroStatus(financeiroStatus.value || "todos");
    if (!financeiroStatus.dataset.inicializadoFinanceiro) {
      financeiroStatus.dataset.inicializadoFinanceiro = "true";
      financeiroStatus.addEventListener("change", () => carregarResumoFinanceiroMensal());
    }
  }

  if (financeiroMes && !financeiroMes.dataset.inicializadoFinanceiro) {
    financeiroMes.dataset.inicializadoFinanceiro = "true";
    financeiroMes.addEventListener("change", () => carregarResumoFinanceiroMensal());
    financeiroMes.addEventListener("input", () => carregarResumoFinanceiroMensal({ silencioso: true }));
  }

  if (btnAtualizarFinanceiroMes && !btnAtualizarFinanceiroMes.dataset.inicializadoFinanceiro) {
    btnAtualizarFinanceiroMes.dataset.inicializadoFinanceiro = "true";
    btnAtualizarFinanceiroMes.addEventListener("click", () => carregarResumoFinanceiroMensal());
  }
}

inicializarFinanceiroMensal();

// ===============================
// 17.4 PAGAMENTO — FUNÇÃO REUTILIZÁVEL
// Usada pelo modal "Marcar como pago" e pela solicitação enviada pelo aluno.
// ===============================

async function registrarPagamentoAluno(aluno, opcoes = {}) {
  if (!aluno || !aluno.id) {
    return {
      ok: false,
      mensagem: "Aluno inválido para registrar pagamento."
    };
  }

  const dataPagamento = opcoes.dataPagamento || new Date().toISOString().split("T")[0];

  const dataBase = dataPagamentoParaDateLocal(dataPagamento);
  const primeiroDiaMes = new Date(dataBase.getFullYear(), dataBase.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const ultimoDiaMes = new Date(dataBase.getFullYear(), dataBase.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const { data: pagamentoJaExiste, error: erroVerificarPagamento } = await supabaseClient
    .from("pagamentos")
    .select("id")
    .eq("aluno_id", aluno.id)
    .eq("user_id", aluno.user_id)
    .gte("data_pagamento", primeiroDiaMes)
    .lte("data_pagamento", ultimoDiaMes)
    .limit(1);

  if (erroVerificarPagamento) {
    return {
      ok: false,
      mensagem: "Erro ao verificar pagamento existente."
    };
  }

  if (pagamentoJaExiste && pagamentoJaExiste.length > 0) {
    return {
      ok: true,
      jaExiste: true,
      mensagem: "Esse aluno já tem pagamento registrado neste mês."
    };
  }

  const valorPagamento = valorParaNumero(opcoes.valorPagamento || aluno.valor);
  const calculoPagamento = calcularMensalidadesParaRegistrar(aluno.vencimento);

  const pagamentosParaInserir = calculoPagamento.mensalidades.map(() => ({
    aluno_id: aluno.id,
    user_id: aluno.user_id,
    valor: valorPagamento,
    data_pagamento: dataPagamento
  }));

  const { error: erroPagamento } = await supabaseClient
    .from("pagamentos")
    .insert(pagamentosParaInserir);

  if (erroPagamento) {
    return {
      ok: false,
      mensagem: "Erro ao registrar pagamento."
    };
  }

  const { error: erroAtualizarAluno } = await supabaseClient
    .from("alunos")
    .update({
      vencimento: calculoPagamento.novoVencimento
    })
    .eq("id", aluno.id);

  if (erroAtualizarAluno) {
    return {
      ok: false,
      mensagem: "Pagamento salvo, mas erro ao atualizar vencimento."
    };
  }

  return {
    ok: true,
    jaExiste: false,
    novoVencimento: calculoPagamento.novoVencimento,
    mensagem: "Pagamento registrado com sucesso."
  };
}

function dataPagamentoParaDateLocal(dataString) {
  const partes = String(dataString || "").split("-");
  if (partes.length !== 3) return new Date();

  const data = new Date(
    Number(partes[0]),
    Number(partes[1]) - 1,
    Number(partes[2])
  );

  return Number.isNaN(data.getTime()) ? new Date() : data;
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

  if (alunosPagosMes.has(String(aluno.id))) {
    mostrarToast("Este aluno já tem pagamento registrado neste mês.", "erro");
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

  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const { data: pagamentoJaExiste, error: erroVerificarPagamento } = await supabaseClient
    .from("pagamentos")
    .select("id")
    .eq("aluno_id", aluno.id)
    .eq("user_id", aluno.user_id)
    .gte("data_pagamento", primeiroDiaMes)
    .lte("data_pagamento", ultimoDiaMes)
    .limit(1);

  if (erroVerificarPagamento) {
    btnConfirmarPagamento.disabled = false;
    mostrarToast("Erro ao verificar pagamento existente.", "erro");
    return;
  }

  if (pagamentoJaExiste && pagamentoJaExiste.length > 0) {
    btnConfirmarPagamento.disabled = false;
    mostrarToast("Este aluno já tem pagamento registrado neste mês.", "erro");
    await carregarAlunos();
    return;
  }

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
  if (dataNascimentoAluno) dataNascimentoAluno.value = aluno.data_nascimento || "";
  if (dataInicioAcademia) dataInicioAcademia.value = aluno.data_inicio_academia || "";
  document.getElementById("valorMensalidade").value = formatarMoeda(aluno.valor);
  document.getElementById("dataVencimento").value = aluno.vencimento;
  if (faixaAluno) faixaAluno.value = aluno.faixa || "";
  if (grauAluno) grauAluno.value = aluno.grau || "";
  if (turmaAluno) {
    turmaAluno.setAttribute("data-valor-atual", aluno.turma || "");
    if (typeof preencherSelectsTurmas === "function") preencherSelectsTurmas();
    turmaAluno.value = aluno.turma || "";
  }
  if (statusAluno) statusAluno.value = aluno.status_aluno || "ativo";
  if (dataUltimaGraduacao) dataUltimaGraduacao.value = aluno.data_ultima_graduacao || "";
  if (tempoMinimoAvaliacao) tempoMinimoAvaliacao.value = aluno.tempo_avaliacao_meses || "";
  if (observacoesInternas) observacoesInternas.value = aluno.observacoes_internas || "";
  if (dataExperimental) dataExperimental.value = aluno.data_aula_experimental || "";
  if (responsavelNome) responsavelNome.value = aluno.responsavel_nome || "";
  if (responsavelWhatsApp) responsavelWhatsApp.value = aluno.responsavel_whatsapp || "";

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
  const valorFmt = valorParaNumero(aluno.valor).toLocaleString("pt-BR", {
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
