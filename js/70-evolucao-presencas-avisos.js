// 32. MÓDULO EVOLUÇÃO / GRADUAÇÃO
// ===============================
function aplicarEstadoModuloElemento(el, ativo) {
  const ehItemMenu = el.classList.contains("menu-item");

  if (ehItemMenu) {
    el.classList.remove("escondido");
    el.classList.toggle("modulo-bloqueado", !ativo);
    return;
  }

  el.classList.toggle("escondido", !ativo);
  el.classList.remove("modulo-bloqueado");
}

function aplicarModulosInterface() {
  document.querySelectorAll(".modulo-evolucao").forEach(el => {
    aplicarEstadoModuloElemento(el, moduloEvolucaoAtivo);
  });
  document.querySelectorAll(".modulo-presenca").forEach(el => {
    aplicarEstadoModuloElemento(el, moduloPresencaAtivo);
  });
  document.querySelectorAll(".modulo-avisos").forEach(el => {
    aplicarEstadoModuloElemento(el, moduloAvisosAtivo);
  });
  document.querySelectorAll(".modulo-ranking").forEach(el => {
    aplicarEstadoModuloElemento(el, moduloRankingAtivo);
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
  const turmasTexto = typeof textoTurmasAluno === "function" ? textoTurmasAluno(aluno, "") : (aluno.turma || "");
  if (turmasTexto) partes.push(turmasTexto);

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
  listaEvolucao.innerHTML = lista.map(({ aluno, evolucao }) => {
    const nomeAlunoSeguro = escaparTextoSeguro(aluno.nome || "Aluno");
    const resumoAlunoSeguro = escaparTextoSeguro(resumoEvolucaoAluno(aluno) || "Sem dados de evolução cadastrados");

    return `
      <div class="evolucao-item evolucao-${evolucao.status}">
        <div>
          <strong>${nomeAlunoSeguro}</strong>
          <span>${resumoAlunoSeguro}</span>
          ${evolucao.data ? `<small>Previsão para avaliação: ${formatarData(evolucao.data)}</small>` : ""}
          ${evolucao.frequencia && evolucao.frequencia.percentual !== null ? `<small>Frequência analisada: ${evolucao.frequencia.percentual}% • mínimo ${evolucao.frequencia.minimo}% • ${evolucao.frequencia.presencas}/${evolucao.frequencia.aulasValidas} aulas válidas</small>` : ""}
        </div>
        <div class="evolucao-acoes">
          <button type="button" class="acao-secundaria" onclick="abrirModalGraduacao('${aluno.id}')">🥋 Registrar graduação</button>
        </div>
      </div>
    `;
  }).join("");
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
  const principal = String(aluno && aluno.turma ? aluno.turma : "").trim();
  if (principal) return principal;

  if (typeof nomesTurmasAluno === "function") {
    const nomes = nomesTurmasAluno(aluno);
    if (nomes.length) return nomes[0];
  }

  return "Sem turma";
}

function alunosAtivosParaChamada() {
  return alunos.filter(aluno => String(aluno.status_aluno || "ativo").toLowerCase() !== "inativo");
}

function preencherTurmasPresenca() {
  if (!presencaTurma) return;

  const turmaAtual = presencaTurma.value || "todas";
  const turmas = (turmasCadastradas || [])
    .filter(turma => turma.ativa !== false)
    .slice()
    .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));

  presencaTurma.innerHTML = `<option value="todas">Todas as turmas</option>` +
    turmas.map(turma => `<option value="${escaparTextoSeguro(turma.nome)}">${escaparTextoSeguro(turma.nome)}</option>`).join("");

  if (turmaAtual === "todas" || turmas.some(turma => turma.nome === turmaAtual)) {
    presencaTurma.value = turmaAtual;
  } else {
    presencaTurma.value = "todas";
  }
}

function alunosFiltradosPresenca() {
  const turmaSelecionada = presencaTurma ? presencaTurma.value : "todas";
  const turmasAtivas = (turmasCadastradas || []).filter(turma => turma.ativa !== false);
  const turmasAtivasIds = new Set(turmasAtivas.map(turma => String(turma.id)));

  if (turmaSelecionada === "todas") {
    return alunosAtivosParaChamada().filter(aluno => {
      const ids = typeof idsTurmasVinculadasAluno === "function"
        ? idsTurmasVinculadasAluno(aluno)
        : [aluno.turma_id].filter(Boolean).map(String);

      return ids.some(id => turmasAtivasIds.has(String(id)));
    });
  }

  const turmaObj = typeof encontrarTurmaPorNome === "function"
    ? encontrarTurmaPorNome(turmaSelecionada)
    : null;

  if (!turmaObj) return [];

  return alunosAtivosParaChamada().filter(aluno => {
    if (typeof alunoVinculadoTurmaId === "function") {
      return alunoVinculadoTurmaId(aluno, turmaObj.id);
    }

    return String(aluno.turma_id || "") === String(turmaObj.id);
  });
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

const estadoPresencasTela = window.estadoPresencasTela = {
  data: "",
  turmaNome: "todas",
  turmaId: null,
  turmaValidaNoDia: true,
  mensagemCalendario: ""
};

function sincronizarEstadoPresencasTela() {
  const data = presencaData ? (presencaData.value || dataLocalISO()) : dataLocalISO();
  const turmaNome = presencaTurma ? (presencaTurma.value || "todas") : "todas";
  const turma = turmaNome !== "todas" && typeof encontrarTurmaPorNome === "function"
    ? encontrarTurmaPorNome(turmaNome)
    : null;
  const validacao = typeof validarDiaAulaTurma === "function"
    ? validarDiaAulaTurma(turmaNome, data)
    : { valida: true, mensagem: "" };

  estadoPresencasTela.data = data;
  estadoPresencasTela.turmaNome = turmaNome;
  estadoPresencasTela.turmaId = turma ? turma.id : null;
  estadoPresencasTela.turmaValidaNoDia = validacao.valida !== false;
  estadoPresencasTela.mensagemCalendario = validacao.mensagem || "";

  return estadoPresencasTela;
}

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


function turmaTemAulaNaData(turma, dataISO) {
  if (!turma || !Array.isArray(turma.dias_semana) || turma.dias_semana.length === 0) return false;

  const diaData = typeof diaDaSemanaDataISO === "function"
    ? diaDaSemanaDataISO(dataISO)
    : null;

  if (diaData === null) return false;

  return turma.dias_semana
    .map(dia => typeof normalizarDiaSemanaParaNumero === "function" ? normalizarDiaSemanaParaNumero(dia) : Number(dia))
    .some(dia => dia === diaData);
}

function obterTurmasParaSelecaoChamada(dataISO = dataLocalISO()) {
  const alunosAtivos = alunosAtivosParaChamada();

  // A chamada deve nascer somente das turmas realmente cadastradas em Turmas.
  // Não usamos aluno.turma para criar cards, porque isso criava "turmas fantasma"
  // quando uma solicitação ou cadastro digitava um texto livre como "manha" ou "noite".
  return (turmasCadastradas || [])
    .filter(turma => turma.ativa !== false)
    .filter(turma => turmaTemAulaNaData(turma, dataISO))
    .slice()
    .sort((a, b) => {
      const horaA = String(a.horario || "99:99");
      const horaB = String(b.horario || "99:99");
      if (horaA !== horaB) return horaA.localeCompare(horaB, "pt-BR");
      return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
    })
    .map(turma => {
      const alunosTurma = alunosAtivos.filter(aluno => {
        if (typeof alunoVinculadoTurmaId === "function") {
          return alunoVinculadoTurmaId(aluno, turma.id);
        }
        return String(aluno.turma_id || "") === String(turma.id);
      });
      return {
        id: turma.id,
        nome: turma.nome,
        horario: turma.horario || "",
        dias_semana: turma.dias_semana || [],
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
  const turmas = obterTurmasParaSelecaoChamada(data);

  if (presencaTotalPresentes) presencaTotalPresentes.textContent = "--";
  if (presencaTotalFaltas) presencaTotalFaltas.textContent = "--";
  if (presencaTotalAlunos) presencaTotalAlunos.textContent = String(turmas.length);

  if (!turmas.length) {
    const diaNumero = typeof diaDaSemanaDataISO === "function" ? diaDaSemanaDataISO(data) : null;
    const nomeDia = Number.isInteger(diaNumero) && DIAS_SEMANA[diaNumero] ? DIAS_SEMANA[diaNumero] : "dia selecionado";

    listaPresencas.innerHTML = `
      <div class="presenca-status-chamada aviso">
        <strong>Nenhuma turma com aula nesta data</strong>
        <span>Não há turma ativa com aula em ${escaparTextoSeguro(nomeDia)} (${formatarData(data)}). Altere a data ou confira os dias cadastrados em Turmas.</span>
      </div>
    `;
    return;
  }

  listaPresencas.innerHTML = `
    <div class="presenca-status-chamada nova">
      <strong>Turmas com aula nesta data</strong>
      <span>Escolha uma turma abaixo. Depois o Mensalize abre somente os alunos dessa turma para fazer a chamada.</span>
    </div>

    <div class="presenca-turmas-selecao">
      ${turmas.map(turma => {
        const statusClasse = turma.chamadaSalva ? "salva" : "nova";
        const statusTexto = turma.chamadaSalva ? "✓ Chamada salva" : "Abrir chamada";
        const horarioTexto = turma.horario ? ` • ${escaparTextoSeguro(turma.horario)}` : "";

        return `
          <button type="button" class="presenca-turma-selecao-card ${statusClasse}" data-abrir-turma-chamada="${escaparTextoSeguro(turma.nome)}">
            <span class="presenca-turma-selecao-info">
              <strong>${escaparTextoSeguro(turma.nome)}</strong>
              <small>${turma.total} aluno${turma.total === 1 ? "" : "s"}${horarioTexto}</small>
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
  const turmaSegura = escaparTextoSeguro(turma);

  if (typeof calcularFrequenciaAluno !== "function") {
    return `<div class="presenca-aluno-detalhes"><span class="presenca-aluno-meta">${turmaSegura}</span></div>`;
  }

  const frequencia = calcularFrequenciaAluno(aluno);
  const percentual = frequencia && frequencia.percentual !== null && frequencia.percentual !== undefined
    ? Number(frequencia.percentual)
    : null;
  const minimo = Number(frequencia && frequencia.minimo ? frequencia.minimo : (presencaMinimaPercentual || 70));

  if (percentual === null || !Number.isFinite(percentual)) {
    return `
      <div class="presenca-aluno-detalhes">
        <span class="presenca-aluno-meta">${turmaSegura}</span>
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
      <span class="presenca-aluno-meta">${turmaSegura}</span>
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
      listaPresencas.innerHTML = `<div class="empty-state-mini aula-cancelada-box"><strong>Aula cancelada em ${formatarData(data)}</strong><br>${escaparTextoSeguro(aulaCancelada.motivo || "Aula cancelada")}. Esta aula não entra no cálculo de frequência para evolução.</div>`;
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
        <span>${escaparTextoSeguro(validacaoDia.mensagem)}</span>
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
          <strong>${escaparTextoSeguro(turma)}</strong>
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
                  <strong>${escaparTextoSeguro(aluno.nome || "Aluno")}</strong>
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
  sincronizarEstadoPresencasTela();
  await carregarMarcacoesPresenca();
  sincronizarEstadoPresencasTela();
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
          <strong>${escaparTextoSeguro(grupo.turma || "Turma")}</strong>
          <span>${formatarData(grupo.data)}</span>
          <small>${escaparTextoSeguro(criarResumoHistoricoChamada(grupo))}</small>
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

  const totalAtivos = (data || []).filter(a => {
    const hojeISO = new Date().toISOString().split("T")[0];
    return !a.data_fim || a.data_fim >= hojeISO;
  }).length;
  const totalAgendados = (data || []).filter(a => {
    const hojeISO = new Date().toISOString().split("T")[0];
    return a.data_inicio && a.data_inicio > hojeISO;
  }).length;
  const totalExpirados = (data || []).filter(a => {
    const hojeISO = new Date().toISOString().split("T")[0];
    return a.data_fim && a.data_fim < hojeISO;
  }).length;

  const elAtivos = document.getElementById("totalAvisosAtivos");
  const elAgendados = document.getElementById("totalAvisosAgendados");
  const elExpirados = document.getElementById("totalAvisosExpirados");
  if (elAtivos) elAtivos.textContent = totalAtivos;
  if (elAgendados) elAgendados.textContent = totalAgendados;
  if (elExpirados) elExpirados.textContent = totalExpirados;

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

    return `
      <div class="evolucao-item aviso-item ${importante ? "aviso-importante" : ""} ${expirado ? "aviso-expirado" : ""}">
        <div>
          <div class="aviso-badges-row">
            <span class="mini-badge">${tipo}</span>
            <span class="mini-badge ${expirado ? "status-atrasado" : aindaNaoIniciou ? "status-pendente" : "status-ok"}">${statusPeriodo}</span>
          </div>
          <strong>${titulo}</strong>
          <span>${destino}</span>
          <small>${mensagem}</small>
        </div>
        <div class="aviso-acoes">
          <button type="button" class="acao-secundaria" onclick="editarAviso('${aviso.id}')">Editar</button>
          <button type="button" class="acao-secundaria" onclick="copiarAviso('${aviso.id}')">Copiar</button>
          <button type="button" class="acao-perigo" onclick="removerAviso('${aviso.id}')">Apagar</button>
        </div>
      </div>
    `;
  }).join("");
}

function editarAviso(id) {
  const painelNovoAviso = document.getElementById("painelNovoAviso");
  if (!painelNovoAviso) return;

  // Busca o aviso direto do Supabase para preencher o form
  supabaseClient
    .from("avisos")
    .select("id,titulo,turma,mensagem")
    .eq("id", id)
    .single()
    .then(({ data, error }) => {
      if (error || !data) {
        mostrarToast("Erro ao carregar aviso para edição.", "erro");
        return;
      }

      if (avisoTitulo) avisoTitulo.value = data.titulo || "";
      if (avisoTurma) avisoTurma.value = data.turma || "";
      if (avisoMensagem) avisoMensagem.value = data.mensagem || "";

      // Guarda o ID em edição no form
      if (formAviso) formAviso.dataset.editandoId = data.id;

      // Atualiza o título do painel
      const tituloPainel = painelNovoAviso.querySelector("h3");
      if (tituloPainel) tituloPainel.textContent = "Editar aviso";

      // Abre o painel
      painelNovoAviso.classList.remove("escondido");
      painelNovoAviso.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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
  const editandoId = formAviso?.dataset.editandoId || null;

  if (!titulo || !mensagem) {
    if (msgAviso) msgAviso.textContent = "Preencha título e mensagem.";
    return;
  }

  const payload = {
    user_id: usuarioAtual.id,
    titulo,
    turma: turma || null,
    mensagem,
    tipo: "comunicado",
    prioridade: "normal",
    ativo: true
  };

  let error;

  if (editandoId) {
    // Modo edição — atualiza o registro existente
    ({ error } = await supabaseClient
      .from("avisos")
      .update({ titulo, turma: turma || null, mensagem })
      .eq("id", editandoId)
      .eq("user_id", usuarioAtual.id));
  } else {
    // Modo criação — insere novo registro
    ({ error } = await supabaseClient.from("avisos").insert(payload));
  }

  if (error) {
    if (msgAviso) msgAviso.textContent = "Erro ao salvar aviso.";
    console.error(error);
    return;
  }

  // Resetar form e fechar painel
  if (formAviso) {
    formAviso.reset();
    delete formAviso.dataset.editandoId;
  }

  const tituloPainel = document.getElementById("painelNovoAviso")?.querySelector("h3");
  if (tituloPainel) tituloPainel.textContent = "Publicar aviso";

  const painelNovoAviso = document.getElementById("painelNovoAviso");
  if (painelNovoAviso) painelNovoAviso.classList.add("escondido");

  if (msgAviso) msgAviso.textContent = "";
  mostrarToast(editandoId ? "Aviso atualizado." : "Aviso publicado.");
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

// Botão Novo Aviso — abre/fecha painel
const btnNovoAviso = document.getElementById("btnNovoAviso");
const painelNovoAviso = document.getElementById("painelNovoAviso");
const btnCancelarAviso = document.getElementById("btnCancelarAviso");

if (btnNovoAviso && painelNovoAviso) {
  btnNovoAviso.addEventListener("click", () => {
    const estaAberto = !painelNovoAviso.classList.contains("escondido");
    if (estaAberto) {
      painelNovoAviso.classList.add("escondido");
      if (formAviso) { formAviso.reset(); delete formAviso.dataset.editandoId; }
      const tituloPainel = painelNovoAviso.querySelector("h3");
      if (tituloPainel) tituloPainel.textContent = "Publicar aviso";
    } else {
      painelNovoAviso.classList.remove("escondido");
      painelNovoAviso.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

if (btnCancelarAviso && painelNovoAviso) {
  btnCancelarAviso.addEventListener("click", () => {
    painelNovoAviso.classList.add("escondido");
    if (formAviso) { formAviso.reset(); delete formAviso.dataset.editandoId; }
    const tituloPainel = painelNovoAviso.querySelector("h3");
    if (tituloPainel) tituloPainel.textContent = "Publicar aviso";
  });
}

// Histórico de chamadas — toggle abrir/fechar
function toggleHistoricoChamadas() {
  const conteudo = document.getElementById("historicoChamadas");
  const btn = document.getElementById("btnToggleHistoricoChamadas");
  if (!conteudo) return;
  const vaiAbrir = conteudo.classList.contains("escondido");
  conteudo.classList.toggle("escondido", !vaiAbrir);
  if (btn) {
    btn.textContent = vaiAbrir ? "Fechar histórico" : "Ver histórico";
    btn.setAttribute("aria-expanded", vaiAbrir ? "true" : "false");
  }
}

// Inicializar abas de configuração do Perfil
function inicializarConfigAbas() {
  document.querySelectorAll(".config-aba").forEach(aba => {
    aba.addEventListener("click", () => {
      const alvo = aba.dataset.configAba;

      document.querySelectorAll(".config-aba").forEach(b => {
        b.classList.remove("ativa");
        b.setAttribute("aria-selected", "false");
      });
      document.querySelectorAll(".config-painel").forEach(p => p.classList.remove("ativo"));

      aba.classList.add("ativa");
      aba.setAttribute("aria-selected", "true");
      const painel = document.getElementById(`configAba-${alvo}`);
      if (painel) painel.classList.add("ativo");
    });
  });
}


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

// ===============================
// 37.1 DESAFIO DA AULA — PONTOS RÁPIDOS
// ===============================

const DESAFIO_PONTOS_RAPIDOS = {
  tecnica: {
    tecnica_dia: { pontos: 2, label: "Técnica do dia" }
  },
  atitude: {
    ajudou_colega: { pontos: 2, label: "Ajudou colega" }
  },
  desafio_aula: {
    cumpriu_missao: { pontos: 3, label: "Desafio da aula" }
  },
  competicao: {
    participou: { pontos: 5, label: "Participou de campeonato" },
    ganhou_luta: { pontos: 6, label: "Ganhou luta" },
    bronze: { pontos: 8, label: "Medalha bronze" },
    prata: { pontos: 10, label: "Medalha prata" },
    ouro: { pontos: 12, label: "Medalha ouro" }
  }
};

function obterConfigPontoDesafio(tipo, subtipo) {
  const grupo = DESAFIO_PONTOS_RAPIDOS[tipo];
  if (!grupo) return null;
  return grupo[subtipo] || null;
}

function obterAlunosAtivosDesafioPontos() {
  return (alunos || [])
    .filter(aluno => String(aluno.status_aluno || "ativo").toLowerCase() !== "inativo")
    .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
}

function preencherSelectDesafioPontosRapidos() {
  const select = document.getElementById("desafioPontosAluno");
  if (!select) return;

  const valorAtual = select.value || "";
  const lista = obterAlunosAtivosDesafioPontos();

  select.innerHTML = "";

  const opcaoInicial = document.createElement("option");
  opcaoInicial.value = "";
  opcaoInicial.textContent = lista.length ? "Selecione um aluno" : "Nenhum aluno ativo encontrado";
  select.appendChild(opcaoInicial);

  lista.forEach(aluno => {
    const option = document.createElement("option");
    option.value = aluno.id;
    const turmasTexto = typeof textoTurmasAluno === "function" ? textoTurmasAluno(aluno, "") : (aluno.turma || "");
    option.textContent = `${aluno.nome}${turmasTexto ? ` • ${turmasTexto}` : ""}`;
    select.appendChild(option);
  });

  if (valorAtual && lista.some(aluno => String(aluno.id) === String(valorAtual))) {
    select.value = valorAtual;
  }
}

function atualizarFeedbackDesafioPontos(mensagem, tipo = "") {
  const feedback = document.getElementById("desafioPontosFeedback");
  if (!feedback) return;

  feedback.textContent = mensagem;
  feedback.classList.remove("sucesso", "erro");

  if (tipo) {
    feedback.classList.add(tipo);
  }
}

function alternarBotoesDesafioPontos(disabled) {
  document.querySelectorAll("[data-desafio-ponto]").forEach(botao => {
    botao.disabled = disabled;
  });
}

async function registrarPontoRapidoDesafio(botao) {
  if (!usuarioAtual) {
    mostrarToast("Você precisa estar logado para lançar pontos.", "erro");
    return;
  }

  const select = document.getElementById("desafioPontosAluno");
  const observacaoInput = document.getElementById("desafioPontosObservacao");

  const alunoId = select ? select.value : "";
  const aluno = (alunos || []).find(item => String(item.id) === String(alunoId));

  if (!aluno) {
    atualizarFeedbackDesafioPontos("Selecione um aluno antes de lançar pontos.", "erro");
    mostrarToast("Selecione um aluno.", "erro");
    return;
  }

  const tipo = botao.dataset.tipo || "";
  const subtipo = botao.dataset.subtipo || "";
  const pontosBotao = Number(botao.dataset.pontos || 0);
  const config = obterConfigPontoDesafio(tipo, subtipo);

  if (!config || Number(config.pontos) !== pontosBotao) {
    mostrarToast("Configuração de pontos inválida.", "erro");
    return;
  }

  const observacao = observacaoInput ? observacaoInput.value.trim() : "";

  alternarBotoesDesafioPontos(true);
  atualizarFeedbackDesafioPontos("Salvando pontos...", "");

  const { error } = await supabaseClient
    .from("desafio_pontos")
    .insert({
      user_id: usuarioAtual.id,
      aluno_id: aluno.id,
      turma_id: aluno.turma_id || null,
      tipo,
      subtipo,
      pontos: config.pontos,
      observacao: observacao || null,
      data_ponto: typeof dataLocalISO === "function" ? dataLocalISO() : new Date().toISOString().split("T")[0]
    });

  alternarBotoesDesafioPontos(false);

  if (error) {
    console.log("Erro ao lançar pontos do desafio:", error.message);
    atualizarFeedbackDesafioPontos("Erro ao salvar pontos. Confira o console.", "erro");
    mostrarToast("Erro ao lançar pontos.", "erro");
    return;
  }

  if (observacaoInput) observacaoInput.value = "";

  desafioPontosMesProfessorCarregado = false;
  await carregarPontosDesafioMesProfessor();
  renderizarHistoricoPontosDesafio();
  renderizarDesafioPresencaProfessor();
  await carregarRankingDashboard();

  const minimoAulas = obterMinimoAulasRankingDesafioProfessor();
  const presencasAlunoMes = obterQuantidadePresencasMesAlunoDesafioProfessor(aluno.id);
  const complementoRanking = presencasAlunoMes >= minimoAulas
    ? " Ranking atualizado."
    : ` O aluno entra no ranking ao atingir ${minimoAulas} presença${minimoAulas === 1 ? "" : "s"} no mês.`;

  atualizarFeedbackDesafioPontos(`${config.label}: +${config.pontos} ponto${config.pontos === 1 ? "" : "s"} para ${aluno.nome}.${complementoRanking}`, "sucesso");
  mostrarToast(`+${config.pontos} pontos para ${aluno.nome}!`);
}

function configurarDesafioPontosRapidos() {
  preencherSelectDesafioPontosRapidos();

  document.querySelectorAll("[data-desafio-ponto]").forEach(botao => {
    if (botao.dataset.inicializado === "true") return;

    botao.dataset.inicializado = "true";
    botao.addEventListener("click", () => registrarPontoRapidoDesafio(botao));
  });
}


let desafioPontosMesProfessor = [];
let desafioPontosMesProfessorCarregado = false;


// ===============================
// 37.2 DESAFIO DA AULA — PAINÉIS RECOLHÍVEIS + HISTÓRICO
// ===============================

function escaparHtmlDesafio(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatarDataPontoDesafio(valor) {
  const dataIso = String(valor || "").split("T")[0];
  if (!dataIso) return "Data não informada";
  if (typeof formatarData === "function") return formatarData(dataIso);

  const partes = dataIso.split("-");
  if (partes.length !== 3) return dataIso;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function obterLabelPontoDesafio(item) {
  const config = obterConfigPontoDesafio(item?.tipo || "", item?.subtipo || "");
  if (config?.label) return config.label;

  const subtipo = String(item?.subtipo || item?.tipo || "Ponto extra")
    .replaceAll("_", " ")
    .trim();

  return subtipo
    ? subtipo.charAt(0).toUpperCase() + subtipo.slice(1)
    : "Ponto extra";
}

function obterNomeAlunoPontoDesafio(alunoId) {
  const aluno = (alunos || []).find(item => String(item.id) === String(alunoId));
  return aluno?.nome || "Aluno não encontrado";
}

function renderizarHistoricoPontosDesafio() {
  const lista = document.getElementById("desafioPontosHistorico");
  if (!lista) return;

  const pontos = Array.isArray(desafioPontosMesProfessor)
    ? desafioPontosMesProfessor.slice()
    : [];

  if (!pontos.length) {
    lista.innerHTML = '<div class="empty-state-mini">Nenhum ponto extra lançado neste mês.</div>';
    return;
  }

  pontos.sort((a, b) => {
    const dataA = new Date(a?.created_at || a?.data_ponto || 0).getTime();
    const dataB = new Date(b?.created_at || b?.data_ponto || 0).getTime();
    return dataB - dataA;
  });

  lista.innerHTML = pontos.map(item => {
    const id = escaparHtmlDesafio(item.id || "");
    const nome = escaparHtmlDesafio(obterNomeAlunoPontoDesafio(item.aluno_id));
    const label = escaparHtmlDesafio(obterLabelPontoDesafio(item));
    const observacao = String(item.observacao || "").trim();
    const observacaoHtml = observacao
      ? `<small>${escaparHtmlDesafio(observacao)}</small>`
      : "";
    const pontosValor = Number(item.pontos || 0);
    const textoPontos = `${pontosValor >= 0 ? "+" : ""}${pontosValor} ponto${Math.abs(pontosValor) === 1 ? "" : "s"}`;

    return `
      <article class="desafio-historico-item" data-desafio-historico-item="${id}">
        <div class="desafio-historico-info">
          <strong>${nome}</strong>
          <span>${label} · ${formatarDataPontoDesafio(item.data_ponto || item.created_at)}</span>
          ${observacaoHtml}
          <em class="desafio-historico-pontos">${escaparHtmlDesafio(textoPontos)}</em>
        </div>

        <div class="desafio-historico-acoes">
          <button
            type="button"
            class="btn-excluir-ponto-desafio"
            data-desafio-excluir-ponto="${id}"
          >
            Excluir lançamento
          </button>

          <div class="desafio-confirmacao-excluir" aria-live="polite">
            <span>Excluir este lançamento?</span>
            <button
              type="button"
              class="btn-cancelar-exclusao-ponto"
              data-desafio-cancelar-exclusao="${id}"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="btn-confirmar-exclusao-ponto"
              data-desafio-confirmar-exclusao="${id}"
            >
              Excluir
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

async function carregarHistoricoPontosDesafio(forcar = false) {
  const lista = document.getElementById("desafioPontosHistorico");
  if (lista) {
    lista.innerHTML = '<div class="empty-state-mini">Carregando histórico de pontos...</div>';
  }

  await carregarPontosDesafioMesProfessor(forcar);
  renderizarHistoricoPontosDesafio();
}

function aplicarEstadoPainelDesafio({
  botao,
  conteudo,
  card,
  aberto,
  classeRecolhido,
  textoFechado,
  textoAberto
}) {
  if (!botao || !conteudo) return;

  const estaAberto = Boolean(aberto);
  botao.setAttribute("aria-expanded", String(estaAberto));
  botao.textContent = estaAberto ? textoAberto : textoFechado;
  conteudo.classList.toggle("escondido", !estaAberto);
  conteudo.setAttribute("aria-hidden", String(!estaAberto));

  if (card && classeRecolhido) {
    card.classList.toggle(classeRecolhido, !estaAberto);
  }
}

function configurarPaineisDesafio() {
  const btnPontos = document.getElementById("btnTogglePontosDesafio");
  const conteudoPontos = document.getElementById("desafioPontosConteudo");
  const cardPontos = btnPontos?.closest(".desafio-pontos-card") || null;

  if (btnPontos && conteudoPontos && !btnPontos.dataset.toggleDesafioInicializado) {
    btnPontos.dataset.toggleDesafioInicializado = "true";

    btnPontos.addEventListener("click", () => {
      const abrir = btnPontos.getAttribute("aria-expanded") !== "true";
      aplicarEstadoPainelDesafio({
        botao: btnPontos,
        conteudo: conteudoPontos,
        card: cardPontos,
        aberto: abrir,
        classeRecolhido: "desafio-pontos-card-recolhido",
        textoFechado: "Abrir pontuações",
        textoAberto: "Fechar pontuações"
      });

      if (abrir) preencherSelectDesafioPontosRapidos();
    });
  }

  const btnHistorico = document.getElementById("btnToggleHistoricoDesafio");
  const conteudoHistorico = document.getElementById("desafioHistoricoConteudo");
  const cardHistorico = btnHistorico?.closest(".desafio-historico-card") || null;

  if (btnHistorico && conteudoHistorico && !btnHistorico.dataset.toggleDesafioInicializado) {
    btnHistorico.dataset.toggleDesafioInicializado = "true";

    btnHistorico.addEventListener("click", async () => {
      const abrir = btnHistorico.getAttribute("aria-expanded") !== "true";
      aplicarEstadoPainelDesafio({
        botao: btnHistorico,
        conteudo: conteudoHistorico,
        card: cardHistorico,
        aberto: abrir,
        classeRecolhido: "desafio-historico-card-recolhido",
        textoFechado: "Ver pontos lançados",
        textoAberto: "Ocultar pontos lançados"
      });

      if (abrir) await carregarHistoricoPontosDesafio(false);
    });
  }

  const btnAtualizarHistorico = document.getElementById("btnAtualizarHistoricoDesafio");
  if (btnAtualizarHistorico && !btnAtualizarHistorico.dataset.desafioInicializado) {
    btnAtualizarHistorico.dataset.desafioInicializado = "true";
    btnAtualizarHistorico.addEventListener("click", () => carregarHistoricoPontosDesafio(true));
  }

  const listaHistorico = document.getElementById("desafioPontosHistorico");
  if (listaHistorico && !listaHistorico.dataset.acoesDesafioInicializadas) {
    listaHistorico.dataset.acoesDesafioInicializadas = "true";

    listaHistorico.addEventListener("click", async event => {
      const botaoExcluir = event.target.closest("[data-desafio-excluir-ponto]");
      if (botaoExcluir) {
        const item = botaoExcluir.closest(".desafio-historico-item");
        item?.classList.add("confirmando-exclusao");
        return;
      }

      const botaoCancelar = event.target.closest("[data-desafio-cancelar-exclusao]");
      if (botaoCancelar) {
        const item = botaoCancelar.closest(".desafio-historico-item");
        item?.classList.remove("confirmando-exclusao");
        return;
      }

      const botaoConfirmar = event.target.closest("[data-desafio-confirmar-exclusao]");
      if (!botaoConfirmar) return;

      const pontoId = botaoConfirmar.getAttribute("data-desafio-confirmar-exclusao");
      if (!pontoId || !usuarioAtual) return;

      botaoConfirmar.disabled = true;
      botaoConfirmar.textContent = "Excluindo...";

      const { error } = await supabaseClient
        .from("desafio_pontos")
        .delete()
        .eq("id", pontoId)
        .eq("user_id", usuarioAtual.id);

      if (error) {
        console.log("Erro ao excluir ponto do desafio:", error.message);
        botaoConfirmar.disabled = false;
        botaoConfirmar.textContent = "Excluir";
        mostrarToast("Erro ao excluir lançamento.", "erro");
        return;
      }

      desafioPontosMesProfessor = desafioPontosMesProfessor.filter(item => String(item.id) !== String(pontoId));
      desafioPontosMesProfessorCarregado = true;
      renderizarHistoricoPontosDesafio();
      renderizarDesafioPresencaProfessor();
      await carregarRankingDashboard();
      mostrarToast("Lançamento excluído.");
    });
  }

  // Garante estado inicial coerente mesmo após cache/restauração do navegador.
  if (btnPontos && conteudoPontos) {
    aplicarEstadoPainelDesafio({
      botao: btnPontos,
      conteudo: conteudoPontos,
      card: cardPontos,
      aberto: btnPontos.getAttribute("aria-expanded") === "true",
      classeRecolhido: "desafio-pontos-card-recolhido",
      textoFechado: "Abrir pontuações",
      textoAberto: "Fechar pontuações"
    });
  }

  if (btnHistorico && conteudoHistorico) {
    aplicarEstadoPainelDesafio({
      botao: btnHistorico,
      conteudo: conteudoHistorico,
      card: cardHistorico,
      aberto: btnHistorico.getAttribute("aria-expanded") === "true",
      classeRecolhido: "desafio-historico-card-recolhido",
      textoFechado: "Ver pontos lançados",
      textoAberto: "Ocultar pontos lançados"
    });
  }
}

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

function dataDateParaISOProfessor(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

function dataISOProfessor(dataValor) {
  if (!dataValor) return "";
  return String(dataValor).split("T")[0];
}

function desafioPontosExtrasAtivoProfessor() {
  // Defesa de configuração:
  // se o módulo Desafio estiver ativo, o ranking desta tela deve funcionar
  // mesmo que modulo_ranking tenha ficado falso por erro no admin.
  if (typeof moduloDesafioAtivo === "undefined") return true;
  return moduloDesafioAtivo === true;
}

function obterMinimoAulasRankingDesafioProfessor() {
  if (typeof rankingMinimoAulas === "undefined") return 1;
  const minimo = Number(rankingMinimoAulas);
  return Number.isFinite(minimo) && minimo > 0 ? minimo : 1;
}

async function carregarPontosDesafioMesProfessor(forcar = false) {
  if (!usuarioAtual || !supabaseClient) {
    desafioPontosMesProfessor = [];
    desafioPontosMesProfessorCarregado = true;
    return desafioPontosMesProfessor;
  }

  if (!forcar && desafioPontosMesProfessorCarregado) {
    return desafioPontosMesProfessor;
  }

  if (!desafioPontosExtrasAtivoProfessor()) {
    desafioPontosMesProfessor = [];
    desafioPontosMesProfessorCarregado = true;
    return desafioPontosMesProfessor;
  }

  const periodo = obterPeriodoRankingMesAtualProfessor();
  const inicio = dataDateParaISOProfessor(periodo.inicio);
  const fim = dataDateParaISOProfessor(periodo.fim);

  const { data, error } = await supabaseClient
    .from("desafio_pontos")
    .select("id,user_id,aluno_id,turma_id,tipo,subtipo,pontos,observacao,data_ponto,created_at")
    .eq("user_id", usuarioAtual.id)
    .gte("data_ponto", inicio)
    .lte("data_ponto", fim)
    .order("created_at", { ascending: false });

  if (error) {
    console.log("Erro ao carregar pontos do desafio:", error.message);
    desafioPontosMesProfessor = [];
    desafioPontosMesProfessorCarregado = false;
    return desafioPontosMesProfessor;
  }

  desafioPontosMesProfessor = data || [];
  desafioPontosMesProfessorCarregado = true;
  return desafioPontosMesProfessor;
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

function obterQuantidadePresencasMesAlunoDesafioProfessor(alunoId) {
  const presencasMes = obterPresencasMesAtualProfessor();
  const datas = new Set();

  presencasMes.forEach(presenca => {
    if (String(presenca.aluno_id) !== String(alunoId)) return;
    const data = dataISOProfessor(presenca.data_aula);
    if (data) datas.add(data);
  });

  return datas.size;
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

function criarResumoPontosExtrasProfessor() {
  return {
    total: 0,
    tecnica: 0,
    atitude: 0,
    desafio_aula: 0,
    competicao: 0
  };
}

function obterMapaPontosExtrasDesafioProfessor() {
  const mapa = new Map();

  if (!desafioPontosExtrasAtivoProfessor()) return mapa;

  (desafioPontosMesProfessor || []).forEach(ponto => {
    const alunoId = String(ponto.aluno_id || "");
    if (!alunoId) return;

    if (!mapa.has(alunoId)) {
      mapa.set(alunoId, criarResumoPontosExtrasProfessor());
    }

    const resumo = mapa.get(alunoId);
    const pontos = Number(ponto.pontos || 0);
    if (!Number.isFinite(pontos) || pontos <= 0) return;

    const tipo = String(ponto.tipo || "");
    resumo.total += normalizarPontosInteiroProfessor(pontos);

    if (Object.prototype.hasOwnProperty.call(resumo, tipo)) {
      resumo[tipo] += normalizarPontosInteiroProfessor(pontos);
    }
  });

  return mapa;
}

function normalizarPontosInteiroProfessor(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.trunc(numero) : 0;
}

function montarDetalhePontuacaoDesafioProfessor(item) {
  const partes = [
    `${item.turma || "Sem turma"}`,
    `${item.pontos_total} pts`,
    `${item.pontos_presenca} presença${item.pontos_presenca === 1 ? "" : "s"}`
  ];

  if (item.pontos_extras > 0) {
    partes.push(`+${item.pontos_extras} extras`);
  }

  return partes.join(" • ");
}

function calcularDadosRankingAlunoProfessor(aluno, presencasUnicas, aulasPorTurma, pontosExtrasPorAluno) {
  const turma = aluno.turma || "Sem turma";
  const presencasSet = presencasUnicas.get(String(aluno.id)) || new Set();
  const presencas = presencasSet.size;
  const aulasValidas = Math.max((aulasPorTurma.get(turma) || new Set()).size, presencas, 0);
  const percentual = aulasValidas > 0 ? Math.round((presencas / aulasValidas) * 1000) / 10 : 0;
  const extras = pontosExtrasPorAluno.get(String(aluno.id)) || criarResumoPontosExtrasProfessor();
  const pontosPresenca = presencas;
  const pontosExtras = normalizarPontosInteiroProfessor(extras.total);
  const pontosTotal = pontosPresenca + pontosExtras;
  const minimoAulas = obterMinimoAulasRankingDesafioProfessor();

  const item = {
    id: aluno.id,
    nome: aluno.nome,
    turma,
    foto_url: aluno.foto_url || "",
    presencas,
    aulas_validas: aulasValidas,
    percentual,
    pontos_presenca: pontosPresenca,
    pontos_extras: pontosExtras,
    pontos_total: pontosTotal,
    pontos_tecnica: normalizarPontosInteiroProfessor(extras.tecnica),
    pontos_atitude: normalizarPontosInteiroProfessor(extras.atitude),
    pontos_desafio_aula: normalizarPontosInteiroProfessor(extras.desafio_aula),
    pontos_competicao: normalizarPontosInteiroProfessor(extras.competicao),
    minimo_aulas: minimoAulas,
    elegivel_ranking: presencas >= minimoAulas
  };

  item.texto_detalhe = montarDetalhePontuacaoDesafioProfessor(item);
  return item;
}

function ordenarRankingPontuacaoProfessor(lista) {
  return (lista || [])
    .sort((a, b) =>
      Number(b.pontos_total || 0) - Number(a.pontos_total || 0) ||
      Number(b.pontos_extras || 0) - Number(a.pontos_extras || 0) ||
      Number(b.presencas || 0) - Number(a.presencas || 0) ||
      Number(b.percentual || 0) - Number(a.percentual || 0) ||
      String(a.nome || a.nome_turma || "").localeCompare(String(b.nome || b.nome_turma || ""), "pt-BR")
    )
    .map((item, index) => ({ ...item, posicao: index + 1 }));
}

function obterRankingGeralProfessor() {
  const presencasMes = obterPresencasMesAtualProfessor();
  const presencasUnicas = obterPresencasUnicasPorAlunoProfessor(presencasMes);
  const aulasPorTurma = obterMapaAulasPorTurmaProfessor(presencasMes);
  const pontosExtrasPorAluno = obterMapaPontosExtrasDesafioProfessor();

  return ordenarRankingPontuacaoProfessor(
    (alunos || [])
      .filter(aluno => String(aluno.status_aluno || "ativo").toLowerCase() !== "inativo")
      .map(aluno => calcularDadosRankingAlunoProfessor(aluno, presencasUnicas, aulasPorTurma, pontosExtrasPorAluno))
      .filter(item => item.elegivel_ranking && item.pontos_total > 0)
  );
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
      itens: ordenarRankingPontuacaoProfessor(itens)
    }));
}

function obterRankingTurmasProfessor() {
  const grupos = obterRankingPorTurmaProfessor();

  return ordenarRankingPontuacaoProfessor(
    grupos.map(grupo => {
      const pontosTotal = grupo.itens.reduce((total, item) => total + Number(item.pontos_total || 0), 0);
      const pontosPresenca = grupo.itens.reduce((total, item) => total + Number(item.pontos_presenca || 0), 0);
      const pontosExtras = grupo.itens.reduce((total, item) => total + Number(item.pontos_extras || 0), 0);
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
        pontos_presenca: pontosPresenca,
        pontos_extras: pontosExtras,
        pontos_total: pontosTotal,
        texto_detalhe: `${pontosTotal} pts • ${alunosParticipantes} aluno${alunosParticipantes === 1 ? "" : "s"} no ranking • ${pontosExtras} extras`
      };
    })
    .filter(item => item.pontos_total > 0)
  );
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
  const fotoSegura = escaparHtmlDesafio(foto);
  const nomeSeguro = escaparHtmlDesafio(nome);
  const inicialSegura = escaparHtmlDesafio(primeiraLetraRankingProfessor(nome));

  if (foto) {
    return `<img src="${fotoSegura}" alt="${nomeSeguro}" class="ranking-photo ${grande ? "ranking-photo-big" : ""}">`;
  }

  return `<div class="ranking-avatar ${grande ? "ranking-avatar-big" : ""}">${inicialSegura}</div>`;
}

function renderizarLinhaRankingProfessor(item, tipo = "aluno") {
  const ehTurma = tipo === "turmas" || Object.prototype.hasOwnProperty.call(item, "totalAlunos");
  const nome = ehTurma ? (item.nome || item.nome_turma || "Turma") : item.nome;
  const detalhe = item.texto_detalhe || (
    ehTurma
      ? `${String(Number(item.percentual || 0)).replace(".", ",")}% média • ${item.totalAlunos || 0} alunos no ranking`
      : `${item.turma || "Sem turma"} • ${item.presencas || 0}/${item.aulas_validas || 0} aulas`
  );
  const nomeSeguro = escaparHtmlDesafio(nome || "Aluno");
  const detalheSeguro = escaparHtmlDesafio(detalhe);
  const inicialSegura = escaparHtmlDesafio(primeiraLetraRankingProfessor(nome));

  return `
    <div class="ranking-row desafio-ranking-item">
      <span class="ranking-position">${textoPosicaoRankingProfessor(item.posicao)}</span>
      ${ehTurma ? `<div class="ranking-avatar">${inicialSegura}</div>` : criarAvatarRankingProfessor(item)}
      <div class="ranking-row-info">
        <strong>${nomeSeguro}</strong>
        <small>${detalheSeguro}</small>
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
        const nomeSeguro = escaparHtmlDesafio(nome || "Aluno");
        const detalheSeguro = escaparHtmlDesafio(detalhe);
        const inicialSegura = escaparHtmlDesafio(primeiraLetraRankingProfessor(nome));

        return `
          <div class="podium-card ${primeiro ? "podium-first" : ""}">
            <span class="podium-medal">${textoPosicaoRankingProfessor(item.posicao || pos)}</span>
            ${ehTurma ? `<div class="ranking-avatar ${primeiro ? "ranking-avatar-big" : ""}">${inicialSegura}</div>` : criarAvatarRankingProfessor(item, primeiro)}
            <strong>${nomeSeguro}</strong>
            <small>${detalheSeguro}</small>
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
    return `<div class="empty-state-mini">Ainda não há dados suficientes para formar o Desafio da Aula neste mês.</div>`;
  }

  return `
    <div class="ranking-turma-professor-lista">
      ${grupos.map(grupo => `
        <section class="ranking-turma-card">
          <div class="ranking-turma-topo">
            <div>
              <strong>${escaparHtmlDesafio(grupo.turma)}</strong>
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
  configurarDesafioPontosRapidos();

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
        Ainda não há dados suficientes para formar o Desafio da Aula neste mês.
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
  configurarDesafioPontosRapidos();
configurarPaineisDesafio();

  if (typeof carregarDadosFrequencia === "function") {
    await carregarDadosFrequencia();
  }

  await carregarPontosDesafioMesProfessor(true);
  renderizarHistoricoPontosDesafio();
  renderizarDesafioPresencaProfessor();
  await carregarRankingDashboard();
}

function renderizarPodioDashboardProfessor(lista) {
  return renderizarPodioRankingProfessor(lista, "geral");
}

async function carregarRankingDashboard() {
  const container = document.getElementById("dashboardRankingPresenca");
  if (!container) return;

  if (!desafioPontosMesProfessorCarregado) {
    await carregarPontosDesafioMesProfessor();
  }

  const ranking = obterRankingGeralProfessor();

  if (ranking.length === 0) {
    container.innerHTML = `
      <div class="empty-state-mini">
        Ainda não há dados suficientes para formar o Desafio da Aula neste mês.
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

configurarDesafioPontosRapidos();