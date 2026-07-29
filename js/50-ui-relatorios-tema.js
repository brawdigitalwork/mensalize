// 24. MODAL — CADASTRO / EDIÇÃO DE ALUNO
// ===============================

if (btnMostrarForm && modalAluno) {
  btnMostrarForm.onclick = function() {
    alunoEditandoId = null;

    formAluno.reset();

    tituloFormulario.textContent = "Cadastrar aluno";
    btnFormulario.textContent = "Cadastrar aluno";
    btnCancelarEdicao.classList.add("escondido");

    modalAluno.classList.remove("escondido");
  };
}

if (btnFecharModalAluno && modalAluno) {
  btnFecharModalAluno.onclick = function() {
    modalAluno.classList.add("escondido");
  };
}
// ===============================
// 25. NOTIFICAÇÃO DE VENCIMENTOS
// ===============================

/** Mostra alerta quando houver alunos atrasados ou vencendo hoje. */
function mostrarBannerVencimentos() {
  const hoje = new Date();
  const dataHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  let atrasados = 0;
  let venceHoje = 0;

  alunos.forEach(aluno => {
    if (alunosPagosMes.has(String(aluno.id))) return;
    const p = aluno.vencimento.split("-");
    const dv = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    const diff = Math.ceil((dv - dataHoje) / (1000 * 60 * 60 * 24));
    if (diff < 0) atrasados++;
    else if (diff === 0) venceHoje++;
  });

  if (atrasados === 0 && venceHoje === 0) {
    bannerVencimentos.classList.add("escondido");
    return;
  }

  let partes = [];
  if (atrasados > 0) partes.push(`⚠ ${atrasados} aluno${atrasados > 1 ? "s" : ""} atrasado${atrasados > 1 ? "s" : ""}`);
  if (venceHoje > 0) partes.push(`📅 ${venceHoje} vence${venceHoje > 1 ? "m" : ""} hoje`);

  textoBanner.textContent = partes.join("  ·  ");
  bannerVencimentos.classList.remove("escondido");

  btnBannerAtrasados.style.display = atrasados > 0 ? "inline-flex" : "none";
  btnBannerHoje.style.display = venceHoje > 0 ? "inline-flex" : "none";
}

btnFecharBanner.addEventListener("click", () => bannerVencimentos.classList.add("escondido"));
btnBannerAtrasados.addEventListener("click", () => {
  setFiltro("atrasado");
  abrirViewPrincipal("alunos");
  bannerVencimentos.classList.add("escondido");
});

btnBannerHoje.addEventListener("click", () => {
  setFiltro("hoje");
  abrirViewPrincipal("alunos");
  bannerVencimentos.classList.add("escondido");
});

// ===============================
// 26. COBRANÇA EM MASSA — ALUNOS ATRASADOS
// ===============================

btnCobrarAtrasados.addEventListener("click", function() {
  const hoje = new Date();
  const dataHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  const atrasados = alunos.filter(aluno => {
    if (alunosPagosMes.has(String(aluno.id))) return false;
    const p = aluno.vencimento.split("-");
    const dv = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return Math.ceil((dv - dataHoje) / (1000 * 60 * 60 * 24)) < 0;
  });

  if (atrasados.length === 0) {
    mostrarToast("Nenhum aluno atrasado no momento! 🎉");
    return;
  }

  listaCobrar.innerHTML = "";

  atrasados.forEach(aluno => {
    const dias = Math.abs(calcularDias(aluno.vencimento));
    const valor = valorParaNumero(aluno.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const msg = encodeURIComponent(`Olá ${aluno.nome}, sua mensalidade de ${valor} está atrasada há ${dias} dia${dias > 1 ? "s" : ""}. Por favor, entre em contato para regularizar. Obrigado!`);
    const telefone = aluno.telefone.replace(/\D/g, "");
    const telefoneValido = telefone.length >= 10;
    const link = telefoneValido ? `https://wa.me/55${telefone}?text=${msg}` : "#";
    const nomeAlunoSeguro = escaparHTMLRelatorio(aluno.nome || "Aluno");

    const div = document.createElement("div");
    div.classList.add("cobrar-item");
    div.innerHTML = `
      <div class="cobrar-info">
        <span class="cobrar-nome">${nomeAlunoSeguro}</span>
        <span class="cobrar-detalhe">${valor} · ${dias}d atrasado</span>
      </div>
      <a href="${link}" target="_blank" class="btn-cobrar-item" onclick="${telefoneValido ? "" : "event.preventDefault(); mostrarToast('Telefone inválido. Cadastre com DDD.', 'erro');"}">💬 Cobrar</a>
    `;
    listaCobrar.appendChild(div);
  });

  modalCobrar.classList.remove("escondido");
});

btnFecharModalCobrar.addEventListener("click", () => modalCobrar.classList.add("escondido"));
modalCobrar.addEventListener("click", e => { if (e.target === modalCobrar) modalCobrar.classList.add("escondido"); });

// ===============================
// 27. UTILITÁRIOS — MÁSCARA MONETÁRIA
// ===============================

const inputValor = document.getElementById("valorMensalidade");

/** Permite digitar valores quebrados como 19,99 ou 19.99 sem transformar em 1.999,00. */
function limparCampoMoedaDuranteDigitacao(input) {
  if (!input) return;

  let valor = String(input.value || "").replace(/[^\d,.]/g, "");

  // Mantém somente um separador decimal enquanto digita.
  const ultimoSeparador = Math.max(valor.lastIndexOf(","), valor.lastIndexOf("."));
  if (ultimoSeparador !== -1) {
    const antes = valor.slice(0, ultimoSeparador).replace(/[,.]/g, "");
    const separador = valor[ultimoSeparador];
    const depois = valor.slice(ultimoSeparador + 1).replace(/[,.]/g, "").slice(0, 2);
    valor = `${antes}${separador}${depois}`;
  }

  input.value = valor;
}

/** Formata campo de valor ao sair do input. */
function formatarCampoMoeda(input) {
  if (!input) return;

  const numero = valorParaNumero(input.value);

  if (!numero) {
    input.value = "";
    return;
  }

  input.value = formatarMoeda(numero);
}

if (inputValor) {
  inputValor.setAttribute("inputmode", "decimal");
  inputValor.setAttribute("autocomplete", "off");

  inputValor.addEventListener("input", function() {
    limparCampoMoedaDuranteDigitacao(this);
  });

  inputValor.addEventListener("blur", function() {
    formatarCampoMoeda(this);
  });
}


// ===============================
// 28. RELATÓRIO — EXPORTAR PLANILHA FINANCEIRA
// ===============================

/** Evita quebrar o HTML da planilha ao inserir textos vindos do banco. */
function escaparHTMLRelatorio(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Nome legível do mês selecionado no financeiro. */
function obterTituloMesRelatorio(periodo) {
  const data = new Date(Number(periodo.ano), Number(periodo.mesNumero) - 1, 1);
  return data.toLocaleString("pt-BR", { month: "long", year: "numeric" });
}

/** Converte número para texto simples sem o R$, útil para a planilha. */
function numeroPlanilha(valor) {
  return Number(valorParaNumero(valor) || 0).toFixed(2);
}

/** Busca pagamentos do período selecionado e monta os dados consolidados. */
async function obterDadosRelatorioFinanceiroSelecionado() {
  const fallbackPeriodo = (() => {
    const hoje = new Date();
    const mes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    const inicio = `${mes}-01`;
    const fimData = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    const fim = `${fimData.getFullYear()}-${String(fimData.getMonth() + 1).padStart(2, "0")}-${String(fimData.getDate()).padStart(2, "0")}`;
    return { mes, inicio, fim, ano: hoje.getFullYear(), mesNumero: hoje.getMonth() + 1 };
  })();

  const periodo = typeof obterPeriodoFinanceiroSelecionado === "function"
    ? obterPeriodoFinanceiroSelecionado()
    : fallbackPeriodo;

  const filtroStatus = financeiroStatus ? financeiroStatus.value : "todos";

  let queryPagamentosCaixa = supabaseClient
    .from("pagamentos")
    .select("id,user_id,aluno_id,valor,data_pagamento,vencimento_referencia,created_at");

  let queryPagamentosCompetencia = supabaseClient
    .from("pagamentos")
    .select("id,user_id,aluno_id,valor,data_pagamento,vencimento_referencia,created_at");

  queryPagamentosCaixa = aplicarFiltroUsuario(queryPagamentosCaixa);
  queryPagamentosCompetencia = aplicarFiltroUsuario(queryPagamentosCompetencia);

  const [respostaCaixa, respostaCompetencia] = await Promise.all([
    queryPagamentosCaixa
      .gte("data_pagamento", periodo.inicio)
      .lte("data_pagamento", periodo.fim),
    queryPagamentosCompetencia
      .gte("vencimento_referencia", periodo.inicio)
      .lte("vencimento_referencia", periodo.fim)
  ]);

  if (respostaCaixa.error || respostaCompetencia.error) {
    throw respostaCaixa.error || respostaCompetencia.error;
  }

  const pagamentosRecebidosNoMes = respostaCaixa.data || [];
  const pagamentosValidos = respostaCompetencia.data || [];
  const pagamentosPorAluno = new Map();

  pagamentosValidos.forEach(pagamento => {
    const alunoId = String(pagamento.aluno_id);
    const acumulado = pagamentosPorAluno.get(alunoId) || {
      total: 0,
      datas: [],
      quantidade: 0
    };

    acumulado.total += valorParaNumero(pagamento.valor);
    acumulado.quantidade += 1;
    if (pagamento.data_pagamento) {
      acumulado.datas.push(String(pagamento.data_pagamento).split("T")[0]);
    }

    pagamentosPorAluno.set(alunoId, acumulado);
  });

  const pagosSet = new Set(pagamentosValidos.map(p => String(p.aluno_id)));

  let resumo = {
    totalAlunos: (alunos || []).length,
    alunosNoRelatorio: 0,
    pagos: 0,
    pendentes: 0,
    atrasados: 0,
    recebido: 0,
    aReceber: 0,
    previsao: 0
  };

  let linhas = (alunos || []).map(aluno => {
    const valorMensalidade = valorParaNumero(aluno.valor);
    const status = typeof classificarFinanceiroAlunoMes === "function"
      ? classificarFinanceiroAlunoMes(aluno, pagosSet, periodo.fim)
      : (pagosSet.has(String(aluno.id)) ? "pago" : verificarStatus(aluno.vencimento));

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
      valorMensalidade,
      valorPago: pagamentoAluno.total,
      status,
      datasPagamento: pagamentoAluno.datas.sort(),
      quantidadePagamentos: pagamentoAluno.quantidade
    };
  });

  resumo.recebido = pagamentosRecebidosNoMes.reduce((total, pagamento) => total + valorParaNumero(pagamento.valor), 0);

  if (filtroStatus !== "todos") {
    linhas = linhas.filter(item => item.status === filtroStatus);
  }

  linhas.sort((a, b) => {
    const ordem = { atrasado: 1, pendente: 2, pago: 3 };
    return (ordem[a.status] || 9) - (ordem[b.status] || 9) || String(a.aluno.nome).localeCompare(String(b.aluno.nome), "pt-BR");
  });

  resumo.alunosNoRelatorio = linhas.length;

  return {
    periodo,
    filtroStatus,
    resumo,
    linhas
  };
}

function montarRelatorioFinanceiroPlanilhaHTML(dados) {
  const tituloMes = obterTituloMesRelatorio(dados.periodo);
  const statusFiltroTexto = dados.filtroStatus === "todos"
    ? "Todos"
    : statusFinanceiroTexto(dados.filtroStatus);
  const dataEmissao = new Date().toLocaleString("pt-BR");

  const linhasTabela = dados.linhas.map((item, index) => {
    const aluno = item.aluno;
    const statusTexto = typeof statusFinanceiroTexto === "function"
      ? statusFinanceiroTexto(item.status)
      : item.status;
    const classeStatus = `status-${item.status}`;
    const telefone = aluno.telefone || aluno.responsavel_whatsapp || "";
    const faixaGrau = [aluno.faixa || "", aluno.grau !== null && aluno.grau !== undefined && aluno.grau !== "" ? `${aluno.grau}º grau` : ""]
      .filter(Boolean)
      .join(" - ");

    return `
      <tr>
        <td class="center">${index + 1}</td>
        <td class="strong">${escaparHTMLRelatorio(aluno.nome || "")}</td>
        <td>${escaparHTMLRelatorio(telefone || "Sem WhatsApp")}</td>
        <td>${escaparHTMLRelatorio(aluno.responsavel_nome || "")}</td>
        <td>${escaparHTMLRelatorio(aluno.turma || "Sem turma")}</td>
        <td>${escaparHTMLRelatorio(faixaGrau || "Não informado")}</td>
        <td class="money">${formatarMoeda(item.valorMensalidade)}</td>
        <td>${aluno.vencimento ? formatarData(aluno.vencimento) : ""}</td>
        <td class="${classeStatus}">${statusTexto}</td>
        <td class="money">${formatarMoeda(item.valorPago)}</td>
        <td>${item.datasPagamento.length ? item.datasPagamento.map(formatarData).join(", ") : ""}</td>
        <td class="center">${item.quantidadePagamentos}</td>
      </tr>`;
  }).join("");

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Financeiro</x:Name>
              <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: Arial, sans-serif; color: #111827; background: #ffffff; }
        .titulo { font-size: 24px; font-weight: 800; color: #4c1d95; }
        .subtitulo { color: #6b7280; font-size: 13px; }
        .info { color: #374151; font-size: 12px; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #d9e2f3; padding: 8px; font-size: 12px; vertical-align: middle; }
        th { background: #6d28d9; color: #ffffff; font-weight: 700; text-align: left; }
        .resumo-label { background: #f3f4f6; color: #6b7280; font-weight: 700; text-transform: uppercase; font-size: 11px; }
        .resumo-valor { background: #ffffff; font-size: 16px; font-weight: 800; color: #111827; }
        .money { white-space: nowrap; mso-number-format:"\\0022R$\\0022\\ #,##0.00"; }
        .center { text-align: center; }
        .strong { font-weight: 700; }
        .status-pago { background: #dcfce7; color: #166534; font-weight: 700; }
        .status-pendente { background: #fef3c7; color: #92400e; font-weight: 700; }
        .status-atrasado { background: #fee2e2; color: #991b1b; font-weight: 700; }
        .zebra { background: #f8fafc; }
      </style>
    </head>
    <body>
      <table>
        <tr>
          <td colspan="12" class="titulo">Relatório Financeiro — ${escaparHTMLRelatorio(nomeEmpresa || "Mensalize")}</td>
        </tr>
        <tr>
          <td colspan="12" class="subtitulo">Período: ${escaparHTMLRelatorio(tituloMes)} · Filtro: ${escaparHTMLRelatorio(statusFiltroTexto)} · Emitido em ${escaparHTMLRelatorio(dataEmissao)}</td>
        </tr>
        <tr><td colspan="12"></td></tr>
        <tr>
          <td class="resumo-label" colspan="2">Recebido</td>
          <td class="resumo-label" colspan="2">A receber</td>
          <td class="resumo-label" colspan="2">Previsão</td>
          <td class="resumo-label" colspan="2">Pagos</td>
          <td class="resumo-label" colspan="2">Pendentes</td>
          <td class="resumo-label" colspan="2">Atrasados</td>
        </tr>
        <tr>
          <td class="resumo-valor money" colspan="2">${formatarMoeda(dados.resumo.recebido)}</td>
          <td class="resumo-valor money" colspan="2">${formatarMoeda(dados.resumo.aReceber)}</td>
          <td class="resumo-valor money" colspan="2">${formatarMoeda(dados.resumo.previsao)}</td>
          <td class="resumo-valor center" colspan="2">${dados.resumo.pagos}</td>
          <td class="resumo-valor center" colspan="2">${dados.resumo.pendentes}</td>
          <td class="resumo-valor center" colspan="2">${dados.resumo.atrasados}</td>
        </tr>
        <tr>
          <td colspan="12" class="info">Total de alunos cadastrados: ${dados.resumo.totalAlunos} · Alunos exibidos neste relatório: ${dados.resumo.alunosNoRelatorio}</td>
        </tr>
        <tr><td colspan="12"></td></tr>
        <tr>
          <th>#</th>
          <th>Aluno</th>
          <th>WhatsApp</th>
          <th>Responsável</th>
          <th>Turma</th>
          <th>Faixa/Grau</th>
          <th>Mensalidade</th>
          <th>Vencimento</th>
          <th>Status</th>
          <th>Valor pago no mês</th>
          <th>Data(s) pagamento</th>
          <th>Qtd. pag.</th>
        </tr>
        ${linhasTabela || `<tr><td colspan="12" class="center">Nenhum aluno encontrado para esse filtro.</td></tr>`}
      </table>
    </body>
    </html>`;
}

async function exportarRelatorioFinanceiroPlanilha() {
  if (!alunos || alunos.length === 0) {
    mostrarToast("Nenhum aluno carregado para exportar.", "erro");
    return;
  }

  try {
    const dados = await obterDadosRelatorioFinanceiroSelecionado();
    const html = montarRelatorioFinanceiroPlanilhaHTML(dados);
    const nomeFiltro = dados.filtroStatus === "todos" ? "todos" : dados.filtroStatus;
    const nomeArquivo = `mensalize-financeiro-${dados.periodo.mes}-${nomeFiltro}.xls`;
    const blob = new Blob(["\ufeff" + html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    mostrarToast("📊 Planilha financeira gerada com sucesso!");
  } catch (erro) {
    console.log("Erro ao exportar planilha financeira:", erro?.message || erro);
    mostrarToast("Erro ao gerar planilha financeira.", "erro");
  }
}

// O botão #btnExportar agora é controlado por js/55-central-relatorios.js.
// A função legada acima é mantida por compatibilidade, mas não é ligada ao clique.

// ===============================
// 29. HISTÓRICO — DELETAR PAGAMENTO
// ===============================

/** Remove um pagamento específico do histórico. */
async function deletarPagamento(pagamentoId, alunoId) {
  const { data: pagamento, error: erroBusca } = await supabaseClient
    .from("pagamentos")
    .select("id,aluno_id,vencimento_referencia")
    .eq("id", pagamentoId)
    .eq("aluno_id", alunoId)
    .single();

  if (erroBusca || !pagamento) {
    mostrarToast("Pagamento não encontrado.", "erro");
    return;
  }

  const { error } = await supabaseClient
    .from("pagamentos")
    .delete()
    .eq("id", pagamentoId)
    .eq("aluno_id", alunoId);

  if (error) {
    mostrarToast("Erro ao remover pagamento.", "erro");
    return;
  }

  if (pagamento.vencimento_referencia) {
    const aluno = alunos.find(item => String(item.id) === String(alunoId));
    const proximoVencimento = !aluno?.vencimento || pagamento.vencimento_referencia < aluno.vencimento
      ? pagamento.vencimento_referencia
      : aluno.vencimento;

    const { error: erroVencimento } = await supabaseClient
      .from("alunos")
      .update({ vencimento: proximoVencimento })
      .eq("id", alunoId);

    if (erroVencimento) {
      mostrarToast("Pagamento removido, mas o vencimento precisa ser conferido.", "erro");
      await carregarAlunos();
      abrirHistorico(alunoId);
      return;
    }
  }

  mostrarToast("Pagamento removido.");
  await carregarAlunos();
  abrirHistorico(alunoId);
}

// Histórico com botão de deletar pagamento
/** Abre modal com dados do aluno e histórico de pagamentos. */
async function abrirHistorico(alunoId) {
  const aluno = alunos.find(a => String(a.id) === String(alunoId));

  if (!aluno) {
    mostrarToast("Aluno não encontrado.", "erro");
    return;
  }

  const status = verificarStatus(aluno.vencimento);
  const dias = calcularDias(aluno.vencimento);
  let textoStatus = "Pendente", classeStatus = "status-pendente";
  if (status === "atrasado") { textoStatus = `Atrasado há ${Math.abs(dias)}d`; classeStatus = "status-atrasado"; }
  else if (dias === 0) { textoStatus = "Vence hoje"; classeStatus = "status-hoje"; }
  else if (dias <= 3) { textoStatus = `Vence em ${dias}d`; classeStatus = "status-pendente"; }

  modalNomeAluno.textContent = aluno.nome;
  const telefoneAlunoSeguro = escaparHTMLRelatorio(aluno.telefone || "Não informado");
  modalInfoAluno.innerHTML = `
    <p><strong>WhatsApp:</strong> ${telefoneAlunoSeguro}</p>
    <p><strong>Mensalidade:</strong> ${formatarMoeda(aluno.valor)}</p>
    <p><strong>Vencimento atual:</strong> ${formatarData(aluno.vencimento)}</p>
    <p><strong>Status:</strong> <span class="${classeStatus}">${textoStatus}</span></p>
  `;
  modalListaPagamentos.innerHTML = "<p>Carregando histórico...</p>";
  modalHistorico.classList.remove("escondido");

  let queryHistorico = supabaseClient
    .from("pagamentos")
    .select("id,user_id,aluno_id,valor,data_pagamento,vencimento_referencia,created_at")
    .eq("aluno_id", alunoId);

  queryHistorico = aplicarFiltroUsuario(queryHistorico);

  const { data, error } = await queryHistorico
    .order("data_pagamento", { ascending: false });

  if (error) { modalListaPagamentos.innerHTML = "<p>Erro ao carregar histórico.</p>"; return; }
  if (!data.length) { modalListaPagamentos.innerHTML = "<p style='color:#a1a1aa;text-align:center;padding:20px;'>Nenhum pagamento registrado ainda.</p>"; return; }

  modalListaPagamentos.innerHTML = "";
  data.forEach(pagamento => {
    const div = document.createElement("div");
    div.classList.add("pagamento-item");
    const valor = valorParaNumero(pagamento.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const referencia = pagamento.vencimento_referencia
      ? `Mensalidade ${formatarData(pagamento.vencimento_referencia)}`
      : "Mensalidade sem referência";
    div.innerHTML = `
      <span>${formatarData(pagamento.data_pagamento)} · ${referencia}</span>
      <strong>${valor}</strong>
      <button onclick="deletarPagamento('${pagamento.id}', '${alunoId}')" class="btn-deletar-pagamento" title="Remover pagamento">🗑</button>
    `;
    modalListaPagamentos.appendChild(div);
  });
}

// ===============================
// 30. EDIÇÃO RÁPIDA — VALOR E VENCIMENTO
// ===============================

/**
 * Edição rápida de valor/data foi removida da interface.
 * Mantemos estas funções protegidas apenas para evitar erro caso algum cache antigo ainda tente chamá-las.
 */
function abrirEdicaoRapida(alunoId) {
  const aluno = alunos.find(a => String(a.id) === String(alunoId));
  if (!aluno) {
    mostrarToast("Aluno não encontrado.", "erro");
    return;
  }

  if (!modalEdicaoRapida || !edicaoRapidaAlunoId || !edicaoRapidaNome || !edicaoRapidaValor || !edicaoRapidaVencimento) {
    editarAluno(alunoId);
    return;
  }

  edicaoRapidaAlunoId.value = aluno.id;
  edicaoRapidaNome.textContent = aluno.nome;
  edicaoRapidaValor.value = formatarMoeda(aluno.valor);
  edicaoRapidaVencimento.value = aluno.vencimento;
  modalEdicaoRapida.classList.remove("escondido");
}

/** Fecha modal de edição rápida e limpa o ID selecionado. */
function fecharEdicaoRapida() {
  if (!modalEdicaoRapida || !edicaoRapidaAlunoId) return;
  modalEdicaoRapida.classList.add("escondido");
  edicaoRapidaAlunoId.value = "";
}

if (btnFecharEdicaoRapida) btnFecharEdicaoRapida.addEventListener("click", fecharEdicaoRapida);
if (btnCancelarEdicaoRapida) btnCancelarEdicaoRapida.addEventListener("click", fecharEdicaoRapida);
if (modalEdicaoRapida) modalEdicaoRapida.addEventListener("click", e => { if (e.target === modalEdicaoRapida) fecharEdicaoRapida(); });

if (edicaoRapidaValor) {
  edicaoRapidaValor.setAttribute("inputmode", "decimal");
  edicaoRapidaValor.setAttribute("autocomplete", "off");

  edicaoRapidaValor.addEventListener("input", function() {
    limparCampoMoedaDuranteDigitacao(this);
  });

  edicaoRapidaValor.addEventListener("blur", function() {
    formatarCampoMoeda(this);
  });
}

if (btnSalvarEdicaoRapida) {
  btnSalvarEdicaoRapida.addEventListener("click", async function() {
    const id = edicaoRapidaAlunoId ? edicaoRapidaAlunoId.value : "";
    const valor = valorParaNumero(edicaoRapidaValor ? edicaoRapidaValor.value : 0);
    const vencimento = edicaoRapidaVencimento ? edicaoRapidaVencimento.value : "";

    if (!id || !valor || !vencimento) {
      mostrarToast("Preencha valor e vencimento.", "erro");
      return;
    }

    btnSalvarEdicaoRapida.disabled = true;

    const { error } = await supabaseClient
      .from("alunos")
      .update({ valor, vencimento })
      .eq("id", id);

    btnSalvarEdicaoRapida.disabled = false;

    if (error) {
      mostrarToast("Erro ao atualizar valor/data.", "erro");
      return;
    }

    fecharEdicaoRapida();
    await carregarAlunos();
    mostrarToast("⚡ Valor e vencimento atualizados!");
  });
}

// ===============================
// 31. GRÁFICO — RECEBIMENTOS DOS ÚLTIMOS 6 MESES
// ===============================

/** Busca recebimentos dos últimos 6 meses e renderiza gráfico simples em barras. */
async function carregarGrafico() {
  const areaGrafico = document.getElementById("areaGrafico");
  const graficoBars = document.getElementById("graficoBars");

  areaGrafico.classList.remove("escondido");
  graficoBars.innerHTML = `<p style="color:#a1a1aa;text-align:center;padding:20px;">Carregando gráfico...</p>`;

  const hoje = new Date();
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    meses.push({
      label: d.toLocaleString("pt-BR", { month: "short" }),
      ano: d.getFullYear(),
      mes: d.getMonth() + 1,
      inicio: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0],
      fim: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0]
    });
  }

  let queryGrafico = supabaseClient
    .from("pagamentos")
    .select("valor, data_pagamento");

  queryGrafico = aplicarFiltroUsuario(queryGrafico);

  const { data: pagamentos } = await queryGrafico
    .gte("data_pagamento", meses[0].inicio)
    .lte("data_pagamento", meses[5].fim);

  const totais = meses.map(m => {
    const total = (pagamentos || [])
      .filter(p => p.data_pagamento >= m.inicio && p.data_pagamento <= m.fim)
      .reduce((sum, p) => sum + valorParaNumero(p.valor), 0);
    return { ...m, total };
  });

  const maxVal = Math.max(...totais.map(t => t.total), 1);

  graficoBars.innerHTML = totais.map(m => {
    const pct = Math.round((m.total / maxVal) * 100);
    const label = m.total > 0 ? m.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0";
    const isMesAtual = m.mes === hoje.getMonth() + 1 && m.ano === hoje.getFullYear();
    return `
      <div class="grafico-col">
        <div class="grafico-valor">${label}</div>
        <div class="grafico-barra-wrap">
          <div class="grafico-barra ${isMesAtual ? "grafico-barra-atual" : ""}" style="height:${Math.max(pct, 3)}%"></div>
        </div>
        <div class="grafico-label">${m.label}</div>
      </div>
    `;
  }).join("");
}

document.getElementById("btnFecharGrafico").addEventListener("click", () => {
  document.getElementById("areaGrafico").classList.add("escondido");
});

// Abre o gráfico ao clicar em "Recebido no mês"
document.querySelector(".card.receita").style.cursor = "pointer";
document.querySelector(".card.receita").addEventListener("click", carregarGrafico);
document.querySelector(".card.receita").title = "Clique para ver gráfico";

// ===============================
// 32. TEMA — CLARO / ESCURO
// ===============================

/** Tema claro desativado temporariamente no Beta. */
function aplicarTema() {
  document.documentElement.setAttribute("data-tema", "escuro");
  document.body.removeAttribute("data-tema");
  localStorage.setItem("mensalize-tema", "escuro");

  if (typeof btnTema !== "undefined" && btnTema) {
    btnTema.textContent = "🌙 Tema";
    btnTema.classList.add("escondido");
  }
}

// Garante que qualquer tema claro salvo antigo seja removido.
localStorage.setItem("mensalize-tema", "escuro");
aplicarTema();

// ===============================
