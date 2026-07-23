// ================================================================
// 55. CENTRAL DE RELATÓRIOS — CSV + PDF PROFISSIONAL
// ================================================================
// Mantém a exportação isolada do restante da UI e não exige biblioteca
// externa. CSV é baixado diretamente; PDF usa a impressão nativa do
// navegador com layout A4 preparado para "Salvar como PDF".

const RELATORIOS_CONFIG = {
  financeiro: {
    titulo: "Financeiro",
    descricao: "Recebimentos, pendências, atrasos e visão mensal por aluno.",
    icone: "💰"
  },
  alunos: {
    titulo: "Alunos",
    descricao: "Base cadastral organizada por status e turma.",
    icone: "👥"
  },
  frequencia: {
    titulo: "Frequência",
    descricao: "Presenças, faltas e percentual de participação no período.",
    icone: "✅"
  }
};

let relatorioTipoAtual = "financeiro";
let relatorioGerando = false;

function relatorioEscapeHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function relatorioSlug(valor) {
  return String(valor || "mensalize")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "mensalize";
}

function relatorioHojeISO() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

function relatorioDataLocal(valor) {
  if (!valor) return null;
  const partes = String(valor).split("T")[0].split("-");
  if (partes.length !== 3) return null;
  const data = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  return Number.isNaN(data.getTime()) ? null : data;
}

function relatorioFormatarData(valor) {
  if (!valor) return "—";
  if (typeof formatarData === "function") return formatarData(String(valor).split("T")[0]);
  const data = relatorioDataLocal(valor);
  return data ? data.toLocaleDateString("pt-BR") : "—";
}

function relatorioFormatarMoeda(valor) {
  if (typeof formatarMoeda === "function") return formatarMoeda(valor);
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function relatorioPeriodoMes(mesTexto) {
  const fallback = new Date();
  const partes = String(mesTexto || "").split("-");
  const ano = Number(partes[0]) || fallback.getFullYear();
  const mesNumero = Number(partes[1]) || (fallback.getMonth() + 1);
  const mes = `${ano}-${String(mesNumero).padStart(2, "0")}`;
  const ultimo = new Date(ano, mesNumero, 0);

  return {
    mes,
    ano,
    mesNumero,
    inicio: `${mes}-01`,
    fim: `${ultimo.getFullYear()}-${String(ultimo.getMonth() + 1).padStart(2, "0")}-${String(ultimo.getDate()).padStart(2, "0")}`,
    titulo: new Date(ano, mesNumero - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  };
}

function relatorioInicioMesesAtras(meses) {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - Math.max(0, Number(meses || 1) - 1), 1);
  return `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, "0")}-${String(inicio.getDate()).padStart(2, "0")}`;
}

function relatorioNomeAcademia() {
  return String(nomeEmpresa || CONFIG?.nomeEmpresa || "Mensalize").trim() || "Mensalize";
}

function relatorioStatusAlunoTexto(status) {
  const valor = String(status || "ativo").toLowerCase();
  if (valor === "inativo") return "Inativo";
  if (valor === "pausado") return "Pausado";
  if (valor === "experimental") return "Experimental";
  return "Ativo";
}

function relatorioNormalizarTexto(valor) {
  return String(valor || "").trim().toLowerCase();
}

function relatorioTelefonesPermitidos() {
  return document.getElementById("relatorioIncluirContatos")?.checked === true;
}

function relatorioDefinirEstadoGerando(gerando, formato = "") {
  relatorioGerando = gerando === true;
  const csv = document.getElementById("btnGerarRelatorioCsv");
  const pdf = document.getElementById("btnGerarRelatorioPdf");

  [csv, pdf].forEach(botao => {
    if (botao) botao.disabled = relatorioGerando;
  });

  if (csv) csv.textContent = relatorioGerando && formato === "csv" ? "Preparando CSV..." : "Baixar CSV";
  if (pdf) pdf.textContent = relatorioGerando && formato === "pdf" ? "Preparando PDF..." : "Gerar PDF";
}

function relatorioPopularTurmas() {
  const nomes = new Set();

  (turmasCadastradas || []).forEach(turma => {
    if (turma?.nome) nomes.add(String(turma.nome).trim());
  });

  (alunos || []).forEach(aluno => {
    if (aluno?.turma) nomes.add(String(aluno.turma).trim());
  });

  const opcoes = [...nomes]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map(nome => `<option value="${relatorioEscapeHtml(nome)}">${relatorioEscapeHtml(nome)}</option>`)
    .join("");

  ["relatorioAlunosTurma", "relatorioFrequenciaTurma"].forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    const valorAtual = select.value || "todas";
    select.innerHTML = `<option value="todas">Todas as turmas</option>${opcoes}`;
    if ([...select.options].some(option => option.value === valorAtual)) select.value = valorAtual;
  });
}

function relatorioSelecionarTipo(tipo) {
  if (!RELATORIOS_CONFIG[tipo]) tipo = "financeiro";
  relatorioTipoAtual = tipo;

  document.querySelectorAll("[data-relatorio-tipo]").forEach(botao => {
    const ativo = botao.dataset.relatorioTipo === tipo;
    botao.classList.toggle("ativo", ativo);
    botao.setAttribute("aria-selected", ativo ? "true" : "false");
  });

  document.querySelectorAll("[data-relatorio-filtros]").forEach(painel => {
    painel.classList.toggle("escondido", painel.dataset.relatorioFiltros !== tipo);
  });

  const config = RELATORIOS_CONFIG[tipo];
  const titulo = document.getElementById("relatorioConfigTitulo");
  const descricao = document.getElementById("relatorioConfigDescricao");
  if (titulo) titulo.textContent = config.titulo;
  if (descricao) descricao.textContent = config.descricao;

  relatorioAtualizarPreview();
}

function relatorioAtualizarPreview() {
  const titulo = document.getElementById("relatorioPreviewTitulo");
  const texto = document.getElementById("relatorioPreviewTexto");
  const contador = document.getElementById("relatorioPreviewContador");

  if (!titulo || !texto || !contador) return;

  if (relatorioTipoAtual === "financeiro") {
    const periodo = relatorioPeriodoMes(document.getElementById("relatorioFinanceiroMes")?.value);
    const status = document.getElementById("relatorioFinanceiroStatus")?.value || "todos";
    const totalEstimado = status === "todos" ? (alunos || []).length : "—";
    titulo.textContent = `Financeiro • ${periodo.titulo}`;
    texto.textContent = status === "todos"
      ? "Visão consolidada com resumo executivo e detalhamento por aluno."
      : `Relatório filtrado por status: ${status === "pago" ? "Pagos" : status === "atrasado" ? "Atrasados" : "Pendentes"}.`;
    contador.textContent = `${totalEstimado} registros`;
    return;
  }

  if (relatorioTipoAtual === "alunos") {
    const status = document.getElementById("relatorioAlunosStatus")?.value || "todos";
    const turma = document.getElementById("relatorioAlunosTurma")?.value || "todas";
    const filtrados = (alunos || []).filter(aluno => {
      const passaStatus = status === "todos" || relatorioNormalizarTexto(aluno.status_aluno || "ativo") === status;
      const passaTurma = turma === "todas" || relatorioNormalizarTexto(aluno.turma) === relatorioNormalizarTexto(turma);
      return passaStatus && passaTurma;
    });
    titulo.textContent = "Base de alunos";
    texto.textContent = turma === "todas" ? "Cadastro consolidado da academia." : `Turma selecionada: ${turma}.`;
    contador.textContent = `${filtrados.length} aluno${filtrados.length === 1 ? "" : "s"}`;
    return;
  }

  const meses = Number(document.getElementById("relatorioFrequenciaPeriodo")?.value || 6);
  const turma = document.getElementById("relatorioFrequenciaTurma")?.value || "todas";
  titulo.textContent = `Frequência • últimos ${meses} meses`;
  texto.textContent = turma === "todas" ? "Consolidação de presenças e faltas de todas as turmas." : `Turma selecionada: ${turma}.`;
  contador.textContent = "Dados reais das chamadas";
}

function abrirCentralRelatorios() {
  const modal = document.getElementById("modalCentralRelatorios");
  if (!modal) return;

  relatorioPopularTurmas();

  const mes = document.getElementById("relatorioFinanceiroMes");
  if (mes) {
    mes.value = financeiroMes?.value || relatorioPeriodoMes("").mes;
  }

  const status = document.getElementById("relatorioFinanceiroStatus");
  if (status) status.value = financeiroStatus?.value || "todos";

  const freqPeriodo = document.getElementById("relatorioFrequenciaPeriodo");
  if (freqPeriodo) {
    const valor = String(frequenciaPeriodoMeses || 6);
    freqPeriodo.value = [...freqPeriodo.options].some(opt => opt.value === valor) ? valor : "6";
  }

  relatorioSelecionarTipo("financeiro");
  modal.classList.remove("escondido");
  document.body.classList.add("relatorios-aberto");

  setTimeout(() => {
    modal.querySelector("[data-relatorio-tipo].ativo")?.focus({ preventScroll: true });
  }, 40);
}

function fecharCentralRelatorios() {
  const modal = document.getElementById("modalCentralRelatorios");
  if (!modal || relatorioGerando) return;
  modal.classList.add("escondido");
  document.body.classList.remove("relatorios-aberto");
}

async function relatorioBuscarPagamentos(periodo, porCompetencia = false) {
  const campoPeriodo = porCompetencia ? "vencimento_referencia" : "data_pagamento";
  let query = supabaseClient
    .from("pagamentos")
    .select("id,user_id,aluno_id,valor,data_pagamento,vencimento_referencia,created_at")
    .gte(campoPeriodo, periodo.inicio)
    .lte(campoPeriodo, periodo.fim);

  if (usuarioAtual?.id) query = query.eq("user_id", usuarioAtual.id);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function relatorioDadosFinanceiro() {
  const periodo = relatorioPeriodoMes(document.getElementById("relatorioFinanceiroMes")?.value);
  const filtroStatus = document.getElementById("relatorioFinanceiroStatus")?.value || "todos";
  const [pagamentosCaixa, pagamentos] = await Promise.all([
    relatorioBuscarPagamentos(periodo, false),
    relatorioBuscarPagamentos(periodo, true)
  ]);
  const pagamentosPorAluno = new Map();

  pagamentos.forEach(pagamento => {
    const chave = String(pagamento.aluno_id);
    const atual = pagamentosPorAluno.get(chave) || { total: 0, datas: [], quantidade: 0 };
    atual.total += Number(typeof valorParaNumero === "function" ? valorParaNumero(pagamento.valor) : pagamento.valor || 0);
    atual.quantidade += 1;
    if (pagamento.data_pagamento) atual.datas.push(String(pagamento.data_pagamento).split("T")[0]);
    pagamentosPorAluno.set(chave, atual);
  });

  const pagos = new Set(pagamentos.map(item => String(item.aluno_id)));
  const resumo = { recebido: 0, aReceber: 0, previsao: 0, pagos: 0, pendentes: 0, atrasados: 0 };

  let linhas = (alunos || []).map(aluno => {
    const mensalidade = Number(typeof valorParaNumero === "function" ? valorParaNumero(aluno.valor) : aluno.valor || 0);
    let status = pagos.has(String(aluno.id)) ? "pago" : "pendente";

    if (typeof classificarFinanceiroAlunoMes === "function") {
      status = classificarFinanceiroAlunoMes(aluno, pagos, periodo.fim);
    } else if (!pagos.has(String(aluno.id)) && typeof verificarStatus === "function") {
      status = verificarStatus(aluno.vencimento) === "atrasado" ? "atrasado" : "pendente";
    }

    const pagamento = pagamentosPorAluno.get(String(aluno.id)) || { total: 0, datas: [], quantidade: 0 };

    resumo.previsao += mensalidade;
    if (status === "pago") resumo.pagos += 1;
    if (status === "pendente") { resumo.pendentes += 1; resumo.aReceber += mensalidade; }
    if (status === "atrasado") { resumo.atrasados += 1; resumo.aReceber += mensalidade; }

    return { aluno, mensalidade, status, pagamento };
  });

  resumo.recebido = pagamentosCaixa.reduce((total, item) => total + Number(typeof valorParaNumero === "function" ? valorParaNumero(item.valor) : item.valor || 0), 0);

  if (filtroStatus !== "todos") linhas = linhas.filter(item => item.status === filtroStatus);

  linhas.sort((a, b) => {
    const ordem = { atrasado: 1, pendente: 2, pago: 3 };
    return (ordem[a.status] || 9) - (ordem[b.status] || 9) || String(a.aluno.nome || "").localeCompare(String(b.aluno.nome || ""), "pt-BR");
  });

  const incluirContatos = relatorioTelefonesPermitidos();
  const colunas = [
    { chave: "aluno", titulo: "Aluno" },
    ...(incluirContatos ? [{ chave: "whatsapp", titulo: "WhatsApp" }] : []),
    { chave: "turma", titulo: "Turma" },
    { chave: "mensalidade", titulo: "Mensalidade" },
    { chave: "vencimento", titulo: "Vencimento" },
    { chave: "status", titulo: "Status" },
    { chave: "pago", titulo: "Pago no mês" },
    { chave: "datas", titulo: "Data(s) pagamento" }
  ];

  const statusTexto = valor => valor === "pago" ? "Pago" : valor === "atrasado" ? "Atrasado" : "Pendente";

  return {
    tipo: "financeiro",
    titulo: "Relatório Financeiro",
    subtitulo: `${periodo.titulo} • ${filtroStatus === "todos" ? "Todos os status" : statusTexto(filtroStatus)}`,
    arquivo: `mensalize-financeiro-${periodo.mes}-${filtroStatus}`,
    orientacao: "landscape",
    resumos: [
      { rotulo: "Recebido", valor: relatorioFormatarMoeda(resumo.recebido) },
      { rotulo: "A receber", valor: relatorioFormatarMoeda(resumo.aReceber) },
      { rotulo: "Previsão", valor: relatorioFormatarMoeda(resumo.previsao) },
      { rotulo: "Pagos", valor: resumo.pagos },
      { rotulo: "Pendentes", valor: resumo.pendentes },
      { rotulo: "Atrasados", valor: resumo.atrasados }
    ],
    colunas,
    linhas: linhas.map(item => ({
      aluno: item.aluno.nome || "—",
      whatsapp: item.aluno.telefone || item.aluno.responsavel_whatsapp || "—",
      turma: item.aluno.turma || "Sem turma",
      mensalidade: relatorioFormatarMoeda(item.mensalidade),
      vencimento: relatorioFormatarData(item.aluno.vencimento),
      status: statusTexto(item.status),
      pago: relatorioFormatarMoeda(item.pagamento.total),
      datas: item.pagamento.datas.length ? item.pagamento.datas.sort().map(relatorioFormatarData).join(", ") : "—"
    }))
  };
}

async function relatorioDadosAlunos() {
  const filtroStatus = document.getElementById("relatorioAlunosStatus")?.value || "todos";
  const filtroTurma = document.getElementById("relatorioAlunosTurma")?.value || "todas";
  const incluirContatos = relatorioTelefonesPermitidos();

  let lista = [...(alunos || [])].filter(aluno => {
    const status = relatorioNormalizarTexto(aluno.status_aluno || "ativo");
    const turma = relatorioNormalizarTexto(aluno.turma);
    return (filtroStatus === "todos" || status === filtroStatus)
      && (filtroTurma === "todas" || turma === relatorioNormalizarTexto(filtroTurma));
  });

  lista.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));

  const ativos = lista.filter(a => relatorioNormalizarTexto(a.status_aluno || "ativo") === "ativo").length;
  const pausados = lista.filter(a => relatorioNormalizarTexto(a.status_aluno) === "pausado").length;
  const inativos = lista.filter(a => relatorioNormalizarTexto(a.status_aluno) === "inativo").length;
  const semTurma = lista.filter(a => !String(a.turma || "").trim()).length;

  const colunas = [
    { chave: "aluno", titulo: "Aluno" },
    ...(incluirContatos ? [
      { chave: "whatsapp", titulo: "WhatsApp" },
      { chave: "responsavel", titulo: "Responsável" }
    ] : []),
    { chave: "turma", titulo: "Turma" },
    { chave: "status", titulo: "Status" },
    { chave: "mensalidade", titulo: "Mensalidade" },
    { chave: "vencimento", titulo: "Vencimento" },
    { chave: "graduacao", titulo: "Graduação" },
    { chave: "entrada", titulo: "Entrada" }
  ];

  return {
    tipo: "alunos",
    titulo: "Relatório de Alunos",
    subtitulo: `${filtroStatus === "todos" ? "Todos os status" : relatorioStatusAlunoTexto(filtroStatus)} • ${filtroTurma === "todas" ? "Todas as turmas" : filtroTurma}`,
    arquivo: `mensalize-alunos-${filtroStatus}-${relatorioSlug(filtroTurma)}-${relatorioHojeISO()}`,
    orientacao: "landscape",
    resumos: [
      { rotulo: "Total", valor: lista.length },
      { rotulo: "Ativos", valor: ativos },
      { rotulo: "Pausados", valor: pausados },
      { rotulo: "Inativos", valor: inativos },
      { rotulo: "Sem turma", valor: semTurma }
    ],
    colunas,
    linhas: lista.map(aluno => ({
      aluno: aluno.nome || "—",
      whatsapp: aluno.telefone || aluno.responsavel_whatsapp || "—",
      responsavel: aluno.responsavel_nome || "—",
      turma: aluno.turma || "Sem turma",
      status: relatorioStatusAlunoTexto(aluno.status_aluno),
      mensalidade: relatorioFormatarMoeda(Number(typeof valorParaNumero === "function" ? valorParaNumero(aluno.valor) : aluno.valor || 0)),
      vencimento: relatorioFormatarData(aluno.vencimento),
      graduacao: [aluno.faixa || "", aluno.grau !== null && aluno.grau !== undefined && aluno.grau !== "" ? `${aluno.grau}º grau` : ""].filter(Boolean).join(" • ") || "—",
      entrada: relatorioFormatarData(aluno.data_inicio_academia || aluno.created_at)
    }))
  };
}

async function relatorioBuscarPresencas(inicio, fim) {
  let query = supabaseClient
    .from("presencas")
    .select("id,user_id,aluno_id,turma,turma_id,data_aula,presente")
    .gte("data_aula", inicio)
    .lte("data_aula", fim);

  if (usuarioAtual?.id) query = query.eq("user_id", usuarioAtual.id);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function relatorioDadosFrequencia() {
  const meses = Number(document.getElementById("relatorioFrequenciaPeriodo")?.value || 6);
  const filtroTurma = document.getElementById("relatorioFrequenciaTurma")?.value || "todas";
  const inicio = relatorioInicioMesesAtras(meses);
  const fim = relatorioHojeISO();
  const registros = await relatorioBuscarPresencas(inicio, fim);
  const turmaNorm = relatorioNormalizarTexto(filtroTurma);

  const registrosFiltrados = registros.filter(registro => {
    if (filtroTurma === "todas") return true;
    return relatorioNormalizarTexto(registro.turma) === turmaNorm;
  });

  let listaAlunos = (alunos || []).filter(aluno => {
    if (filtroTurma === "todas") return true;
    return relatorioNormalizarTexto(aluno.turma) === turmaNorm;
  });

  listaAlunos.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));

  const porAluno = new Map();
  registrosFiltrados.forEach(registro => {
    const id = String(registro.aluno_id);
    if (!porAluno.has(id)) porAluno.set(id, new Map());
    const porData = porAluno.get(id);
    const data = String(registro.data_aula || "").split("T")[0];
    if (!data) return;
    const anterior = porData.get(data);
    porData.set(data, anterior === true || registro.presente === true);
  });

  const minimo = Number(presencaMinimaPercentual || 70);
  const linhasCalculadas = listaAlunos.map(aluno => {
    const datas = porAluno.get(String(aluno.id)) || new Map();
    const total = datas.size;
    const presentes = [...datas.values()].filter(Boolean).length;
    const faltas = Math.max(0, total - presentes);
    const percentual = total > 0 ? Math.round((presentes / total) * 100) : null;
    return { aluno, total, presentes, faltas, percentual };
  });

  const comDados = linhasCalculadas.filter(item => item.percentual !== null);
  const media = comDados.length
    ? Math.round(comDados.reduce((soma, item) => soma + item.percentual, 0) / comDados.length)
    : 0;
  const abaixoMinimo = comDados.filter(item => item.percentual < minimo).length;
  const chamadas = new Set(registrosFiltrados.map(r => `${String(r.data_aula).split("T")[0]}|${relatorioNormalizarTexto(r.turma)}`)).size;

  return {
    tipo: "frequencia",
    titulo: "Relatório de Frequência",
    subtitulo: `${relatorioFormatarData(inicio)} a ${relatorioFormatarData(fim)} • ${filtroTurma === "todas" ? "Todas as turmas" : filtroTurma}`,
    arquivo: `mensalize-frequencia-${meses}m-${relatorioSlug(filtroTurma)}-${relatorioHojeISO()}`,
    orientacao: "landscape",
    resumos: [
      { rotulo: "Alunos", valor: listaAlunos.length },
      { rotulo: "Chamadas", valor: chamadas },
      { rotulo: "Média de presença", valor: `${media}%` },
      { rotulo: `Abaixo de ${minimo}%`, valor: abaixoMinimo },
      { rotulo: "Sem registros", valor: linhasCalculadas.filter(i => i.percentual === null).length }
    ],
    colunas: [
      { chave: "aluno", titulo: "Aluno" },
      { chave: "turma", titulo: "Turma" },
      { chave: "presentes", titulo: "Presenças" },
      { chave: "faltas", titulo: "Faltas" },
      { chave: "total", titulo: "Aulas registradas" },
      { chave: "percentual", titulo: "Frequência" },
      { chave: "situacao", titulo: "Situação" }
    ],
    linhas: linhasCalculadas.map(item => ({
      aluno: item.aluno.nome || "—",
      turma: item.aluno.turma || "Sem turma",
      presentes: item.presentes,
      faltas: item.faltas,
      total: item.total,
      percentual: item.percentual === null ? "Sem dados" : `${item.percentual}%`,
      situacao: item.percentual === null ? "Sem registros" : item.percentual >= minimo ? "Dentro do mínimo" : "Abaixo do mínimo"
    }))
  };
}

async function relatorioColetarDados() {
  if (relatorioTipoAtual === "alunos") return relatorioDadosAlunos();
  if (relatorioTipoAtual === "frequencia") return relatorioDadosFrequencia();
  return relatorioDadosFinanceiro();
}

function relatorioCsvSeguro(valor) {
  let texto = String(valor ?? "");
  // Evita CSV Formula Injection ao abrir o arquivo no Excel/Sheets.
  if (/^[=+\-@]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replaceAll('"', '""')}"`;
}

function relatorioMontarCsv(dados) {
  const linhas = [];
  const emitido = new Date().toLocaleString("pt-BR");

  linhas.push([dados.titulo]);
  linhas.push([relatorioNomeAcademia()]);
  linhas.push([dados.subtitulo]);
  linhas.push([`Emitido em ${emitido}`]);
  linhas.push([]);
  linhas.push(dados.resumos.map(item => item.rotulo));
  linhas.push(dados.resumos.map(item => item.valor));
  linhas.push([]);
  linhas.push(dados.colunas.map(coluna => coluna.titulo));

  dados.linhas.forEach(item => {
    linhas.push(dados.colunas.map(coluna => item[coluna.chave] ?? ""));
  });

  return linhas.map(linha => linha.map(relatorioCsvSeguro).join(";")).join("\r\n");
}

function relatorioBaixarArquivo(conteudo, tipoMime, nomeArquivo) {
  const blob = new Blob([conteudo], { type: tipoMime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function relatorioMontarHtmlImpressao(dados) {
  const emitido = new Date().toLocaleString("pt-BR");
  const resumo = dados.resumos.map(item => `
    <div class="metric">
      <span>${relatorioEscapeHtml(item.rotulo)}</span>
      <strong>${relatorioEscapeHtml(item.valor)}</strong>
    </div>`).join("");

  const cabecalho = dados.colunas.map(coluna => `<th>${relatorioEscapeHtml(coluna.titulo)}</th>`).join("");
  const corpo = dados.linhas.length
    ? dados.linhas.map(item => `<tr>${dados.colunas.map(coluna => `<td>${relatorioEscapeHtml(item[coluna.chave] ?? "")}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${dados.colunas.length}" class="empty">Nenhum registro encontrado para os filtros selecionados.</td></tr>`;

  return `<!doctype html>
  <html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${relatorioEscapeHtml(dados.titulo)} — ${relatorioEscapeHtml(relatorioNomeAcademia())}</title>
    <style>
      @page { size: A4 ${dados.orientacao || "landscape"}; margin: 12mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #172033; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 10px; }
      .report { width: 100%; }
      .brand { display:flex; justify-content:space-between; gap:20px; align-items:flex-start; padding:0 0 14px; border-bottom:3px solid #7c3aed; }
      .eyebrow { color:#7c3aed; text-transform:uppercase; letter-spacing:.12em; font-size:8px; font-weight:700; }
      h1 { margin:5px 0 4px; font-size:22px; line-height:1.1; color:#111827; }
      .sub { margin:0; color:#667085; font-size:10px; }
      .brand-right { text-align:right; color:#667085; line-height:1.5; }
      .brand-right strong { display:block; color:#111827; font-size:13px; }
      .metrics { display:grid; grid-template-columns:repeat(${Math.min(Math.max(dados.resumos.length, 3), 6)}, minmax(0,1fr)); gap:7px; margin:14px 0; }
      .metric { border:1px solid #e4e7ec; border-radius:8px; padding:9px; min-width:0; background:#f9fafb; }
      .metric span { display:block; color:#667085; font-size:8px; text-transform:uppercase; letter-spacing:.06em; margin-bottom:4px; }
      .metric strong { display:block; color:#101828; font-size:14px; overflow-wrap:anywhere; }
      table { width:100%; border-collapse:collapse; table-layout:auto; }
      thead { display:table-header-group; }
      tr { break-inside:avoid; page-break-inside:avoid; }
      th { background:#24134f; color:#fff; text-align:left; font-size:8px; text-transform:uppercase; letter-spacing:.04em; padding:7px 6px; border:1px solid #24134f; }
      td { border:1px solid #e4e7ec; padding:6px; vertical-align:top; color:#344054; overflow-wrap:anywhere; }
      tbody tr:nth-child(even) td { background:#f9fafb; }
      .empty { text-align:center; padding:20px; color:#667085; }
      .footer { margin-top:12px; padding-top:8px; border-top:1px solid #e4e7ec; display:flex; justify-content:space-between; color:#98a2b3; font-size:8px; }
      .privacy { margin:9px 0 0; color:#98a2b3; font-size:8px; }
      @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
    </style>
  </head>
  <body>
    <main class="report">
      <header class="brand">
        <div>
          <span class="eyebrow">Mensalize • Relatório profissional</span>
          <h1>${relatorioEscapeHtml(dados.titulo)}</h1>
          <p class="sub">${relatorioEscapeHtml(dados.subtitulo)}</p>
        </div>
        <div class="brand-right">
          <strong>${relatorioEscapeHtml(relatorioNomeAcademia())}</strong>
          Emitido em ${relatorioEscapeHtml(emitido)}
        </div>
      </header>
      <section class="metrics">${resumo}</section>
      <table>
        <thead><tr>${cabecalho}</tr></thead>
        <tbody>${corpo}</tbody>
      </table>
      <p class="privacy">Documento gerado para uso administrativo. Compartilhe somente com pessoas autorizadas.</p>
      <footer class="footer"><span>Gerado pelo Mensalize</span><span>${relatorioEscapeHtml(dados.subtitulo)}</span></footer>
    </main>
  </body>
  </html>`;
}

async function gerarRelatorioCsv() {
  if (relatorioGerando) return;
  relatorioDefinirEstadoGerando(true, "csv");

  try {
    const dados = await relatorioColetarDados();
    const csv = "\ufeff" + relatorioMontarCsv(dados);
    relatorioBaixarArquivo(csv, "text/csv;charset=utf-8", `${relatorioSlug(dados.arquivo)}.csv`);
    mostrarToast?.("CSV gerado com sucesso.");
  } catch (erro) {
    console.error("[Mensalize Relatórios] Erro CSV:", erro);
    mostrarToast?.("Não foi possível gerar o CSV.", "erro");
  } finally {
    relatorioDefinirEstadoGerando(false);
  }
}

async function gerarRelatorioPdf() {
  if (relatorioGerando) return;

  // Abre antes do await para reduzir bloqueio de popup no navegador.
  const janela = window.open("", "_blank");
  if (!janela) {
    mostrarToast?.("Permita pop-ups para gerar o PDF.", "erro");
    return;
  }

  janela.document.write("<!doctype html><title>Preparando relatório...</title><p style='font-family:Arial;padding:24px'>Preparando relatório profissional...</p>");
  relatorioDefinirEstadoGerando(true, "pdf");

  try {
    const dados = await relatorioColetarDados();
    const html = relatorioMontarHtmlImpressao(dados);
    janela.document.open();
    janela.document.write(html);
    janela.document.close();

    const disparar = () => {
      janela.focus();
      setTimeout(() => janela.print(), 180);
    };

    if (janela.document.readyState === "complete") disparar();
    else janela.addEventListener("load", disparar, { once: true });

    mostrarToast?.("Relatório pronto. Escolha “Salvar como PDF” na impressão.");
  } catch (erro) {
    console.error("[Mensalize Relatórios] Erro PDF:", erro);
    janela.close();
    mostrarToast?.("Não foi possível preparar o PDF.", "erro");
  } finally {
    relatorioDefinirEstadoGerando(false);
  }
}

function inicializarCentralRelatorios() {
  const modal = document.getElementById("modalCentralRelatorios");
  if (!modal || modal.dataset.inicializado === "true") return;
  modal.dataset.inicializado = "true";

  if (btnExportar) {
    btnExportar.textContent = "📊 Relatórios";
    btnExportar.setAttribute("aria-haspopup", "dialog");
    btnExportar.addEventListener("click", abrirCentralRelatorios);
  }

  document.querySelectorAll("[data-relatorio-tipo]").forEach(botao => {
    botao.addEventListener("click", () => relatorioSelecionarTipo(botao.dataset.relatorioTipo));
  });

  [
    "relatorioFinanceiroMes",
    "relatorioFinanceiroStatus",
    "relatorioAlunosStatus",
    "relatorioAlunosTurma",
    "relatorioFrequenciaPeriodo",
    "relatorioFrequenciaTurma",
    "relatorioIncluirContatos"
  ].forEach(id => {
    document.getElementById(id)?.addEventListener("change", relatorioAtualizarPreview);
  });

  document.getElementById("btnFecharCentralRelatorios")?.addEventListener("click", fecharCentralRelatorios);
  document.getElementById("btnCancelarCentralRelatorios")?.addEventListener("click", fecharCentralRelatorios);
  document.getElementById("btnGerarRelatorioCsv")?.addEventListener("click", gerarRelatorioCsv);
  document.getElementById("btnGerarRelatorioPdf")?.addEventListener("click", gerarRelatorioPdf);

  modal.addEventListener("click", event => {
    if (event.target === modal) fecharCentralRelatorios();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !modal.classList.contains("escondido")) fecharCentralRelatorios();
  });

  relatorioPopularTurmas();
  relatorioSelecionarTipo("financeiro");
}

window.inicializarCentralRelatorios = inicializarCentralRelatorios;
window.abrirCentralRelatorios = abrirCentralRelatorios;

inicializarCentralRelatorios();
