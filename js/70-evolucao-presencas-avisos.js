// 32. MÓDULO EVOLUÇÃO / GRADUAÇÃO
// ===============================
function aplicarModulosInterface() {
  document.querySelectorAll(".modulo-evolucao").forEach(el => {
    el.classList.toggle("escondido", !moduloEvolucaoAtivo);
  });
  document.querySelectorAll(".modulo-presenca").forEach(el => {
    el.classList.toggle("escondido", !moduloPresencaAtivo);
  });
  document.querySelectorAll(".modulo-avisos").forEach(el => {
    el.classList.toggle("escondido", !moduloAvisosAtivo);
  });
}

function adicionarMesesData(dataString, meses) {
  if (!dataString || !meses) return "";
  const partes = String(dataString).split("-");
  if (partes.length !== 3) return "";
  const data = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  const dia = data.getDate();
  data.setMonth(data.getMonth() + Number(meses));
  if (data.getDate() !== dia) data.setDate(0);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

function calcularStatusEvolucao(aluno) {
  if (!aluno || !aluno.data_ultima_graduacao || !aluno.tempo_avaliacao_meses) {
    return { status: "sem-dados", texto: "Sem previsão de avaliação", dias: null, data: "", frequencia: null };
  }

  const dataPrevista = adicionarMesesData(aluno.data_ultima_graduacao, aluno.tempo_avaliacao_meses);
  const hoje = dataHojeSemHora();
  const data = dataStringParaDate(dataPrevista);
  const dias = Math.ceil((data - hoje) / (1000 * 60 * 60 * 24));
  const frequencia = typeof calcularFrequenciaAluno === "function" ? calcularFrequenciaAluno(aluno) : null;
  const textoFreq = frequencia && frequencia.percentual !== null ? ` • ${frequencia.texto}` : "";

  if (dias <= 0) {
    if (frequencia && frequencia.percentual !== null && frequencia.percentual < frequencia.minimo) {
      return {
        status: "frequencia-baixa",
        texto: `Tempo completo, mas frequência abaixo do mínimo (${frequencia.percentual}% de ${frequencia.minimo}%)`,
        dias,
        data: dataPrevista,
        frequencia
      };
    }
    return { status: "apto", texto: `Apto para avaliação${textoFreq}`, dias, data: dataPrevista, frequencia };
  }

  if (dias <= 30) return { status: "proximo", texto: `Faltam ${dias} dia${dias === 1 ? "" : "s"} para avaliação${textoFreq}`, dias, data: dataPrevista, frequencia };
  return { status: "evolucao", texto: `Faltam ${dias} dias para avaliação${textoFreq}`, dias, data: dataPrevista, frequencia };
}

function resumoEvolucaoAluno(aluno) {
  const partes = [];
  if (aluno.faixa) partes.push(`Faixa ${aluno.faixa}`);
  if (aluno.grau !== null && aluno.grau !== undefined && aluno.grau !== "") partes.push(`${aluno.grau}º grau`);
  if (aluno.turma) partes.push(aluno.turma);

  const status = calcularStatusEvolucao(aluno);

  // No card do aluno, deixamos somente o resumo limpo.
  // Frequência detalhada fica na aba Evolução, para não poluir a listagem.
  if (status.status !== "sem-dados") {
    if (status.status === "frequencia-baixa") {
      partes.push("Frequência abaixo do mínimo");
    } else if (status.dias !== null && status.dias <= 0) {
      partes.push("Apto para avaliação");
    } else if (status.dias !== null) {
      partes.push(`Faltam ${status.dias} dia${status.dias === 1 ? "" : "s"} para avaliação`);
    }
  }

  return partes.join(" • ");
}

function atualizarResumoEvolucao() {
  const resumo = { apto: 0, proximo: 0, evolucao: 0, frequencia: 0 };
  alunos.forEach(aluno => {
    const st = calcularStatusEvolucao(aluno).status;
    if (st === "apto") resumo.apto++;
    if (st === "proximo") resumo.proximo++;
    if (st === "evolucao") resumo.evolucao++;
    if (st === "frequencia-baixa") resumo.frequencia++;
  });
  if (totalAptosGraduacao) totalAptosGraduacao.textContent = resumo.apto;
  if (totalProximosGraduacao) totalProximosGraduacao.textContent = resumo.proximo;
  if (totalEmEvolucao) totalEmEvolucao.textContent = resumo.evolucao;
  if (dashboardAptosGraduacao) dashboardAptosGraduacao.textContent = resumo.apto;
  if (dashboardProximosGraduacao) dashboardProximosGraduacao.textContent = resumo.proximo;
  if (dashboardEvolucaoTexto) {
    dashboardEvolucaoTexto.textContent = resumo.apto > 0
      ? `${resumo.apto} aluno${resumo.apto === 1 ? "" : "s"} apto${resumo.apto === 1 ? "" : "s"} para avaliação.`
      : `${resumo.proximo} aluno${resumo.proximo === 1 ? "" : "s"} próximo${resumo.proximo === 1 ? "" : "s"} da avaliação.`;
  }
}

function renderizarEvolucao() {
  if (!listaEvolucao) return;
  atualizarResumoEvolucao();
  let lista = alunos.map(aluno => ({ aluno, evolucao: calcularStatusEvolucao(aluno) }));
  if (filtroEvolucaoAtual !== "todos") {
    lista = lista.filter(item => item.evolucao.status === filtroEvolucaoAtual);
  }
  lista.sort((a, b) => {
    const ordem = { apto: 1, proximo: 2, "frequencia-baixa": 3, evolucao: 4, "sem-dados": 5 };
    return (ordem[a.evolucao.status] || 9) - (ordem[b.evolucao.status] || 9);
  });
  if (lista.length === 0) {
    listaEvolucao.innerHTML = `<div class="empty-state-mini">Nenhum aluno encontrado para este filtro.</div>`;
    return;
  }
  listaEvolucao.innerHTML = lista.map(({ aluno, evolucao }) => `
    <div class="evolucao-item evolucao-${evolucao.status}">
      <div>
        <strong>${aluno.nome}</strong>
        <span>${resumoEvolucaoAluno(aluno) || "Sem dados de evolução cadastrados"}</span>
        ${evolucao.data ? `<small>Previsão para avaliação: ${formatarData(evolucao.data)}</small>` : ""}
        ${evolucao.frequencia && evolucao.frequencia.percentual !== null ? `<small>Frequência analisada: ${evolucao.frequencia.percentual}% • mínimo ${evolucao.frequencia.minimo}% • ${evolucao.frequencia.presencas}/${evolucao.frequencia.aulasValidas} aulas válidas</small>` : ""}
      </div>
      <div class="evolucao-acoes">
        <button type="button" class="acao-secundaria" onclick="abrirModalGraduacao('${aluno.id}')">🥋 Registrar graduação</button>
      </div>
    </div>
  `).join("");
}

function abrirModalGraduacao(id) {
  const aluno = alunos.find(a => String(a.id) === String(id));
  if (!aluno || !modalGraduacao) return;
  graduacaoAlunoId.value = aluno.id;
  graduacaoAlunoNome.textContent = aluno.nome;
  if (novaFaixaGraduacao) novaFaixaGraduacao.value = aluno.faixa || "Branca";
  if (novoGrauGraduacao) novoGrauGraduacao.value = aluno.grau || "0";
  if (dataGraduacaoRegistro) dataGraduacaoRegistro.value = new Date().toISOString().split("T")[0];
  if (observacaoGraduacao) observacaoGraduacao.value = "";
  modalGraduacao.classList.remove("escondido");
}

async function salvarGraduacao() {
  const id = graduacaoAlunoId ? graduacaoAlunoId.value : "";
  if (!id) return;
  const faixa = novaFaixaGraduacao ? novaFaixaGraduacao.value : "";
  const grau = novoGrauGraduacao ? novoGrauGraduacao.value : "0";
  const data = dataGraduacaoRegistro ? dataGraduacaoRegistro.value : new Date().toISOString().split("T")[0];
  const observacao = observacaoGraduacao ? observacaoGraduacao.value.trim() : "";
  const { error } = await supabaseClient
    .from("alunos")
    .update({ faixa, grau, data_ultima_graduacao: data })
    .eq("id", id);
  if (error) {
    mostrarToast("Erro ao registrar graduação.", "erro");
    return;
  }
  const alunoAtualGraduacao = alunos.find(a => String(a.id) === String(id));
  await supabaseClient.from("graduacoes_historico").insert({
    aluno_id: id,
    user_id: usuarioAtual.id,
    faixa_anterior: alunoAtualGraduacao ? alunoAtualGraduacao.faixa : null,
    grau_anterior: alunoAtualGraduacao ? alunoAtualGraduacao.grau : null,
    nova_faixa: faixa,
    novo_grau: grau,
    data_graduacao: data,
    observacao
  });
  if (modalGraduacao) modalGraduacao.classList.add("escondido");
  mostrarToast("Graduação registrada com sucesso!");
  await carregarAlunos();
  renderizarEvolucao();
}

function dataLocalISO() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

function nomeTurmaAluno(aluno) {
  const turma = String(aluno && aluno.turma ? aluno.turma : "").trim();
  return turma || "Sem turma";
}

function alunosAtivosParaChamada() {
  return alunos.filter(aluno => String(aluno.status_aluno || "ativo").toLowerCase() !== "inativo");
}

function preencherTurmasPresenca() {
  if (!presencaTurma) return;
  const turmaAtual = presencaTurma.value || "todas";
  const turmasBanco = (turmasCadastradas || []).filter(t => t.ativa !== false).map(t => t.nome);
  const turmasAlunos = alunosAtivosParaChamada().map(nomeTurmaAluno);
  const turmas = [...new Set([...turmasBanco, ...turmasAlunos])].filter(Boolean).sort((a, b) => a.localeCompare(b, "pt-BR"));
  presencaTurma.innerHTML = `<option value="todas">Todas as turmas</option>` + turmas.map(turma => `<option value="${turma}">${turma}</option>`).join("");
  if (["todas", ...turmas].includes(turmaAtual)) {
    presencaTurma.value = turmaAtual;
  }
}

function alunosFiltradosPresenca() {
  const turmaSelecionada = presencaTurma ? presencaTurma.value : "todas";
  return alunosAtivosParaChamada().filter(aluno => turmaSelecionada === "todas" || nomeTurmaAluno(aluno) === turmaSelecionada);
}

function atualizarResumoChamada() {
  const lista = alunosFiltradosPresenca();
  const presentes = lista.filter(aluno => presencaMarcacoes.get(String(aluno.id)) === true).length;
  const total = lista.length;
  if (presencaTotalPresentes) presencaTotalPresentes.textContent = presentes;
  if (presencaTotalFaltas) presencaTotalFaltas.textContent = Math.max(total - presentes, 0);
  if (presencaTotalAlunos) presencaTotalAlunos.textContent = total;
}

async function carregarMarcacoesPresenca() {
  presencaMarcacoes = new Map();
  if (!usuarioAtual || !presencaData) return;
  const data = presencaData.value || dataLocalISO();
  const { data: registros, error } = await supabaseClient
    .from("presencas")
    .select("aluno_id, presente")
    .eq("user_id", usuarioAtual.id)
    .eq("data_aula", data);

  if (error) {
    console.log("Erro ao carregar presenças:", error.message);
    return;
  }

  (registros || []).forEach(registro => {
    presencaMarcacoes.set(String(registro.aluno_id), registro.presente === true);
  });
}

function renderizarListaPresencas() {
  if (!listaPresencas) return;
  const data = presencaData ? (presencaData.value || dataLocalISO()) : dataLocalISO();
  const turmaSelecionada = presencaTurma ? presencaTurma.value : "todas";

  if (turmaSelecionada !== "todas" && typeof aulaCanceladaPara === "function") {
    const aulaCancelada = aulaCanceladaPara(turmaSelecionada, data);
    if (aulaCancelada) {
      if (presencaTotalPresentes) presencaTotalPresentes.textContent = "0";
      if (presencaTotalFaltas) presencaTotalFaltas.textContent = "0";
      if (presencaTotalAlunos) presencaTotalAlunos.textContent = "0";
      listaPresencas.innerHTML = `<div class="empty-state-mini aula-cancelada-box"><strong>Aula cancelada em ${formatarData(data)}</strong><br>${aulaCancelada.motivo || "Aula cancelada"}. Esta aula não entra no cálculo de frequência para graduação.</div>`;
      return;
    }
  }

  const lista = alunosFiltradosPresenca();
  atualizarResumoChamada();

  if (lista.length === 0) {
    listaPresencas.innerHTML = `<div class="empty-state-mini">Nenhum aluno encontrado para esta turma.</div>`;
    return;
  }

  const grupos = lista.reduce((acc, aluno) => {
    const turma = nomeTurmaAluno(aluno);
    if (!acc[turma]) acc[turma] = [];
    acc[turma].push(aluno);
    return acc;
  }, {});

  listaPresencas.innerHTML = Object.entries(grupos).map(([turma, alunosTurma]) => `
    <div class="presenca-turma-card">
      <div class="presenca-turma-topo">
        <strong>${turma}</strong>
        <span>${alunosTurma.length} aluno${alunosTurma.length === 1 ? "" : "s"}</span>
      </div>
      <div class="presenca-alunos">
        ${alunosTurma.map(aluno => {
          const marcado = presencaMarcacoes.get(String(aluno.id)) === true;
          return `
            <label class="presenca-aluno-item ${marcado ? "presente" : "faltou"}">
              <input type="checkbox" data-presenca-aluno="${aluno.id}" ${marcado ? "checked" : ""}>
              <div>
                <strong>${aluno.nome}</strong>
                <span>${resumoEvolucaoAluno(aluno) || aluno.telefone || "Aluno cadastrado"}</span>
              </div>
              <em>${marcado ? "Presente" : "Faltou"}</em>
            </label>
          `;
        }).join("")}
      </div>
    </div>
  `).join("");

  listaPresencas.querySelectorAll("[data-presenca-aluno]").forEach(input => {
    input.addEventListener("change", () => {
      presencaMarcacoes.set(String(input.dataset.presencaAluno), input.checked === true);
      input.closest(".presenca-aluno-item")?.classList.toggle("presente", input.checked === true);
      input.closest(".presenca-aluno-item")?.classList.toggle("faltou", input.checked !== true);
      const status = input.closest(".presenca-aluno-item")?.querySelector("em");
      if (status) status.textContent = input.checked ? "Presente" : "Faltou";
      atualizarResumoChamada();
    });
  });
}

async function prepararTelaPresencas() {
  if (!presencaData) return;
  if (!presencaData.value) presencaData.value = dataLocalISO();
  preencherTurmasPresenca();
  await carregarMarcacoesPresenca();
  renderizarListaPresencas();
}

function marcarTodosPresencas(valor) {
  alunosFiltradosPresenca().forEach(aluno => {
    presencaMarcacoes.set(String(aluno.id), valor === true);
  });
  renderizarListaPresencas();
}

async function salvarChamadaPresenca() {
  if (!usuarioAtual || !presencaData) return;
  const data = presencaData.value || dataLocalISO();
  const lista = alunosFiltradosPresenca();

  if (lista.length === 0) {
    mostrarToast("Nenhum aluno para salvar nesta chamada.", "erro");
    return;
  }

  const turmaSelecionada = presencaTurma ? presencaTurma.value : "todas";
  if (turmaSelecionada !== "todas" && typeof aulaCanceladaPara === "function" && aulaCanceladaPara(turmaSelecionada, data)) {
    mostrarToast("Esta aula foi cancelada e não pode receber chamada.", "erro");
    return;
  }

  let deleteQuery = supabaseClient
    .from("presencas")
    .delete()
    .eq("user_id", usuarioAtual.id)
    .eq("data_aula", data);

  if (turmaSelecionada !== "todas") {
    deleteQuery = deleteQuery.eq("turma", turmaSelecionada);
  }

  const { error: erroDelete } = await deleteQuery;
  if (erroDelete) {
    mostrarToast("Erro ao atualizar chamada.", "erro");
    return;
  }

  const registros = lista.map(aluno => {
    const turmaNome = nomeTurmaAluno(aluno);
    const turmaObj = aluno.turma_id
      ? (turmasCadastradas || []).find(t => String(t.id) === String(aluno.turma_id))
      : (typeof encontrarTurmaPorNome === "function" ? encontrarTurmaPorNome(turmaNome) : null);

    return {
      user_id: usuarioAtual.id,
      aluno_id: aluno.id,
      data_aula: data,
      turma: turmaNome,
      turma_id: turmaObj ? turmaObj.id : null,
      presente: presencaMarcacoes.get(String(aluno.id)) === true
    };
  });

  const { error } = await supabaseClient.from("presencas").insert(registros);
  if (error) {
    mostrarToast("Erro ao salvar chamada.", "erro");
    return;
  }

  mostrarToast("Chamada salva com sucesso!");
  await carregarMarcacoesPresenca();
  renderizarListaPresencas();
}

async function registrarPresencaAluno(id, presente) {
  // Mantido como compatibilidade para chamadas antigas, mas a rotina principal agora é a aba Presenças.
  if (!usuarioAtual) return;
  const aluno = alunos.find(a => String(a.id) === String(id));
  const hoje = dataLocalISO();
  const turmaNome = aluno ? nomeTurmaAluno(aluno) : null;
  const turmaObj = aluno && aluno.turma_id
    ? (turmasCadastradas || []).find(t => String(t.id) === String(aluno.turma_id))
    : (typeof encontrarTurmaPorNome === "function" ? encontrarTurmaPorNome(turmaNome) : null);

  const { error } = await supabaseClient.from("presencas").insert({
    aluno_id: id,
    user_id: usuarioAtual.id,
    data_aula: hoje,
    turma: turmaNome,
    turma_id: turmaObj ? turmaObj.id : null,
    presente: presente === true
  });
  if (error) {
    mostrarToast("Erro ao registrar presença.", "erro");
    return;
  }
  mostrarToast("Presença registrada!");
}


function avisoTipoTexto(tipo) {
  const mapa = {
    comunicado: "📢 Comunicado",
    importante: "⚠️ Importante",
    graduacao: "🥋 Graduação",
    aula: "📅 Aula / horário",
    financeiro: "💰 Financeiro"
  };
  return mapa[tipo] || "📢 Comunicado";
}

function escaparTextoSeguro(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function carregarAvisos() {
  if (!listaAvisos || !usuarioAtual) return;
  const { data, error } = await supabaseClient
    .from("avisos")
    .select("id,titulo,turma,mensagem,tipo,prioridade,ativo,created_at,user_id")
    .eq("user_id", usuarioAtual.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.log("Erro ao carregar avisos:", error.message);
    listaAvisos.innerHTML = `<div class="empty-state-mini">Não foi possível carregar os avisos.</div>`;
    return;
  }

  if (!data || data.length === 0) {
    listaAvisos.innerHTML = `<div class="empty-state-mini">Nenhum aviso cadastrado ainda.</div>`;
    return;
  }

  listaAvisos.innerHTML = data.map(aviso => {
    const titulo = escaparTextoSeguro(aviso.titulo);
    const mensagem = escaparTextoSeguro(aviso.mensagem);
    const destino = aviso.turma ? `Destino: ${escaparTextoSeguro(aviso.turma)}` : "Destino: Todos os alunos";
    const tipo = avisoTipoTexto(aviso.tipo);
    const importante = aviso.prioridade === "importante" || aviso.tipo === "importante";
    return `
      <div class="evolucao-item aviso-item ${importante ? 'aviso-importante' : ''}">
        <div>
          <span class="mini-badge">${tipo}</span>
          <strong>${titulo}</strong>
          <span>${destino}</span>
          <small>${mensagem}</small>
        </div>
        <button type="button" class="acao-secundaria" onclick="copiarAviso('${aviso.id}')">Copiar</button>
      </div>
    `;
  }).join("");
}

async function copiarAviso(id) {
  const { data } = await supabaseClient.from("avisos").select("titulo, turma, mensagem").eq("id", id).single();
  if (!data) return;
  const texto = `${data.titulo}${data.turma ? " - " + data.turma : ""}\n\n${data.mensagem}`;
  try {
    await navigator.clipboard.writeText(texto);
    mostrarToast("Aviso copiado!");
  } catch (erro) {
    mostrarToast("Não foi possível copiar o aviso.", "erro");
  }
}

async function salvarAviso(event) {
  event.preventDefault();
  if (!usuarioAtual) return;
  const titulo = avisoTitulo ? avisoTitulo.value.trim() : "";
  const turma = avisoTurma ? avisoTurma.value.trim() : "";
  const mensagem = avisoMensagem ? avisoMensagem.value.trim() : "";
  const tipo = document.getElementById("avisoTipo")?.value || "comunicado";
  const prioridade = document.getElementById("avisoPrioridade")?.value || "normal";

  if (!titulo || !mensagem) {
    if (msgAviso) msgAviso.textContent = "Preencha título e mensagem.";
    return;
  }

  const { error } = await supabaseClient.from("avisos").insert({
    user_id: usuarioAtual.id,
    titulo,
    turma: turma || null,
    mensagem,
    tipo,
    prioridade,
    ativo: true
  });

  if (error) {
    if (msgAviso) msgAviso.textContent = "Erro ao salvar aviso.";
    console.error(error);
    return;
  }

  if (formAviso) formAviso.reset();
  if (msgAviso) msgAviso.textContent = "Aviso salvo com sucesso.";
  await carregarAvisos();
}

document.querySelectorAll(".filtro-evolucao").forEach(botao => {
  botao.addEventListener("click", () => {
    filtroEvolucaoAtual = botao.dataset.evolucaoFiltro || "todos";
    document.querySelectorAll(".filtro-evolucao").forEach(b => b.classList.remove("ativo"));
    botao.classList.add("ativo");
    renderizarEvolucao();
  });
});

if (btnFecharModalGraduacao) btnFecharModalGraduacao.addEventListener("click", () => modalGraduacao.classList.add("escondido"));
if (btnCancelarGraduacao) btnCancelarGraduacao.addEventListener("click", () => modalGraduacao.classList.add("escondido"));
if (btnSalvarGraduacao) btnSalvarGraduacao.addEventListener("click", salvarGraduacao);

if (presencaData) presencaData.addEventListener("change", prepararTelaPresencas);
if (presencaTurma) presencaTurma.addEventListener("change", prepararTelaPresencas);
if (btnAtualizarChamada) btnAtualizarChamada.addEventListener("click", prepararTelaPresencas);
if (btnMarcarTodosPresentes) btnMarcarTodosPresentes.addEventListener("click", () => marcarTodosPresencas(true));
if (btnLimparChamada) btnLimparChamada.addEventListener("click", () => marcarTodosPresencas(false));
if (btnSalvarChamada) btnSalvarChamada.addEventListener("click", salvarChamadaPresenca);
if (formAviso) formAviso.addEventListener("submit", salvarAviso);


// inicializarNavegacaoPrincipal() agora é chamado em js/99-app.js.


// API global controlada para módulos auxiliares e debug sem espalhar variáveis.
window.MensalizeApp = {
  get estado() { sincronizarEstado(); return estado; },
  carregarAlunos,
  carregarUltimosPagamentos,
  atualizarPainel,
  carregarGrafico,
  mostrarToast,
  supabaseClient,
  aplicarFiltroUsuario,
  executarQuery
};
