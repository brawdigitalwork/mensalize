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
btnBannerAtrasados.addEventListener("click", () => { setFiltro("atrasado"); bannerVencimentos.classList.add("escondido"); });
btnBannerHoje.addEventListener("click", () => { setFiltro("hoje"); bannerVencimentos.classList.add("escondido"); });

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

    const div = document.createElement("div");
    div.classList.add("cobrar-item");
    div.innerHTML = `
      <div class="cobrar-info">
        <span class="cobrar-nome">${aluno.nome}</span>
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

/** Permite apenas caracteres compatíveis com valor monetário. */
function limparCampoMoedaDuranteDigitacao(input) {
  input.value = input.value.replace(/[^\d,.]/g, "");
}

/** Formata campo de valor ao sair do input. */
function formatarCampoMoeda(input) {
  const numero = valorParaNumero(input.value);

  if (!numero) {
    input.value = "";
    return;
  }

  input.value = formatarMoeda(numero);
}

inputValor.addEventListener("input", function() {
  limparCampoMoedaDuranteDigitacao(this);
});

inputValor.addEventListener("blur", function() {
  formatarCampoMoeda(this);
});


// ===============================
// 28. RELATÓRIO — EXPORTAR EXCEL / PDF
// ===============================

/** Monta HTML completo do relatório mensal para exportação. */
function montarRelatorioMensalHTML() {
  const hoje = new Date();
  const mesAno = hoje.toLocaleString("pt-BR", { month: "long", year: "numeric" });

  const totalAlunosRel = alunos.length;
  let pagos = 0;
  let pendentes = 0;
  let atrasados = 0;
  let recebido = 0;
  let aReceber = 0;
  let previsao = 0;

  const linhas = alunos.map(aluno => {
    const pago = alunosPagosMes.has(String(aluno.id));
    const status = pago ? "Pago" : (verificarStatus(aluno.vencimento) === "atrasado" ? "Atrasado" : "Pendente");
    const valor = valorParaNumero(aluno.valor);
    previsao += valor;
    if (pago) {
      pagos++;
      recebido += valor;
    } else {
      aReceber += valor;
      if (status === "Atrasado") atrasados++; else pendentes++;
    }

    return `
      <tr>
        <td>${aluno.nome}</td>
        <td>${aluno.telefone}</td>
        <td>${formatarMoeda(valor)}</td>
        <td>${formatarData(aluno.vencimento)}</td>
        <td>${status}</td>
      </tr>`;
  }).join("");

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório Mensalize - ${mesAno}</title>
      <style>
        body { font-family: Arial, sans-serif; color:#111827; }
        h1 { color:#7c3aed; margin-bottom:4px; }
        .sub { color:#6b7280; margin-bottom:20px; }
        .resumo { display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin-bottom:20px; }
        .box { border:1px solid #ddd; border-radius:10px; padding:10px; }
        .box span { display:block; color:#6b7280; font-size:12px; }
        .box strong { font-size:18px; }
        table { width:100%; border-collapse:collapse; }
        th { background:#7c3aed; color:white; text-align:left; }
        th, td { border:1px solid #ddd; padding:8px; font-size:13px; }
        tr:nth-child(even) { background:#f8f8ff; }
        @media print { .no-print { display:none; } }
      </style>
    </head>
    <body>
      <button class="no-print" onclick="window.print()">Salvar como PDF</button>
      <h1>Relatório Mensalize</h1>
      <div class="sub">${mesAno}</div>
      <div class="resumo">
        <div class="box"><span>Total de alunos</span><strong>${totalAlunosRel}</strong></div>
        <div class="box"><span>Pagos</span><strong>${pagos}</strong></div>
        <div class="box"><span>Pendentes</span><strong>${pendentes}</strong></div>
        <div class="box"><span>Atrasados</span><strong>${atrasados}</strong></div>
        <div class="box"><span>Recebido</span><strong>${formatarMoeda(recebido)}</strong></div>
        <div class="box"><span>A receber</span><strong>${formatarMoeda(aReceber)}</strong></div>
        <div class="box"><span>Previsão do mês</span><strong>${formatarMoeda(previsao)}</strong></div>
      </div>
      <table>
        <thead>
          <tr><th>Nome</th><th>Telefone</th><th>Mensalidade</th><th>Vencimento</th><th>Status</th></tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </body>
    </html>`;
}

function montarRelatorioCSV() {
  const cabecalho = ["Nome", "Telefone", "Mensalidade", "Vencimento", "Status", "Turma", "Faixa", "Grau"];
  const linhas = alunos.map(aluno => {
    const dias = calcularDias(aluno.vencimento);
    const status = alunosPagosMes.has(String(aluno.id))
      ? "Pago"
      : dias < 0
        ? `Atrasado há ${Math.abs(dias)} dias`
        : dias === 0
          ? "Vence hoje"
          : "Pendente";

    return [
      aluno.nome || "",
      aluno.telefone || "",
      formatarMoeda(aluno.valor),
      aluno.vencimento ? formatarData(aluno.vencimento) : "",
      status,
      aluno.turma || "",
      aluno.faixa || "",
      aluno.grau || ""
    ].map(campo => `"${String(campo).replace(/"/g, '""')}"`);
  });

  return [cabecalho, ...linhas].map(linha => linha.join(";")).join("\n");
}

if (btnExportar) {
  btnExportar.addEventListener("click", function() {
    const hoje = new Date();
    const mesAno = hoje
      .toLocaleString("pt-BR", { month: "long", year: "numeric" })
      .replace(" ", "-");

    const csv = montarRelatorioCSV();
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `mensalize-relatorio-${mesAno}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    mostrarToast("📥 CSV gerado com sucesso!");
  });
}

// ===============================
// 29. HISTÓRICO — DELETAR PAGAMENTO
// ===============================

/** Remove um pagamento específico do histórico. */
async function deletarPagamento(pagamentoId, alunoId) {
  const { error } = await supabaseClient
    .from("pagamentos")
    .delete()
    .eq("id", pagamentoId);

  if (error) {
    mostrarToast("Erro ao remover pagamento.", "erro");
    return;
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
  modalInfoAluno.innerHTML = `
    <p><strong>WhatsApp:</strong> ${aluno.telefone}</p>
    <p><strong>Mensalidade:</strong> ${formatarMoeda(aluno.valor)}</p>
    <p><strong>Vencimento atual:</strong> ${formatarData(aluno.vencimento)}</p>
    <p><strong>Status:</strong> <span class="${classeStatus}">${textoStatus}</span></p>
  `;
  modalListaPagamentos.innerHTML = "<p>Carregando histórico...</p>";
  modalHistorico.classList.remove("escondido");

  let queryHistorico = supabaseClient
    .from("pagamentos")
    .select("id,user_id,aluno_id,valor,data_pagamento,created_at")
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
    div.innerHTML = `
      <span>${formatarData(pagamento.data_pagamento)}</span>
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

/** Aplica tema visual e salva preferência no localStorage. */
function aplicarTema(tema) {
  document.documentElement.setAttribute("data-tema", tema);
  btnTema.textContent = tema === "claro" ? "🌙" : "☀️";
  localStorage.setItem("mensalize-tema", tema);
}

btnTema.addEventListener("click", () => {
  const atual = document.documentElement.getAttribute("data-tema");
  aplicarTema(atual === "claro" ? "escuro" : "claro");
});

// Aplica tema salvo
const temaSalvo = localStorage.getItem("mensalize-tema") || "escuro";
aplicarTema(temaSalvo);

//ABRIR PAGINA DO ALUNO

function abrirPaginaAluno(codigo) {
  if (!codigo) {
    mostrarToast("Código público do aluno não encontrado.", "erro");
    return;
  }

  const link = `${window.location.origin}/aluno.html?codigo=${codigo}`;

  window.open(link, "_blank");
}


// ===============================
