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

  if (error) {
    console.log("Erro ao carregar pagamentos:", error.message);
    totalPagos.textContent = 0;
    totalRecebido.textContent = "R$ 0,00";
    totalPrevisao.textContent = formatarMoeda(previsaoTotal);
  } else {
    totalPagos.textContent = alunosQueJaPagaramIds.size;

    const recebido = pagamentosValidos.reduce((total, pagamento) => {
      return total + valorParaNumero(pagamento.valor);
    }, 0);

    totalRecebido.textContent = formatarMoeda(recebido);
    totalPrevisao.textContent = formatarMoeda(previsaoTotal);
  }

  totalAlunos.textContent = alunos.length;
  totalPendentes.textContent = pendentes;
  totalAtrasados.textContent = atrasados;
  totalAReceber.textContent = formatarMoeda(valorAReceber);
  atualizarEspelhosFinanceiros();
  atualizarResumoEvolucao();
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
// 17.1 FINANCEIRO — FILTRO POR MÊS
// ===============================

function obterMesAtualISO() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

function obterPeriodoFinanceiroSelecionado() {
  const mes = financeiroMes && financeiroMes.value ? financeiroMes.value : obterMesAtualISO();
  const [ano, mesNumero] = mes.split("-").map(Number);
  const inicio = `${ano}-${String(mesNumero).padStart(2, "0")}-01`;
  const fimData = new Date(ano, mesNumero, 0);
  const fim = `${fimData.getFullYear()}-${String(fimData.getMonth() + 1).padStart(2, "0")}-${String(fimData.getDate()).padStart(2, "0")}`;
  return { mes, inicio, fim, ano, mesNumero };
}

function classificarFinanceiroAlunoMes(aluno, pagosSet, fimPeriodo) {
  if (pagosSet.has(String(aluno.id))) return "pago";

  const conversorData = typeof dataStringParaDate === "function" ? dataStringParaDate : (valor => new Date(valor));
  const vencimento = conversorData(aluno.vencimento);
  const referencia = conversorData(fimPeriodo);

  if (vencimento && referencia && vencimento < referencia) return "atrasado";
  return "pendente";
}

function statusFinanceiroTexto(status) {
  const mapa = {
    pago: "Pago",
    pendente: "Pendente",
    atrasado: "Atrasado"
  };
  return mapa[status] || "Pendente";
}

async function carregarResumoFinanceiroMensal() {
  if (!financeiroMes || !listaFinanceiroMensal) return;

  if (!financeiroMes.value) {
    financeiroMes.value = obterMesAtualISO();
  }

  const { inicio, fim } = obterPeriodoFinanceiroSelecionado();
  const filtroStatus = financeiroStatus ? financeiroStatus.value : "todos";

  listaFinanceiroMensal.innerHTML = `<div class="empty-state-mini">Carregando financeiro...</div>`;

  let queryPagamentos = supabaseClient
    .from("pagamentos")
    .select("id,user_id,aluno_id,valor,data_pagamento,created_at");

  queryPagamentos = aplicarFiltroUsuario(queryPagamentos);

  const { data: pagamentos, error } = await queryPagamentos
    .gte("data_pagamento", inicio)
    .lte("data_pagamento", fim);

  if (error) {
    console.log("Erro ao carregar financeiro mensal:", error.message);
    listaFinanceiroMensal.innerHTML = `<div class="empty-state-mini">Não foi possível carregar o financeiro do mês.</div>`;
    return;
  }

  const pagamentosValidos = pagamentos || [];
  const pagosSet = new Set(pagamentosValidos.map(p => String(p.aluno_id)));
  const recebido = pagamentosValidos.reduce((total, pagamento) => total + valorParaNumero(pagamento.valor), 0);

  let pagos = 0;
  let pendentes = 0;
  let atrasados = 0;
  let previsao = 0;
  let aReceber = 0;

  let linhas = (alunos || []).map(aluno => {
    const valor = valorParaNumero(aluno.valor);
    const status = classificarFinanceiroAlunoMes(aluno, pagosSet, fim);

    previsao += valor;
    if (status === "pago") pagos++;
    if (status === "pendente") {
      pendentes++;
      aReceber += valor;
    }
    if (status === "atrasado") {
      atrasados++;
      aReceber += valor;
    }

    return { aluno, valor, status };
  });

  if (filtroStatus !== "todos") {
    linhas = linhas.filter(item => item.status === filtroStatus);
  }

  if (financeiroRecebidoMirror) financeiroRecebidoMirror.textContent = formatarMoeda(recebido);
  if (financeiroAReceberMirror) financeiroAReceberMirror.textContent = formatarMoeda(aReceber);
  if (financeiroPrevisaoMirror) financeiroPrevisaoMirror.textContent = formatarMoeda(previsao);
  if (financeiroPagosMirror) financeiroPagosMirror.textContent = pagos;
  if (financeiroPendentesMirror) financeiroPendentesMirror.textContent = pendentes;
  if (financeiroAtrasadosMirror) financeiroAtrasadosMirror.textContent = atrasados;
  if (financeiroListaContador) financeiroListaContador.textContent = `${linhas.length} aluno${linhas.length === 1 ? "" : "s"}`;

  if (!linhas.length) {
    listaFinanceiroMensal.innerHTML = `<div class="empty-state-mini">Nenhum aluno encontrado para esse filtro.</div>`;
    return;
  }

  linhas.sort((a, b) => {
    const ordem = { atrasado: 1, pendente: 2, pago: 3 };
    return (ordem[a.status] || 9) - (ordem[b.status] || 9) || String(a.aluno.nome).localeCompare(String(b.aluno.nome), "pt-BR");
  });

  listaFinanceiroMensal.innerHTML = linhas.map(({ aluno, valor, status }) => `
    <div class="financeiro-linha-mensal status-${status}">
      <div>
        <strong>${aluno.nome}</strong>
        <span>Vencimento: ${formatarData(aluno.vencimento)} · ${aluno.telefone || "Sem WhatsApp"}</span>
      </div>
      <div class="financeiro-linha-dir">
        <strong>${formatarMoeda(valor)}</strong>
        <span class="status-badge status-${status}">${statusFinanceiroTexto(status)}</span>
      </div>
    </div>
  `).join("");
}

if (financeiroMes) {
  financeiroMes.value = obterMesAtualISO();
  financeiroMes.addEventListener("change", carregarResumoFinanceiroMensal);
}

if (financeiroStatus) {
  financeiroStatus.addEventListener("change", carregarResumoFinanceiroMensal);
}

if (btnAtualizarFinanceiroMes) {
  btnAtualizarFinanceiroMes.addEventListener("click", carregarResumoFinanceiroMensal);
}


async function registrarPagamentoAluno(aluno, opcoes = {}) {
  if (!aluno) {
    return { ok: false, mensagem: "Aluno não encontrado." };
  }

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
    return { ok: false, mensagem: "Erro ao verificar pagamento existente." };
  }

  if (pagamentoJaExiste && pagamentoJaExiste.length > 0) {
    return { ok: false, mensagem: "Este aluno já tem pagamento registrado neste mês.", jaExiste: true };
  }

  const valorPagamento = valorParaNumero(aluno.valor);
  const calculoPagamento = calcularMensalidadesParaRegistrar(aluno.vencimento);
  const dataPagamentoInformada = opcoes.dataPagamento || new Date().toISOString().split("T")[0];

  const pagamentosParaInserir = calculoPagamento.mensalidades.map(() => ({
    aluno_id: aluno.id,
    user_id: aluno.user_id,
    valor: valorPagamento,
    data_pagamento: dataPagamentoInformada
  }));

  const { error: erroPagamento } = await supabaseClient
    .from("pagamentos")
    .insert(pagamentosParaInserir);

  if (erroPagamento) {
    return { ok: false, mensagem: "Erro ao registrar pagamento." };
  }

  const { error: erroAtualizarAluno } = await supabaseClient
    .from("alunos")
    .update({
      vencimento: calculoPagamento.novoVencimento
    })
    .eq("id", aluno.id);

  if (erroAtualizarAluno) {
    return { ok: false, mensagem: "Pagamento salvo, mas erro ao atualizar vencimento." };
  }

  return {
    ok: true,
    novoVencimento: calculoPagamento.novoVencimento,
    quantidade: calculoPagamento.mensalidades.length
  };
}

window.registrarPagamentoAluno = registrarPagamentoAluno;

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

function obterTemplateCobrancaPadrao(aluno, valorFmt, data) {
  return `*${nomeEmpresa.toUpperCase()}*

Olá, *${aluno.nome}*. Tudo bem?

Identificamos que sua mensalidade com vencimento em *${data}* encontra-se em aberto.

*Valor:* ${valorFmt}

Caso o pagamento já tenha sido realizado, por favor desconsidere esta mensagem e nos envie o comprovante para confirmação no sistema.

Agradecemos pela atenção e permanecemos à disposição.`;
}

function aplicarVariaveisTemplateCobranca(template, aluno, valorFmt, data) {
  return String(template || "")
    .replaceAll("{nome}", aluno.nome || "")
    .replaceAll("{valor}", valorFmt || "")
    .replaceAll("{vencimento}", data || "")
    .replaceAll("{empresa}", nomeEmpresa || "Mensalize");
}

function obterMensagemCobranca(aluno, valorFmt, data) {
  let templateSalvo = "";

  try {
    templateSalvo = localStorage.getItem("mensalize_template_cobranca") || "";
  } catch (erro) {
    templateSalvo = "";
  }

  if (templateSalvo.trim()) {
    return aplicarVariaveisTemplateCobranca(templateSalvo, aluno, valorFmt, data);
  }

  return obterTemplateCobrancaPadrao(aluno, valorFmt, data);
}

function salvarTemplateCobranca(template) {
  try {
    localStorage.setItem("mensalize_template_cobranca", String(template || ""));
    return true;
  } catch (erro) {
    console.log("Não foi possível salvar o template de cobrança:", erro.message);
    return false;
  }
}

window.salvarTemplateCobranca = salvarTemplateCobranca;

function montarMensagemReciboWhatsApp(aluno, resultadoPagamento) {
  const hoje = new Date();
  const dataPagamento = hoje.toLocaleDateString("pt-BR");
  const quantidade = Number(resultadoPagamento?.quantidade || 1);
  const valorTotal = valorParaNumero(aluno.valor) * quantidade;
  const proximoVencimento = resultadoPagamento?.novoVencimento
    ? formatarData(resultadoPagamento.novoVencimento)
    : formatarData(aluno.vencimento);

  return `*${nomeEmpresa.toUpperCase()}*

Olá, *${aluno.nome}*. Tudo bem?

Confirmamos o recebimento da sua mensalidade.

✅ *Valor pago:* ${formatarMoeda(valorTotal)}
📅 *Data do pagamento:* ${dataPagamento}
📌 *Próximo vencimento:* ${proximoVencimento}

Obrigado!`;
}

function abrirReciboWhatsApp(aluno, resultadoPagamento) {
  const telefone = limparNumeroWhatsApp(aluno.telefone || aluno.responsavel_whatsapp || "");

  if (!telefone || telefone.length < 10) {
    mostrarToast("Pagamento confirmado, mas o aluno não tem WhatsApp válido para envio do recibo.", "erro");
    return;
  }

  const mensagem = montarMensagemReciboWhatsApp(aluno, resultadoPagamento);
  window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`, "_blank");
}

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

  const resultado = await registrarPagamentoAluno(aluno);

  btnConfirmarPagamento.disabled = false;

  if (!resultado.ok) {
    mostrarToast(resultado.mensagem || "Erro ao registrar pagamento.", "erro");
    if (resultado.jaExiste) await carregarAlunos();
    return;
  }

  await carregarAlunos();
  mostrarToast("✅ Pagamento registrado e vencimento atualizado!");

  if (confirm("Deseja enviar um recibo pelo WhatsApp para este aluno?")) {
    abrirReciboWhatsApp(aluno, resultado);
  }
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

  const msg = obterMensagemCobranca(aluno, valorFmt, data);

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
