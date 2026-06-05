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
  // Frequência detalhada fica na aba Graduação, para não poluir a listagem.
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
  await carregarRankingDashboard();
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
  const turmasAtivasIds = new Set((turmasCadastradas || []).filter(turma => turma.ativa !== false).map(turma => String(turma.id)));

  if (turmaSelecionada === "todas") {
    return alunosAtivosParaChamada().filter(aluno => aluno.turma_id && turmasAtivasIds.has(String(aluno.turma_id)));
  }

  const turmaObj = typeof encontrarTurmaPorNome === "function" ? encontrarTurmaPorNome(turmaSelecionada) : null;
  if (!turmaObj) return [];

  return alunosAtivosParaChamada().filter(aluno => String(aluno.turma_id || "") === String(turmaObj.id));
}

function atualizarResumoChamada() {
  const lista = alunosFiltradosPresenca();
  const presentes = lista.filter(aluno => presencaMarcacoes.get(String(aluno.id)) === true).length;
  const total = lista.length;
  if (presencaTotalPresentes) presencaTotalPresentes.textContent = presentes;
  if (presencaTotalFaltas) presencaTotalFaltas.textContent = Math.max(total - presentes, 0);
  if (presencaTotalAlunos) presencaTotalAlunos.textContent = total;
}

let presencaChamadaJaSalva = false;
let presencaChamadasSalvasPorTurma = new Set();

function obterTurmaCadastradaParaChamada(turmaNome) {
  if (!turmaNome || turmaNome === "todas") return null;

  if (typeof encontrarTurmaPorNome === "function") {
    const turma = encontrarTurmaPorNome(turmaNome);
    if (turma) return turma;
  }

  return (turmasCadastradas || []).find(turma =>
    normalizarTextoTurma(turma.nome) === normalizarTextoTurma(turmaNome)
  ) || null;
}

function validarDiaAulaTurma(turmaNome, dataISO) {
  if (!turmaNome || turmaNome === "todas") {
    return {
      valida: true,
      temCalendario: false,
      mensagem: ""
    };
  }

  const turma = obterTurmaCadastradaParaChamada(turmaNome);

  if (!turma || !Array.isArray(turma.dias_semana) || turma.dias_semana.length === 0) {
    return {
      valida: false,
      temCalendario: false,
      mensagem: "Essa turma ainda não tem dias de aula cadastrados. Complete o cadastro da turma antes de salvar chamada."
    };
  }

  const diaData = typeof diaDaSemanaDataISO === "function"
    ? diaDaSemanaDataISO(dataISO)
    : null;

  if (diaData === null) {
    return {
      valida: false,
      temCalendario: true,
      mensagem: "Data inválida. Confira a data da chamada antes de salvar."
    };
  }

  const diasPermitidos = new Set(
    turma.dias_semana
      .map(dia => typeof normalizarDiaSemanaParaNumero === "function" ? normalizarDiaSemanaParaNumero(dia) : Number(dia))
      .filter(dia => dia !== null && Number.isInteger(dia))
  );

  const valida = diasPermitidos.has(diaData);

  return {
    valida,
    temCalendario: true,
    mensagem: valida
      ? ""
      : `Essa turma não tem aula neste dia. Dias cadastrados: ${typeof diasSemanaTexto === "function" ? diasSemanaTexto(turma.dias_semana) : "verifique o cadastro da turma"}.`
  };
}

function obterStatusFrequenciaChamada(aluno) {
  if (typeof calcularFrequenciaAluno !== "function") {
    return {
      classe: "frequencia-neutra-card",
      nivel: "neutra"
    };
  }

  const frequencia = calcularFrequenciaAluno(aluno);
  const percentual = frequencia && frequencia.percentual !== null && frequencia.percentual !== undefined
    ? Number(frequencia.percentual)
    : null;

  const minimo = Number(frequencia && frequencia.minimo ? frequencia.minimo : (presencaMinimaPercentual || 70));

  if (percentual === null || !Number.isFinite(percentual)) {
    return {
      classe: "frequencia-neutra-card",
      nivel: "neutra"
    };
  }

  if (percentual < minimo) {
    return {
      classe: "frequencia-baixa-card",
      nivel: "baixa"
    };
  }

  if (percentual <= minimo + 10) {
    return {
      classe: "frequencia-limite-card",
      nivel: "limite"
    };
  }

  return {
    classe: "frequencia-ok-card",
    nivel: "ok"
  };
}


let presencaCheckinAtual = null;

function gerarCodigoCheckin(tamanho = 12) {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const valores = new Uint32Array(tamanho);
  crypto.getRandomValues(valores);
  return Array.from(valores).map(valor => alfabeto[valor % alfabeto.length]).join("");
}

function fimDoDiaLocalISO(dataISO) {
  const partes = String(dataISO || "").split("-");
  if (partes.length !== 3) return new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

  const data = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]), 23, 59, 59, 999);
  return data.toISOString();
}

function formatarHoraCheckin(valor) {
  if (!valor) return "--:--";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "--:--";
  return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function montarUrlCheckinAluno(codigo) {
  const base = window.location.origin || "";
  return `${base}/aluno.html?checkin=${encodeURIComponent(codigo)}`;
}

function montarUrlQrCodeCheckin(url) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(url)}`;
}

function obterContextoCheckinPresenca() {
  const turmaNome = presencaTurma ? (presencaTurma.value || "todas") : "todas";
  const data = presencaData ? (presencaData.value || dataLocalISO()) : dataLocalISO();
  const turma = turmaNome !== "todas" ? obterTurmaCadastradaParaChamada(turmaNome) : null;

  return { turmaNome, data, turma };
}

function obterContainerCheckinPresenca() {
  let card = document.getElementById("presencaCheckinCard");
  if (card) return card;

  card = document.createElement("div");
  card.id = "presencaCheckinCard";
  card.className = "presenca-checkin-card";

  const lista = document.getElementById("listaPresencas");
  if (lista && lista.parentNode) {
    lista.parentNode.insertBefore(card, lista);
  }

  return card;
}

function renderizarCheckinPresenca() {
  const card = obterContainerCheckinPresenca();
  if (!card) return;

  const { turmaNome, data, turma } = obterContextoCheckinPresenca();

  if (turmaNome === "todas") {
    card.classList.add("escondido");
    card.innerHTML = "";
    return;
  }

  card.classList.remove("escondido");

  if (!turma || !turma.id) {
    card.innerHTML = `
      <div class="presenca-checkin-info">
        <span class="page-eyebrow">Check-in por QR Code</span>
        <h3>Turma incompleta</h3>
        <p>Para gerar QR Code, essa turma precisa existir no cadastro de turmas.</p>
      </div>
    `;
    return;
  }

  const hoje = dataLocalISO();
  const validacaoDia = validarDiaAulaTurma(turmaNome, data);
  const podeGerar = data === hoje && validacaoDia.valida;
  const sessaoAtiva = presencaCheckinAtual && presencaCheckinAtual.ativa === true && new Date(presencaCheckinAtual.expira_em) > new Date();
  const url = sessaoAtiva ? montarUrlCheckinAluno(presencaCheckinAtual.codigo) : "";
  const qrUrl = url ? montarUrlQrCodeCheckin(url) : "";

  card.innerHTML = `
    <div class="presenca-checkin-topo">
      <div class="presenca-checkin-info">
        <span class="page-eyebrow">Check-in por QR Code</span>
        <h3>Aluno confirma presença pelo celular</h3>
        <p>${sessaoAtiva
          ? `QR ativo até ${formatarHoraCheckin(presencaCheckinAtual.expira_em)}. Mostre o QR para os alunos escanearem.`
          : "Gere um QR Code para os alunos confirmarem presença sem o professor marcar um por um."}</p>
      </div>
      <div class="presenca-checkin-acoes">
        <button type="button" id="btnGerarCheckinPresenca" class="acao-principal" ${podeGerar ? "" : "disabled"}>${sessaoAtiva ? "Renovar check-in" : "Gerar check-in"}</button>
        ${sessaoAtiva ? `<button type="button" id="btnEncerrarCheckinPresenca" class="acao-secundaria">Encerrar</button>` : ""}
      </div>
    </div>

    ${!podeGerar ? `
      <div class="presenca-checkin-alerta">
        ${data !== hoje
          ? "O check-in por QR Code só pode ser gerado para a aula de hoje."
          : escaparTextoSeguro(validacaoDia.mensagem || "Confira o cadastro da turma antes de gerar o check-in.")}
      </div>
    ` : ""}

    ${sessaoAtiva ? `
      <div class="presenca-checkin-qr-grid">
        <div class="presenca-checkin-qr-box">
          <img src="${qrUrl}" alt="QR Code do check-in da aula">
        </div>
        <div class="presenca-checkin-detalhes">
          <strong>${escaparTextoSeguro(turmaNome)}</strong>
          <span>Válido até o fim do dia: ${formatarHoraCheckin(presencaCheckinAtual.expira_em)}</span>
          <small>Código: ${escaparTextoSeguro(presencaCheckinAtual.codigo)}</small>
          <div class="presenca-checkin-link">${escaparTextoSeguro(url)}</div>
          <div class="presenca-checkin-botoes">
            <button type="button" id="btnCopiarLinkCheckin" class="acao-secundaria">Copiar link</button>
            <button type="button" id="btnAtualizarCheckinChamada" class="acao-secundaria">Atualizar chamada</button>
          </div>
        </div>
      </div>
    ` : ""}
  `;

  const btnGerar = document.getElementById("btnGerarCheckinPresenca");
  if (btnGerar && podeGerar) btnGerar.addEventListener("click", gerarCheckinPresenca);

  const btnEncerrar = document.getElementById("btnEncerrarCheckinPresenca");
  if (btnEncerrar) btnEncerrar.addEventListener("click", encerrarCheckinPresenca);

  const btnCopiar = document.getElementById("btnCopiarLinkCheckin");
  if (btnCopiar && url) {
    btnCopiar.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(url);
        mostrarToast("Link do check-in copiado!");
      } catch (erro) {
        mostrarToast("Não foi possível copiar o link.", "erro");
      }
    });
  }

  const btnAtualizar = document.getElementById("btnAtualizarCheckinChamada");
  if (btnAtualizar) btnAtualizar.addEventListener("click", prepararTelaPresencas);
}

async function carregarSessaoCheckinPresenca() {
  presencaCheckinAtual = null;

  if (!usuarioAtual) {
    renderizarCheckinPresenca();
    return;
  }

  const { turmaNome, data, turma } = obterContextoCheckinPresenca();
  if (turmaNome === "todas" || !turma || !turma.id) {
    renderizarCheckinPresenca();
    return;
  }

  const { data: sessao, error } = await supabaseClient
    .from("sessoes_chamada")
    .select("id,user_id,turma_id,data_aula,codigo,expira_em,ativa,created_at,updated_at")
    .eq("user_id", usuarioAtual.id)
    .eq("turma_id", turma.id)
    .eq("data_aula", data)
    .maybeSingle();

  if (error) {
    console.log("Erro ao carregar sessão de check-in:", error.message);
    renderizarCheckinPresenca();
    return;
  }

  presencaCheckinAtual = sessao || null;
  renderizarCheckinPresenca();
}

async function gerarCheckinPresenca() {
  if (!usuarioAtual) return;

  const { turmaNome, data, turma } = obterContextoCheckinPresenca();
  const hoje = dataLocalISO();

  if (turmaNome === "todas") {
    mostrarToast("Selecione uma turma específica para gerar check-in.", "erro");
    return;
  }

  if (data !== hoje) {
    mostrarToast("O QR Code só pode ser gerado para a aula de hoje.", "erro");
    return;
  }

  if (!turma || !turma.id) {
    mostrarToast("Turma não encontrada no cadastro.", "erro");
    return;
  }

  const validacaoDia = validarDiaAulaTurma(turmaNome, data);
  if (!validacaoDia.valida) {
    mostrarToast(validacaoDia.mensagem || "Confira os dias da turma antes de gerar o check-in.", "erro");
    return;
  }

  if (typeof aulaCanceladaPara === "function" && aulaCanceladaPara(turmaNome, data)) {
    mostrarToast("Esta aula foi cancelada. Não é possível gerar check-in.", "erro");
    return;
  }

  const codigo = gerarCodigoCheckin(12);
  const expiraEm = fimDoDiaLocalISO(data);
  const agora = new Date().toISOString();

  const { data: sessao, error } = await supabaseClient
    .from("sessoes_chamada")
    .upsert({
      user_id: usuarioAtual.id,
      turma_id: turma.id,
      data_aula: data,
      codigo,
      expira_em: expiraEm,
      ativa: true,
      updated_at: agora
    }, { onConflict: "turma_id,data_aula" })
    .select("id,user_id,turma_id,data_aula,codigo,expira_em,ativa,created_at,updated_at")
    .single();

  if (error) {
    console.log("Erro ao gerar check-in:", error.message);
    mostrarToast("Erro ao gerar check-in.", "erro");
    return;
  }

  presencaCheckinAtual = sessao;
  renderizarCheckinPresenca();
  mostrarToast("Check-in gerado com sucesso!");
}

async function encerrarCheckinPresenca() {
  if (!usuarioAtual || !presencaCheckinAtual) return;

  const { error } = await supabaseClient
    .from("sessoes_chamada")
    .update({ ativa: false, updated_at: new Date().toISOString() })
    .eq("id", presencaCheckinAtual.id)
    .eq("user_id", usuarioAtual.id);

  if (error) {
    mostrarToast("Erro ao encerrar check-in.", "erro");
    return;
  }

  presencaCheckinAtual = { ...presencaCheckinAtual, ativa: false };
  renderizarCheckinPresenca();
  mostrarToast("Check-in encerrado.");
}


function obterTurmasParaSelecaoChamada() {
  const alunosAtivos = alunosAtivosParaChamada();

  // A chamada deve nascer somente das turmas realmente cadastradas em Turmas.
  // Não usamos mais aluno.turma para criar cards, porque isso criava "turmas fantasma"
  // quando uma solicitação ou cadastro digitava um texto livre como "manha" ou "noite".
  return (turmasCadastradas || [])
    .filter(turma => turma.ativa !== false)
    .slice()
    .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"))
    .map(turma => {
      const alunosTurma = alunosAtivos.filter(aluno => String(aluno.turma_id || "") === String(turma.id));
      return {
        id: turma.id,
        nome: turma.nome,
        total: alunosTurma.length,
        chamadaSalva: presencaChamadasSalvasPorTurma.has(String(turma.id))
      };
    });
}

function abrirTurmaParaChamada(turmaNome) {
  if (!presencaTurma || !turmaNome) return;

  const existe = [...presencaTurma.options].some(option => option.value === turmaNome);
  if (!existe) {
    mostrarToast("Turma não encontrada na lista de chamada.", "erro");
    return;
  }

  presencaTurma.value = turmaNome;
  prepararTelaPresencas();
}

function renderizarSelecaoTurmasPresenca(data) {
  const turmas = obterTurmasParaSelecaoChamada();

  if (presencaTotalPresentes) presencaTotalPresentes.textContent = "--";
  if (presencaTotalFaltas) presencaTotalFaltas.textContent = "--";
  if (presencaTotalAlunos) presencaTotalAlunos.textContent = String(turmas.length);

  if (!turmas.length) {
    listaPresencas.innerHTML = `<div class="empty-state-mini">Nenhuma turma ativa encontrada. Cadastre uma turma antes de fazer chamada.</div>`;
    return;
  }

  listaPresencas.innerHTML = `
    <div class="presenca-status-chamada nova">
      <strong>Escolha uma turma</strong>
      <span>Primeiro selecione a turma. Depois o Mensalize abre os alunos dessa turma para fazer a chamada.</span>
    </div>

    <div class="presenca-turmas-selecao">
      ${turmas.map(turma => {
        const validacao = validarDiaAulaTurma(turma.nome, data);
        const statusClasse = turma.chamadaSalva ? "salva" : (!validacao.valida ? "aviso" : "nova");
        const statusTexto = turma.chamadaSalva
          ? "✓ Chamada salva"
          : (!validacao.valida ? "Ajuste necessário" : "Abrir chamada");

        return `
          <button type="button" class="presenca-turma-selecao-card ${statusClasse}" data-abrir-turma-chamada="${escaparTextoSeguro(turma.nome)}">
            <span class="presenca-turma-selecao-info">
              <strong>${escaparTextoSeguro(turma.nome)}</strong>
              <small>${turma.total} aluno${turma.total === 1 ? "" : "s"}${validacao.valida ? "" : " • " + escaparTextoSeguro(validacao.mensagem)}</small>
            </span>
            <em>${statusTexto}</em>
          </button>
        `;
      }).join("")}
    </div>
  `;

  listaPresencas.querySelectorAll("[data-abrir-turma-chamada]").forEach(botao => {
    botao.addEventListener("click", () => {
      abrirTurmaParaChamada(botao.dataset.abrirTurmaChamada || "");
    });
  });
}

async function carregarMarcacoesPresenca() {
  presencaMarcacoes = new Map();
  presencaChamadaJaSalva = false;
  presencaChamadasSalvasPorTurma = new Set();

  if (!usuarioAtual || !presencaData) return;

  const data = presencaData.value || dataLocalISO();
  const turmaSelecionada = presencaTurma ? (presencaTurma.value || "todas") : "todas";
  const listaAtual = alunosFiltradosPresenca();
  const idsAlunosTela = new Set(listaAtual.map(aluno => String(aluno.id)));

  let query = supabaseClient
    .from("presencas")
    .select("aluno_id, turma, turma_id, presente")
    .eq("user_id", usuarioAtual.id)
    .eq("data_aula", data);

  if (turmaSelecionada !== "todas") {
    const turmaSelecionadaObj = typeof encontrarTurmaPorNome === "function" ? encontrarTurmaPorNome(turmaSelecionada) : null;
    if (turmaSelecionadaObj) {
      query = query.eq("turma_id", turmaSelecionadaObj.id);
    } else {
      query = query.eq("turma", turmaSelecionada);
    }
  }

  const { data: registros, error } = await query;

  if (error) {
    console.log("Erro ao carregar presenças:", error.message);
    return;
  }

  (registros || []).forEach(registro => {
    if (registro.turma_id) {
      presencaChamadasSalvasPorTurma.add(String(registro.turma_id));
    } else {
      const turmaRegistro = String(registro.turma || "").trim();
      if (turmaRegistro) presencaChamadasSalvasPorTurma.add(normalizarTextoTurma(turmaRegistro));
    }

    presencaMarcacoes.set(String(registro.aluno_id), registro.presente === true);

    if (idsAlunosTela.has(String(registro.aluno_id))) {
      presencaChamadaJaSalva = true;
    }
  });

  // Se ainda não existe chamada salva para essa data/turma,
  // a chamada começa com todos presentes. O professor só desmarca quem faltou.
  if (turmaSelecionada !== "todas" && !presencaChamadaJaSalva) {
    listaAtual.forEach(aluno => {
      presencaMarcacoes.set(String(aluno.id), true);
    });
  }
}

function resumoFrequenciaParaChamada(aluno) {
  const turma = typeof nomeTurmaAluno === "function" ? nomeTurmaAluno(aluno) : (aluno && aluno.turma ? aluno.turma : "Sem turma");

  if (typeof calcularFrequenciaAluno !== "function") {
    return `<div class="presenca-aluno-detalhes"><span class="presenca-aluno-meta">${turma}</span></div>`;
  }

  const frequencia = calcularFrequenciaAluno(aluno);
  const percentual = frequencia && frequencia.percentual !== null && frequencia.percentual !== undefined
    ? Number(frequencia.percentual)
    : null;
  const minimo = Number(frequencia && frequencia.minimo ? frequencia.minimo : (presencaMinimaPercentual || 70));

  if (percentual === null || !Number.isFinite(percentual)) {
    return `
      <div class="presenca-aluno-detalhes">
        <span class="presenca-aluno-meta">${turma}</span>
        <span class="frequencia-chamada-badge neutra">Sem frequência calculada</span>
      </div>
    `;
  }

  const classe = percentual < minimo
    ? "baixa"
    : percentual <= minimo + 10
      ? "limite"
      : "ok";

  const textoBadge = percentual < minimo
    ? `Abaixo do mínimo • ${percentual}%`
    : `Frequência ${percentual}%`;

  return `
    <div class="presenca-aluno-detalhes">
      <span class="presenca-aluno-meta">${turma}</span>
      <span class="frequencia-chamada-badge ${classe}">${textoBadge}</span>
      <span class="presenca-aluno-frequencia-detalhe">${frequencia.presencas}/${frequencia.aulasValidas} aulas válidas • mínimo ${minimo}%</span>
    </div>
  `;
}

function renderizarListaPresencas() {
  if (!listaPresencas) return;

  const data = presencaData ? (presencaData.value || dataLocalISO()) : dataLocalISO();
  const turmaSelecionada = presencaTurma ? presencaTurma.value : "todas";
  const validacaoDia = validarDiaAulaTurma(turmaSelecionada, data);

  if (turmaSelecionada === "todas") {
    renderizarSelecaoTurmasPresenca(data);
    renderizarHistoricoChamadas();
    return;
  }

  if (turmaSelecionada !== "todas" && typeof aulaCanceladaPara === "function") {
    const aulaCancelada = aulaCanceladaPara(turmaSelecionada, data);
    if (aulaCancelada) {
      if (presencaTotalPresentes) presencaTotalPresentes.textContent = "0";
      if (presencaTotalFaltas) presencaTotalFaltas.textContent = "0";
      if (presencaTotalAlunos) presencaTotalAlunos.textContent = "0";
      listaPresencas.innerHTML = `<div class="empty-state-mini aula-cancelada-box"><strong>Aula cancelada em ${formatarData(data)}</strong><br>${aulaCancelada.motivo || "Aula cancelada"}. Esta aula não entra no cálculo de frequência para evolução.</div>`;
      return;
    }
  }

  const lista = alunosFiltradosPresenca();
  atualizarResumoChamada();

  if (lista.length === 0) {
    listaPresencas.innerHTML = `<div class="empty-state-mini">Nenhum aluno encontrado para esta turma.</div>`;
    return;
  }

  const avisosTopo = [];

  if (presencaChamadaJaSalva) {
    avisosTopo.push(`
      <div class="presenca-status-chamada salva">
        <strong>✓ Chamada salva</strong>
        <span>Já existem registros para esta data/turma. Ao salvar novamente, a chamada será atualizada.</span>
      </div>
    `);
  } else {
    avisosTopo.push(`
      <div class="presenca-status-chamada nova">
        <strong>Chamada nova</strong>
        <span>Todos começaram marcados como presentes. Desmarque somente quem faltou.</span>
      </div>
    `);
  }

  if (turmaSelecionada === "todas") {
    avisosTopo.push(`
      <div class="presenca-status-chamada aviso">
        <strong>Visualização geral</strong>
        <span>Para salvar a chamada, selecione uma turma específica. Isso evita salvar presença de várias turmas sem querer.</span>
      </div>
    `);
  }

  if (turmaSelecionada !== "todas" && validacaoDia.mensagem) {
    avisosTopo.push(`
      <div class="presenca-status-chamada ${validacaoDia.valida ? "info" : "aviso"}">
        <strong>${validacaoDia.valida ? "Calendário da turma" : "Atenção ao dia da aula"}</strong>
        <span>${validacaoDia.mensagem}</span>
      </div>
    `);
  }

  const grupos = lista.reduce((acc, aluno) => {
    const turma = nomeTurmaAluno(aluno);
    if (!acc[turma]) acc[turma] = [];
    acc[turma].push(aluno);
    return acc;
  }, {});

  listaPresencas.innerHTML = `
    ${avisosTopo.join("")}

    ${Object.entries(grupos).map(([turma, alunosTurma]) => `
      <div class="presenca-turma-card">
        <div class="presenca-turma-topo">
          <strong>${turma}</strong>
          <span>${alunosTurma.length} aluno${alunosTurma.length === 1 ? "" : "s"}</span>
        </div>
        <div class="presenca-alunos">
          ${alunosTurma.map(aluno => {
            const marcado = presencaMarcacoes.get(String(aluno.id)) === true;
            const statusFrequencia = obterStatusFrequenciaChamada(aluno);

            return `
              <label class="presenca-aluno-item ${marcado ? "presente" : "faltou"} ${statusFrequencia.classe}">
                <input type="checkbox" data-presenca-aluno="${aluno.id}" ${marcado ? "checked" : ""}>
                <div>
                  <strong>${aluno.nome}</strong>
                  ${resumoFrequenciaParaChamada(aluno)}
                </div>
                <em>${marcado ? "Presente" : "Faltou"}</em>
              </label>
            `;
          }).join("")}
        </div>
      </div>
    `).join("")}
  `;

  listaPresencas.querySelectorAll("[data-presenca-aluno]").forEach(input => {
    input.addEventListener("change", () => {
      const item = input.closest(".presenca-aluno-item");

      presencaMarcacoes.set(String(input.dataset.presencaAluno), input.checked === true);

      item?.classList.toggle("presente", input.checked === true);
      item?.classList.toggle("faltou", input.checked !== true);

      const status = item?.querySelector("em");
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
  renderizarHistoricoChamadas();
  await carregarSessaoCheckinPresenca();
}

function marcarTodosPresencas(valor) {
  alunosFiltradosPresenca().forEach(aluno => {
    presencaMarcacoes.set(String(aluno.id), valor === true);
  });
  renderizarListaPresencas();
}


function criarResumoHistoricoChamada(grupo) {
  if (!grupo) return "";

  if (grupo.cancelada) {
    return grupo.motivo
      ? `Aula cancelada • ${grupo.motivo}`
      : "Aula cancelada";
  }

  const total = grupo.total || 0;
  const presentes = grupo.presentes || 0;
  const faltas = Math.max(total - presentes, 0);
  const percentual = total > 0 ? Math.round((presentes / total) * 100) : 0;

  return `${presentes} presente${presentes === 1 ? "" : "s"} • ${faltas} falta${faltas === 1 ? "" : "s"} • ${percentual}% de presença`;
}

function montarHistoricoChamadas() {
  const mapa = new Map();
  const turmaSelecionada = presencaTurma ? (presencaTurma.value || "todas") : "todas";
  const filtrarTurma = turmaSelecionada !== "todas";
  const turmaSelecionadaNorm = normalizarTextoTurma(turmaSelecionada);

  (presencasPeriodo || []).forEach(registro => {
    if (!registro || !registro.data_aula) return;

    const turmaNome = registro.turma || "Sem turma";
    const turmaNorm = normalizarTextoTurma(turmaNome);

    if (filtrarTurma && turmaNorm !== turmaSelecionadaNorm) return;

    const chave = `${registro.data_aula}|${turmaNorm}`;

    if (!mapa.has(chave)) {
      mapa.set(chave, {
        data: registro.data_aula,
        turma: turmaNome,
        alunos: new Map(),
        cancelada: false,
        motivo: ""
      });
    }

    const grupo = mapa.get(chave);
    grupo.alunos.set(String(registro.aluno_id), registro.presente === true);
  });

  (aulasCanceladas || []).forEach(aula => {
    if (!aula || !aula.data_aula) return;

    const turmaNome = typeof turmaDaAulaCancelada === "function" ? turmaDaAulaCancelada(aula) : (aula.turma || "Turma");
    const turmaNorm = normalizarTextoTurma(turmaNome);

    if (filtrarTurma && turmaNorm !== turmaSelecionadaNorm) return;

    const chave = `${aula.data_aula}|${turmaNorm}`;

    if (!mapa.has(chave)) {
      mapa.set(chave, {
        data: aula.data_aula,
        turma: turmaNome || "Turma",
        alunos: new Map(),
        cancelada: true,
        motivo: aula.motivo || aula.observacao || ""
      });
      return;
    }

    const grupo = mapa.get(chave);
    grupo.cancelada = true;
    grupo.motivo = aula.motivo || aula.observacao || grupo.motivo || "";
  });

  return [...mapa.values()].map(grupo => {
    const valores = [...grupo.alunos.values()];
    grupo.total = valores.length;
    grupo.presentes = valores.filter(Boolean).length;
    grupo.percentual = grupo.total > 0 ? Math.round((grupo.presentes / grupo.total) * 100) : null;
    return grupo;
  }).sort((a, b) => {
    const porData = String(b.data).localeCompare(String(a.data));
    if (porData !== 0) return porData;
    return String(a.turma).localeCompare(String(b.turma), "pt-BR");
  });
}

function renderizarHistoricoChamadas() {
  const container = document.getElementById("historicoChamadas");
  const contador = document.getElementById("historicoChamadasContador");
  if (!container) return;

  const historico = montarHistoricoChamadas();
  const total = historico.length;

  if (contador) {
    contador.textContent = `${total} chamada${total === 1 ? "" : "s"}`;
  }

  if (!total) {
    container.innerHTML = `<div class="empty-state-mini">Nenhuma chamada salva neste período.</div>`;
    return;
  }

  const limite = 8;
  const visiveis = historico.slice(0, limite);
  const extras = Math.max(total - limite, 0);

  container.innerHTML = `
    ${visiveis.map(grupo => `
      <article class="historico-chamada-item ${grupo.cancelada ? "cancelada" : ""}">
        <div class="historico-chamada-info">
          <strong>${grupo.turma || "Turma"}</strong>
          <span>${formatarData(grupo.data)}</span>
          <small>${criarResumoHistoricoChamada(grupo)}</small>
        </div>
        <div class="historico-chamada-meta">
          ${grupo.cancelada
            ? `<span class="historico-status cancelada">Cancelada</span>`
            : `<span class="historico-status">${grupo.percentual ?? 0}%</span>`}
          <button type="button" class="acao-secundaria" data-historico-data="${grupo.data}" data-historico-turma="${escaparTextoSeguro(grupo.turma || "")}">Reabrir chamada</button>
        </div>
      </article>
    `).join("")}
    ${extras > 0 ? `<div class="historico-chamadas-extra">+${extras} chamada${extras === 1 ? "" : "s"} no período. Use o filtro de turma para refinar.</div>` : ""}
  `;

  container.querySelectorAll("[data-historico-data]").forEach(botao => {
    botao.addEventListener("click", () => {
      abrirChamadaHistorico(botao.dataset.historicoData, botao.dataset.historicoTurma || "");
    });
  });
}

async function abrirChamadaHistorico(dataISO, turmaNome) {
  if (typeof abrirViewPrincipal === "function") {
    abrirViewPrincipal("presencas");
  }

  if (presencaData) presencaData.value = dataISO || dataLocalISO();

  if (presencaTurma) {
    preencherTurmasPresenca();

    const turma = String(turmaNome || "").trim();
    if (turma && [...presencaTurma.options].some(opt => opt.value === turma)) {
      presencaTurma.value = turma;
    } else {
      presencaTurma.value = "todas";
    }
  }

  await prepararTelaPresencas();

  const alvo = document.getElementById("listaPresencas") || document.getElementById("viewPresencas");
  if (alvo) alvo.scrollIntoView({ behavior: "smooth", block: "start" });
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

  if (turmaSelecionada === "todas") {
    mostrarToast("Selecione uma turma específica para salvar a chamada.", "erro");
    return;
  }

  const turmaSelecionadaObj = typeof encontrarTurmaPorNome === "function" ? encontrarTurmaPorNome(turmaSelecionada) : null;
  if (!turmaSelecionadaObj) {
    mostrarToast("Essa turma não está cadastrada em Turmas. Corrija o cadastro antes de salvar chamada.", "erro");
    return;
  }

  const validacaoDia = validarDiaAulaTurma(turmaSelecionada, data);
  if (!validacaoDia.valida) {
    mostrarToast(validacaoDia.mensagem || "Confira os dias de aula da turma antes de salvar.", "erro");
    return;
  }

  if (typeof aulaCanceladaPara === "function" && aulaCanceladaPara(turmaSelecionada, data)) {
    mostrarToast("Esta aula foi cancelada e não pode receber chamada.", "erro");
    return;
  }

  let deleteQuery = supabaseClient
    .from("presencas")
    .delete()
    .eq("user_id", usuarioAtual.id)
    .eq("data_aula", data);

  if (turmaSelecionada !== "todas") {
    deleteQuery = deleteQuery.eq("turma_id", turmaSelecionadaObj.id);
  }

  const { error: erroDelete } = await deleteQuery;
  if (erroDelete) {
    mostrarToast("Erro ao atualizar chamada.", "erro");
    return;
  }

  const registros = lista.map(aluno => {
    return {
      user_id: usuarioAtual.id,
      aluno_id: aluno.id,
      data_aula: data,
      turma: turmaSelecionadaObj.nome,
      turma_id: turmaSelecionadaObj.id,
      presente: presencaMarcacoes.get(String(aluno.id)) === true
    };
  });

  const { error } = await supabaseClient.from("presencas").insert(registros);
  if (error) {
    mostrarToast("Erro ao salvar chamada.", "erro");
    return;
  }

  mostrarToast("Chamada salva com sucesso!");
  if (typeof carregarDadosFrequencia === "function") await carregarDadosFrequencia();
  await carregarMarcacoesPresenca();
  renderizarListaPresencas();
  renderizarHistoricoChamadas();
  await carregarSessaoCheckinPresenca();
  if (typeof atualizarCentralNotificacoes === "function") atualizarCentralNotificacoes();
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
    .select("id,titulo,turma,mensagem,tipo,prioridade,ativo,data_inicio,data_fim,created_at,user_id")
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
    const hojeISO = new Date().toISOString().split("T")[0];
    const aindaNaoIniciou = aviso.data_inicio && aviso.data_inicio > hojeISO;
    const expirado = aviso.data_fim && aviso.data_fim < hojeISO;
    const statusPeriodo = expirado ? "Expirado" : aindaNaoIniciou ? "Agendado" : "Ativo";
    const periodo = `${aviso.data_inicio ? formatarData(aviso.data_inicio) : "Hoje"} até ${aviso.data_fim ? formatarData(aviso.data_fim) : "sem data final"}`;

    return `
      <div class="evolucao-item aviso-item ${importante ? 'aviso-importante' : ''} ${expirado ? 'aviso-expirado' : ''}">
        <div>
          <div class="aviso-badges-row">
            <span class="mini-badge">${tipo}</span>
            <span class="mini-badge ${expirado ? 'status-atrasado' : aindaNaoIniciou ? 'status-pendente' : 'status-ok'}">${statusPeriodo}</span>
          </div>
          <strong>${titulo}</strong>
          <span>${destino}</span>
          <small>${mensagem}</small>
          <small class="aviso-periodo">Período: ${periodo}</small>
        </div>
        <div class="aviso-acoes">
          <button type="button" class="acao-secundaria" onclick="copiarAviso('${aviso.id}')">Copiar</button>
          <button type="button" class="acao-perigo" onclick="removerAviso('${aviso.id}')">Apagar</button>
        </div>
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

async function removerAviso(id) {
  if (!usuarioAtual || !id) return;

  const confirmar = window.confirm("Apagar este aviso? Essa ação não pode ser desfeita.");
  if (!confirmar) return;

  const { error } = await supabaseClient
    .from("avisos")
    .delete()
    .eq("id", id)
    .eq("user_id", usuarioAtual.id);

  if (error) {
    console.error("Erro ao apagar aviso:", error.message);
    mostrarToast("Erro ao apagar aviso.", "erro");
    return;
  }

  mostrarToast("Aviso apagado com sucesso.");
  await carregarAvisos();
}

async function salvarAviso(event) {
  event.preventDefault();
  if (!usuarioAtual) return;
  const titulo = avisoTitulo ? avisoTitulo.value.trim() : "";
  const turma = avisoTurma ? avisoTurma.value.trim() : "";
  const mensagem = avisoMensagem ? avisoMensagem.value.trim() : "";
  const dataInicio = avisoDataInicio && avisoDataInicio.value ? avisoDataInicio.value : null;
  const dataFim = avisoDataFim && avisoDataFim.value ? avisoDataFim.value : null;
  const tipo = document.getElementById("avisoTipo")?.value || "comunicado";
  const prioridade = document.getElementById("avisoPrioridade")?.value || "normal";

  if (!titulo || !mensagem) {
    if (msgAviso) msgAviso.textContent = "Preencha título e mensagem.";
    return;
  }

  if (dataInicio && dataFim && dataFim < dataInicio) {
    if (msgAviso) msgAviso.textContent = "A data final não pode ser antes da data inicial.";
    mostrarToast("Confira o período do aviso.", "erro");
    return;
  }

  const { error } = await supabaseClient.from("avisos").insert({
    user_id: usuarioAtual.id,
    titulo,
    turma: turma || null,
    mensagem,
    tipo,
    prioridade,
    data_inicio: dataInicio,
    data_fim: dataFim,
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

let rankingProfessorAtual = "turma";

function obterPeriodoRankingMesAtualProfessor() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  return {
    inicio,
    fim,
    rotulo: hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  };
}

function dataISOProfessor(dataValor) {
  if (!dataValor) return "";
  return String(dataValor).split("T")[0];
}

function presencaPertenceMesAtualProfessor(presenca) {
  const dataTexto = dataISOProfessor(presenca?.data_aula);
  if (!dataTexto) return false;

  const partes = dataTexto.split("-");
  if (partes.length !== 3) return false;

  const data = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  if (Number.isNaN(data.getTime())) return false;

  const periodo = obterPeriodoRankingMesAtualProfessor();
  return data >= periodo.inicio && data <= periodo.fim;
}

function obterPresencasMesAtualProfessor() {
  return (presencasPeriodo || []).filter(presenca =>
    presenca &&
    presenca.presente === true &&
    presencaPertenceMesAtualProfessor(presenca)
  );
}

function obterTurmaAlunoProfessor(alunoId) {
  const aluno = (alunos || []).find(a => String(a.id) === String(alunoId));
  return aluno?.turma || "Sem turma";
}

function obterMapaAulasPorTurmaProfessor(presencasMes) {
  const mapa = new Map();

  (presencasMes || []).forEach(presenca => {
    const aluno = (alunos || []).find(a => String(a.id) === String(presenca.aluno_id));
    const turma = presenca.turma || aluno?.turma || "Sem turma";
    const data = dataISOProfessor(presenca.data_aula);

    if (!data) return;

    if (!mapa.has(turma)) mapa.set(turma, new Set());
    mapa.get(turma).add(data);
  });

  return mapa;
}

function obterPresencasUnicasPorAlunoProfessor(presencasMes) {
  const mapa = new Map();

  (presencasMes || []).forEach(presenca => {
    const alunoId = String(presenca.aluno_id);
    const data = dataISOProfessor(presenca.data_aula);
    if (!alunoId || !data) return;

    if (!mapa.has(alunoId)) mapa.set(alunoId, new Set());
    mapa.get(alunoId).add(data);
  });

  return mapa;
}

function calcularDadosRankingAlunoProfessor(aluno, presencasUnicas, aulasPorTurma) {
  const turma = aluno.turma || "Sem turma";
  const presencasSet = presencasUnicas.get(String(aluno.id)) || new Set();
  const presencas = presencasSet.size;
  const aulasValidas = Math.max((aulasPorTurma.get(turma) || new Set()).size, presencas, 0);
  const percentual = aulasValidas > 0 ? Math.round((presencas / aulasValidas) * 1000) / 10 : 0;

  return {
    id: aluno.id,
    nome: aluno.nome,
    turma,
    foto_url: aluno.foto_url || "",
    presencas,
    aulas_validas: aulasValidas,
    percentual,
    texto_detalhe: `${turma} • ${presencas}/${aulasValidas} aulas • ${String(percentual).replace(".", ",")}%`
  };
}

function obterRankingGeralProfessor() {
  const presencasMes = obterPresencasMesAtualProfessor();
  const presencasUnicas = obterPresencasUnicasPorAlunoProfessor(presencasMes);
  const aulasPorTurma = obterMapaAulasPorTurmaProfessor(presencasMes);

  return (alunos || [])
    .filter(aluno => String(aluno.status_aluno || "ativo").toLowerCase() !== "inativo")
    .map(aluno => calcularDadosRankingAlunoProfessor(aluno, presencasUnicas, aulasPorTurma))
    .filter(item => item.presencas > 0)
    .sort((a, b) =>
      b.percentual - a.percentual ||
      b.presencas - a.presencas ||
      String(a.nome).localeCompare(String(b.nome), "pt-BR")
    )
    .map((item, index) => ({ ...item, posicao: index + 1 }));
}

function obterRankingPorTurmaProfessor() {
  const rankingGeral = obterRankingGeralProfessor();
  const grupos = new Map();

  rankingGeral.forEach(item => {
    const turma = item.turma || "Sem turma";
    if (!grupos.has(turma)) grupos.set(turma, []);
    grupos.get(turma).push(item);
  });

  return [...grupos.entries()]
    .sort((a, b) => String(a[0]).localeCompare(String(b[0]), "pt-BR"))
    .map(([turma, itens]) => ({
      turma,
      itens: itens
        .sort((a, b) =>
          b.percentual - a.percentual ||
          b.presencas - a.presencas ||
          String(a.nome).localeCompare(String(b.nome), "pt-BR")
        )
        .map((item, index) => ({ ...item, posicao: index + 1 }))
    }));
}

function obterRankingTurmasProfessor() {
  const grupos = obterRankingPorTurmaProfessor();

  return grupos.map(grupo => {
    const presencas = grupo.itens.reduce((total, item) => total + Number(item.presencas || 0), 0);
    const aulasValidas = Math.max(...grupo.itens.map(item => Number(item.aulas_validas || 0)), 0);
    const alunosParticipantes = grupo.itens.length;
    const media = alunosParticipantes > 0
      ? Math.round((grupo.itens.reduce((total, item) => total + Number(item.percentual || 0), 0) / alunosParticipantes) * 10) / 10
      : 0;

    return {
      nome: grupo.turma,
      nome_turma: grupo.turma,
      presencas,
      aulas_validas: aulasValidas,
      totalAlunos: alunosParticipantes,
      percentual: media,
      texto_detalhe: `${String(media).replace(".", ",")}% média • ${alunosParticipantes} aluno${alunosParticipantes === 1 ? "" : "s"} no ranking`
    };
  })
  .filter(item => item.presencas > 0)
  .sort((a, b) =>
    b.percentual - a.percentual ||
    b.presencas - a.presencas ||
    String(a.nome).localeCompare(String(b.nome), "pt-BR")
  )
  .map((item, index) => ({ ...item, posicao: index + 1 }));
}

function textoPosicaoRankingProfessor(posicao) {
  if (Number(posicao) === 1) return "🥇";
  if (Number(posicao) === 2) return "🥈";
  if (Number(posicao) === 3) return "🥉";
  return `${posicao}º`;
}

function primeiraLetraRankingProfessor(texto) {
  return String(texto || "A").trim().charAt(0).toUpperCase() || "A";
}

function criarAvatarRankingProfessor(item, grande = false) {
  const foto = item.foto_url || "";
  const nome = item.nome || item.nome_turma || "T";

  if (foto) {
    return `<img src="${foto}" alt="${nome}" class="ranking-photo ${grande ? "ranking-photo-big" : ""}">`;
  }

  return `<div class="ranking-avatar ${grande ? "ranking-avatar-big" : ""}">${primeiraLetraRankingProfessor(nome)}</div>`;
}

function renderizarLinhaRankingProfessor(item, tipo = "aluno") {
  const ehTurma = tipo === "turmas" || Object.prototype.hasOwnProperty.call(item, "totalAlunos");
  const nome = ehTurma ? (item.nome || item.nome_turma || "Turma") : item.nome;
  const detalhe = item.texto_detalhe || (
    ehTurma
      ? `${String(Number(item.percentual || 0)).replace(".", ",")}% média • ${item.totalAlunos || 0} alunos no ranking`
      : `${item.turma || "Sem turma"} • ${item.presencas || 0}/${item.aulas_validas || 0} aulas`
  );

  return `
    <div class="ranking-row desafio-ranking-item">
      <span class="ranking-position">${textoPosicaoRankingProfessor(item.posicao)}</span>
      ${ehTurma ? `<div class="ranking-avatar">${primeiraLetraRankingProfessor(nome)}</div>` : criarAvatarRankingProfessor(item)}
      <div class="ranking-row-info">
        <strong>${nome}</strong>
        <small>${detalhe}</small>
      </div>
    </div>
  `;
}

function renderizarListaRankingProfessor(lista, tipo = rankingProfessorAtual) {
  if (!lista || !lista.length) {
    return `<p class="empty-message">Ainda não há dados suficientes para formar o ranking deste mês.</p>`;
  }

  return `
    <div class="desafio-ranking-lista ranking-lista-igual-aluno">
      ${lista.map(item => renderizarLinhaRankingProfessor(item, tipo)).join("")}
    </div>
  `;
}


function renderizarPodioRankingProfessor(lista, tipo = rankingProfessorAtual) {
  const top = (lista || []).slice(0, 3);

  if (!top.length) {
    return `<p class="empty-message">Ainda não há dados suficientes para formar o pódio deste mês.</p>`;
  }

  const mapa = { 1: null, 2: null, 3: null };
  top.forEach((item, index) => {
    mapa[Number(item.posicao || index + 1)] = item;
  });

  const ordem = [2, 1, 3].filter(pos => mapa[pos]);

  return `
    <div class="ranking-podium desafio-ranking-podium ranking-professor-podio">
      ${ordem.map(pos => {
        const item = mapa[pos];
        const primeiro = Number(item.posicao) === 1;
        const ehTurma = tipo === "turmas" || Object.prototype.hasOwnProperty.call(item, "totalAlunos");
        const nome = ehTurma ? (item.nome || item.nome_turma || "Turma") : item.nome;
        const detalhe = item.texto_detalhe || (
          ehTurma
            ? `${String(Number(item.percentual || 0)).replace(".", ",")}% média`
            : `${item.turma || "Sem turma"} • ${item.presencas || 0}/${item.aulas_validas || 0} aulas`
        );

        return `
          <div class="podium-card ${primeiro ? "podium-first" : ""}">
            <span class="podium-medal">${textoPosicaoRankingProfessor(item.posicao || pos)}</span>
            ${ehTurma ? `<div class="ranking-avatar ${primeiro ? "ranking-avatar-big" : ""}">${primeiraLetraRankingProfessor(nome)}</div>` : criarAvatarRankingProfessor(item, primeiro)}
            <strong>${nome}</strong>
            <small>${detalhe}</small>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderizarListaAposPodioRankingProfessor(lista, tipo = rankingProfessorAtual) {
  const restante = (lista || []).slice(3);

  if (!restante.length) return "";

  return `
    <div class="desafio-ranking-lista ranking-lista-igual-aluno ranking-lista-pos-podio">
      ${restante.map(item => renderizarLinhaRankingProfessor(item, tipo)).join("")}
    </div>
  `;
}


function renderizarRankingAgrupadoPorTurmaProfessor() {
  const grupos = obterRankingPorTurmaProfessor();

  if (!grupos.length) {
    return `<div class="empty-state-mini">Nenhuma presença registrada no mês atual ainda.</div>`;
  }

  return `
    <div class="ranking-turma-professor-lista">
      ${grupos.map(grupo => `
        <section class="ranking-turma-card">
          <div class="ranking-turma-topo">
            <div>
              <strong>${grupo.turma}</strong>
              <span>${grupo.itens.length} aluno${grupo.itens.length === 1 ? "" : "s"} no ranking</span>
            </div>
          </div>
          ${renderizarPodioRankingProfessor(grupo.itens, "turma")}
          ${renderizarListaAposPodioRankingProfessor(grupo.itens, "turma")}
        </section>
      `).join("")}
    </div>
  `;
}

function obterListaRankingProfessorAtual() {
  if (rankingProfessorAtual === "turmas") return obterRankingTurmasProfessor();
  return obterRankingGeralProfessor();
}

function renderizarDesafioPresencaProfessor() {
  const container = document.getElementById("listaRankingDesafioProfessor");
  if (!container) return;

  document.querySelectorAll("[data-ranking-professor]").forEach(btn => {
    btn.classList.toggle("ativo", btn.dataset.rankingProfessor === rankingProfessorAtual);
  });

  if (rankingProfessorAtual === "turma") {
    container.innerHTML = renderizarRankingAgrupadoPorTurmaProfessor();
    return;
  }

  const lista = obterListaRankingProfessorAtual();

  if (!lista.length) {
    container.innerHTML = `
      <div class="empty-state-mini">
        Nenhuma presença registrada no mês atual ainda.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    ${renderizarPodioRankingProfessor(lista, rankingProfessorAtual)}
    ${renderizarListaAposPodioRankingProfessor(lista, rankingProfessorAtual)}
  `;
}

async function atualizarDesafioPresencaProfessor() {
  if (typeof carregarDadosFrequencia === "function") {
    await carregarDadosFrequencia();
  }

  renderizarDesafioPresencaProfessor();
  carregarRankingDashboard();
}

function renderizarPodioDashboardProfessor(lista) {
  return renderizarPodioRankingProfessor(lista, "geral");
}

async function carregarRankingDashboard() {
  const container = document.getElementById("dashboardRankingPresenca");
  if (!container) return;

  const ranking = obterRankingGeralProfessor();

  if (ranking.length === 0) {
    container.innerHTML = `
      <div class="empty-state-mini">
        Nenhuma presença registrada no mês atual ainda.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="dashboard-ranking-home">
      ${renderizarPodioDashboardProfessor(ranking)}
    </div>
  `;
}

function abrirRankingCompletoProfessorHome() {
  if (typeof abrirViewPrincipal === "function") {
    abrirViewPrincipal("desafio");
    return;
  }

  const botaoDesafio = document.getElementById("btnNavDesafio");
  if (botaoDesafio) botaoDesafio.click();
}

document.querySelectorAll("[data-ranking-professor]").forEach(botao => {
  if (botao.dataset.inicializado) return;
  botao.dataset.inicializado = "true";

  botao.addEventListener("click", () => {
    rankingProfessorAtual = botao.dataset.rankingProfessor || "turma";

    document.querySelectorAll("[data-ranking-professor]").forEach(btn => {
      btn.classList.toggle("ativo", btn === botao);
    });

    renderizarDesafioPresencaProfessor();
  });
});

const botaoVerRankingCompletoHome = document.getElementById("btnVerRankingCompletoHome");
if (botaoVerRankingCompletoHome && !botaoVerRankingCompletoHome.dataset.inicializado) {
  botaoVerRankingCompletoHome.dataset.inicializado = "true";
  botaoVerRankingCompletoHome.addEventListener("click", abrirRankingCompletoProfessorHome);
}

const botaoAtualizarDesafio = document.getElementById("btnAtualizarDesafio");
if (botaoAtualizarDesafio) {
  botaoAtualizarDesafio.addEventListener("click", atualizarDesafioPresencaProfessor);
}