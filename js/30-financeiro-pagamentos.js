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
