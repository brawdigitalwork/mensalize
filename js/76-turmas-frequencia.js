// 33. TURMAS + FREQUÊNCIA INTELIGENTE
// ===============================
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function normalizarTextoTurma(texto) {
  return String(texto || "").trim().toLowerCase();
}

function dataMenosMesesISO(meses) {
  const hoje = dataHojeSemHora();
  hoje.setMonth(hoje.getMonth() - Number(meses || 6));
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

function parseDataISO(dataString) {
  if (!dataString) return null;
  const partes = String(dataString).split("-");
  if (partes.length !== 3) return null;
  return new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
}

function diaDaSemanaDataISO(dataString) {
  const data = parseDataISO(dataString);
  return data ? data.getDay() : null;
}

function encontrarTurmaPorNome(nome) {
  const alvo = normalizarTextoTurma(nome);
  if (!alvo) return null;
  return turmasCadastradas.find(turma => normalizarTextoTurma(turma.nome) === alvo) || null;
}

function normalizarDiaSemanaParaNumero(dia) {
  const texto = String(dia || "").trim().toLowerCase();
  const mapa = {
    "0": 0, "domingo": 0, "dom": 0,
    "1": 1, "segunda": 1, "seg": 1,
    "2": 2, "terca": 2, "terça": 2, "ter": 2,
    "3": 3, "quarta": 3, "qua": 3,
    "4": 4, "quinta": 4, "qui": 4,
    "5": 5, "sexta": 5, "sex": 5,
    "6": 6, "sabado": 6, "sábado": 6, "sab": 6
  };

  return Object.prototype.hasOwnProperty.call(mapa, texto) ? mapa[texto] : null;
}

function diasSemanaTexto(dias) {
  const lista = Array.isArray(dias) ? dias : [];
  if (!lista.length) return "Dias não definidos";

  return lista.map(dia => {
    const numero = Number(dia);
    if (Number.isInteger(numero) && numero >= 0 && numero <= 6) return DIAS_SEMANA[numero];
    return String(dia).charAt(0).toUpperCase() + String(dia).slice(1);
  }).join(", ");
}

async function carregarTurmasSistema() {
  if (!usuarioAtual) return;

  const { data, error } = await supabaseClient
    .from("turmas")
    .select("id,user_id,nome,dias_semana,horario,professor,ativa,created_at")
    .eq("user_id", usuarioAtual.id)
    .order("nome", { ascending: true });

  if (error) {
    console.log("Erro ao carregar turmas:", error.message);
    turmasCadastradas = [];
  } else {
    turmasCadastradas = data || [];
  }

  await carregarAulasCanceladas();
  preencherSelectsTurmas();
  sincronizarEstado();
}

async function carregarAulasCanceladas() {
  if (!usuarioAtual) return;

  const inicio = dataMenosMesesISO(Math.max(frequenciaPeriodoMeses || 6, 6));

  const { data, error } = await supabaseClient
    .from("aulas_canceladas")
    .select("id,user_id,turma_id,turma,data_aula,motivo,observacao,created_at")
    .eq("user_id", usuarioAtual.id)
    .gte("data_aula", inicio)
    .order("data_aula", { ascending: false });

  if (error) {
    console.log("Erro ao carregar aulas canceladas:", error.message);
    aulasCanceladas = [];
  } else {
    aulasCanceladas = data || [];
  }

  sincronizarEstado();
}

async function carregarDadosFrequencia() {
  if (!usuarioAtual) return;

  const inicio = dataMenosMesesISO(frequenciaPeriodoMeses || 6);

  const { data, error } = await supabaseClient
    .from("presencas")
    .select("id,aluno_id,turma,turma_id,data_aula,presente")
    .eq("user_id", usuarioAtual.id)
    .gte("data_aula", inicio);

  if (error) {
    console.log("Erro ao carregar dados de frequência:", error.message);
    presencasPeriodo = [];
  } else {
    presencasPeriodo = data || [];
  }
}

function preencherSelectsTurmas() {
  const opcoes = turmasCadastradas
    .filter(turma => turma.ativa !== false)
    .map(turma => `<option value="${turma.nome}">${turma.nome}${turma.horario ? " • " + turma.horario : ""}</option>`)
    .join("");

  if (turmaAluno) {
    const valorAtual = turmaAluno.value || turmaAluno.getAttribute("data-valor-atual") || "";

    turmaAluno.innerHTML = `<option value="">Turma / horário</option>${opcoes}`;

    if (valorAtual && ![...turmaAluno.options].some(opt => opt.value === valorAtual)) {
      turmaAluno.insertAdjacentHTML("beforeend", `<option value="" disabled>Turma antiga: ${valorAtual} — selecione uma turma cadastrada</option>`);
      turmaAluno.value = "";
    } else {
      turmaAluno.value = valorAtual;
    }

    turmaAluno.removeAttribute("data-valor-atual");
  }

  if (cancelarTurma) {
    const valorAtual = cancelarTurma.value || "";

    cancelarTurma.innerHTML = `
      <option value="">Selecione uma turma</option>
      ${turmasCadastradas.map(turma => `
        <option value="${turma.id}">${turma.nome}${turma.horario ? " • " + turma.horario : ""}</option>
      `).join("")}
    `;

    if ([...cancelarTurma.options].some(opt => opt.value === valorAtual)) {
      cancelarTurma.value = valorAtual;
    }
  }

  if (avisoTurma && avisoTurma.tagName === "SELECT") {
    const valorAtual = avisoTurma.value || "";

    avisoTurma.innerHTML = `<option value="">Todos os alunos</option>${opcoes}`;

    if ([...avisoTurma.options].some(opt => opt.value === valorAtual)) {
      avisoTurma.value = valorAtual;
    }
  }

  if (presencaTurma) preencherTurmasPresenca();
}

function turmaDaAulaCancelada(registro) {
  if (!registro) return "";
  if (registro.turma) return registro.turma;

  const turma = turmasCadastradas.find(t => String(t.id) === String(registro.turma_id));
  return turma ? turma.nome : "";
}

function aulaCanceladaPara(turmaNome, dataISO) {
  const turmaNorm = normalizarTextoTurma(turmaNome);

  return aulasCanceladas.find(registro => {
    const nome = turmaDaAulaCancelada(registro);
    return registro.data_aula === dataISO && normalizarTextoTurma(nome) === turmaNorm;
  }) || null;
}

function contarAulasValidasTurma(turma, inicioISO, fimISO) {
  if (!turma || !Array.isArray(turma.dias_semana) || turma.dias_semana.length === 0) return 0;

  const inicio = parseDataISO(inicioISO);
  const fim = parseDataISO(fimISO);
  if (!inicio || !fim) return 0;

  const diasSet = new Set(
    turma.dias_semana
      .map(normalizarDiaSemanaParaNumero)
      .filter(dia => dia !== null)
  );

  let total = 0;
  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());

  while (cursor <= fim) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;

    if (diasSet.has(cursor.getDay()) && !aulaCanceladaPara(turma.nome, iso)) {
      total++;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return total;
}

function calcularFrequenciaAluno(aluno) {
  if (!aluno || !aluno.turma) {
    return {
      percentual: null,
      presencas: 0,
      aulasValidas: 0,
      minimo: presencaMinimaPercentual || 70,
      periodo: frequenciaPeriodoMeses || 6,
      texto: "Turma não definida"
    };
  }

  const turma = aluno.turma_id
    ? (turmasCadastradas || []).find(t => String(t.id) === String(aluno.turma_id))
    : encontrarTurmaPorNome(aluno.turma);

  if (!turma) {
    return {
      percentual: null,
      presencas: 0,
      aulasValidas: 0,
      minimo: presencaMinimaPercentual || 70,
      periodo: frequenciaPeriodoMeses || 6,
      texto: "Turma sem calendário"
    };
  }

  const inicioPeriodo = dataMenosMesesISO(frequenciaPeriodoMeses || 6);

  const inicio = aluno.data_inicio_academia && aluno.data_inicio_academia > inicioPeriodo
    ? aluno.data_inicio_academia
    : inicioPeriodo;

  const fim = dataLocalISO();
  const aulasValidas = contarAulasValidasTurma(turma, inicio, fim);

  const diasPermitidos = new Set(
    Array.isArray(turma.dias_semana)
      ? turma.dias_semana
        .map(normalizarDiaSemanaParaNumero)
        .filter(dia => dia !== null && Number.isInteger(dia))
      : []
  );

  const datasPresencaValidas = new Set();

  (presencasPeriodo || []).forEach(p => {
    if (String(p.aluno_id) !== String(aluno.id)) return;
    if (p.presente !== true) return;
    if (!p.data_aula || p.data_aula < inicio || p.data_aula > fim) return;

    const mesmaTurma =
      (p.turma_id && String(p.turma_id) === String(turma.id)) ||
      normalizarTextoTurma(p.turma) === normalizarTextoTurma(turma.nome);

    if (!mesmaTurma) return;
    if (aulaCanceladaPara(turma.nome, p.data_aula)) return;

    const diaPresenca = diaDaSemanaDataISO(p.data_aula);

    // Importante: se a turma hoje só tem aula em certos dias,
    // presenças antigas marcadas fora desses dias não entram mais
    // no cálculo de frequência para graduação.
    if (!diasPermitidos.has(diaPresenca)) return;

    // Conta apenas uma presença por data.
    // Isso evita frequência acima de 100% por registros duplicados.
    datasPresencaValidas.add(p.data_aula);
  });

  const presencas = Math.min(datasPresencaValidas.size, aulasValidas);
  const percentual = aulasValidas > 0
    ? Math.min(100, Math.round((presencas / aulasValidas) * 100))
    : null;

  const minimo = Number(presencaMinimaPercentual || 70);

  const texto = percentual === null
    ? "Sem aulas válidas no período"
    : `Presença ${percentual}% (${presencas}/${aulasValidas})`;

  return {
    percentual,
    presencas,
    aulasValidas,
    minimo,
    periodo: frequenciaPeriodoMeses || 6,
    texto,
    ok: percentual !== null && percentual >= minimo
  };
}

function alunosVinculadosTurma(turma) {
  const nomeTurma = normalizarTextoTurma(turma && turma.nome);
  if (!nomeTurma) return [];

  return (alunos || []).filter(aluno => {
    const status = String(aluno.status_aluno || "ativo").toLowerCase();
    if (status === "inativo") return false;

    if (turma.id && aluno.turma_id && String(aluno.turma_id) === String(turma.id)) return true;
    return normalizarTextoTurma(aluno.turma) === nomeTurma;
  });
}

function textoQuantidadeAlunosTurma(turma) {
  const total = alunosVinculadosTurma(turma).length;
  return `${total} aluno${total === 1 ? "" : "s"} vinculado${total === 1 ? "" : "s"}`;
}


function atualizarResumoTurmasPremium() {
  const totalTurmas = document.getElementById("resumoTotalTurmas");
  const turmasAtivas = document.getElementById("resumoTurmasAtivas");
  const aulasCanceladasResumo = document.getElementById("resumoAulasCanceladas");

  if (totalTurmas) totalTurmas.textContent = String((turmasCadastradas || []).length);
  if (turmasAtivas) turmasAtivas.textContent = String((turmasCadastradas || []).filter(t => t.ativa !== false).length);
  if (aulasCanceladasResumo) aulasCanceladasResumo.textContent = String((aulasCanceladas || []).length);
}

function abrirPainelFormularioTurma(modo = "nova") {
  const painel = document.getElementById("painelFormTurma");
  const painelCancelar = document.getElementById("painelFormCancelarAula");
  const titulo = document.getElementById("tituloPainelTurma");

  if (painelCancelar) painelCancelar.classList.add("escondido");
  if (painel) painel.classList.remove("escondido");
  if (titulo) titulo.textContent = modo === "edicao" ? "Editar turma" : "Nova turma";

  if (painel) painel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function fecharPainelFormularioTurma() {
  const painel = document.getElementById("painelFormTurma");
  if (painel) painel.classList.add("escondido");
}

function abrirPainelCancelarAula() {
  const painel = document.getElementById("painelFormCancelarAula");
  const painelTurma = document.getElementById("painelFormTurma");

  if (painelTurma && !turmaEditandoId) painelTurma.classList.add("escondido");
  if (painel) {
    painel.classList.remove("escondido");
    painel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function fecharPainelCancelarAula() {
  const painel = document.getElementById("painelFormCancelarAula");
  if (painel) painel.classList.add("escondido");
}

function inicializarTelaTurmasPremium() {
  const btnAbrir = document.getElementById("btnAbrirFormTurma");
  const btnFechar = document.getElementById("btnFecharFormTurma");
  const btnAbrirCancelar = document.getElementById("btnAbrirFormCancelarAula");
  const btnAbrirCancelarSec = document.getElementById("btnAbrirFormCancelarAulaSecundario");
  const btnFecharCancelar = document.getElementById("btnFecharFormCancelarAula");
  const btnCancelarFormAula = document.getElementById("btnCancelarFormAula");

  if (btnAbrir && !btnAbrir.dataset.inicializado) {
    btnAbrir.dataset.inicializado = "true";
    btnAbrir.addEventListener("click", () => {
      limparFormularioTurma();
      if (msgTurma) msgTurma.textContent = "";
      abrirPainelFormularioTurma("nova");
    });
  }

  if (btnFechar && !btnFechar.dataset.inicializado) {
    btnFechar.dataset.inicializado = "true";
    btnFechar.addEventListener("click", () => {
      limparFormularioTurma();
      if (msgTurma) msgTurma.textContent = "";
      fecharPainelFormularioTurma();
    });
  }

  [btnAbrirCancelar, btnAbrirCancelarSec].forEach(botao => {
    if (!botao || botao.dataset.inicializado) return;
    botao.dataset.inicializado = "true";
    botao.addEventListener("click", () => {
      if (msgCancelarAula) msgCancelarAula.textContent = "";
      abrirPainelCancelarAula();
    });
  });

  [btnFecharCancelar, btnCancelarFormAula].forEach(botao => {
    if (!botao || botao.dataset.inicializado) return;
    botao.dataset.inicializado = "true";
    botao.addEventListener("click", () => {
      if (formCancelarAula) formCancelarAula.reset();
      if (msgCancelarAula) msgCancelarAula.textContent = "";
      fecharPainelCancelarAula();
    });
  });
}

function renderizarTurmas() {
  atualizarResumoTurmasPremium();

  if (listaTurmas) {
    if (!turmasCadastradas.length) {
      listaTurmas.innerHTML = `<div class="empty-state-mini">Nenhuma turma cadastrada ainda.</div>`;
    } else {
      listaTurmas.innerHTML = turmasCadastradas.map(turma => `
        <article class="turma-item ${turma.ativa === false ? "inativa" : ""}">
          <div>
            <strong>${turma.nome}</strong>
            <span>${diasSemanaTexto(turma.dias_semana)}${turma.horario ? " • " + turma.horario : ""}</span>
            ${turma.professor ? `<small>Professor: ${turma.professor}</small>` : ""}
            <div class="turma-meta-grid">
              <span class="turma-meta-pill alunos">👥 ${textoQuantidadeAlunosTurma(turma)}</span>
              <span class="turma-meta-pill ${turma.ativa === false ? "inativa" : "ativa"}">${turma.ativa === false ? "Turma inativa" : "Turma ativa"}</span>
            </div>
          </div>

          <div class="turma-item-acoes">
            <button type="button" class="acao-secundaria" onclick="editarTurma('${turma.id}')">Editar</button>
            <button type="button" class="acao-perigo" onclick="removerTurma('${turma.id}')">Remover</button>
          </div>
        </article>
      `).join("");
    }
  }

  if (listaAulasCanceladas) {
    if (!aulasCanceladas.length) {
      listaAulasCanceladas.innerHTML = `<div class="empty-state-mini">Nenhuma aula cancelada cadastrada.</div>`;
    } else {
      listaAulasCanceladas.innerHTML = aulasCanceladas.slice(0, 20).map(aula => `
        <article class="turma-item aula-cancelada-item">
          <div>
            <strong>${turmaDaAulaCancelada(aula) || "Turma"}</strong>
            <span>${formatarData(aula.data_aula)}${aula.motivo ? " • " + aula.motivo : ""}</span>
            ${aula.observacao ? `<small>${aula.observacao}</small>` : ""}
          </div>

          <button type="button" class="acao-secundaria" onclick="removerAulaCancelada('${aula.id}')">Reativar</button>
        </article>
      `).join("");
    }
  }
}

async function prepararTelaTurmas() {
  inicializarTelaTurmasPremium();
  await carregarTurmasSistema();
  renderizarTurmas();
  fecharPainelFormularioTurma();
}

function editarTurma(id) {
  const turma = turmasCadastradas.find(item => String(item.id) === String(id));

  if (!turma) {
    mostrarToast("Turma não encontrada.", "erro");
    return;
  }

  turmaEditandoId = turma.id;
  abrirPainelFormularioTurma("edicao");

  if (turmaNome) turmaNome.value = turma.nome || "";
  if (turmaHorario) turmaHorario.value = turma.horario || "";
  if (turmaProfessor) turmaProfessor.value = turma.professor || "";
  if (turmaAtiva) turmaAtiva.checked = turma.ativa !== false;

  document.querySelectorAll('input[name="turmaDias"]').forEach(input => {
    input.checked = Array.isArray(turma.dias_semana)
      ? turma.dias_semana.map(String).includes(String(input.value))
      : false;
  });

  if (btnSalvarTurma) btnSalvarTurma.textContent = "Salvar alterações";
  if (btnCancelarEdicaoTurma) btnCancelarEdicaoTurma.classList.remove("escondido");
  if (msgTurma) msgTurma.textContent = `Editando turma: ${turma.nome}`;

  if (formTurma) {
    formTurma.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function salvarTurma(event) {
  event.preventDefault();

  if (!usuarioAtual) return;

  const nome = turmaNome ? turmaNome.value.trim() : "";
  const horario = turmaHorario ? turmaHorario.value.trim() : "";
  const professor = turmaProfessor ? turmaProfessor.value.trim() : "";

  const dias = [...(formTurma || document).querySelectorAll('input[name="turmaDias"]:checked')]
    .map(input => String(input.value))
    .filter(valor => valor !== "");

  const diasUnicos = [...new Set(dias)];
  const ativa = turmaAtiva ? turmaAtiva.checked : true;

  if (!nome) {
    if (msgTurma) msgTurma.textContent = "Informe o nome da turma.";
    mostrarToast("Informe o nome da turma.", "erro");
    return;
  }

  if (!diasUnicos.length) {
    if (msgTurma) msgTurma.textContent = "Selecione pelo menos um dia de aula.";
    mostrarToast("Selecione pelo menos um dia de aula.", "erro");
    return;
  }

  const dadosTurma = {
    nome,
    dias_semana: diasUnicos,
    horario: horario || null,
    professor: professor || null,
    ativa
  };

  let error;

  if (turmaEditandoId) {
    const resposta = await supabaseClient
      .from("turmas")
      .update(dadosTurma)
      .eq("id", turmaEditandoId)
      .eq("user_id", usuarioAtual.id);

    error = resposta.error;
  } else {
    const resposta = await supabaseClient
      .from("turmas")
      .insert({
        user_id: usuarioAtual.id,
        ...dadosTurma
      });

    error = resposta.error;
  }

  if (error) {
    if (msgTurma) {
      msgTurma.textContent = turmaEditandoId
        ? "Erro ao atualizar turma."
        : "Erro ao salvar turma.";
    }

    mostrarToast(
      turmaEditandoId ? "Erro ao atualizar turma." : "Erro ao salvar turma.",
      "erro"
    );

    console.error(error);
    return;
  }

  const estavaEditando = Boolean(turmaEditandoId);

  limparFormularioTurma();

  if (msgTurma) {
    msgTurma.textContent = estavaEditando
      ? "Turma atualizada com sucesso."
      : "Turma salva com sucesso.";
  }

  mostrarToast(estavaEditando ? "Turma atualizada com sucesso!" : "Turma salva com sucesso!");

  await carregarTurmasSistema();
  renderizarTurmas();
  fecharPainelFormularioTurma();
}

function limparFormularioTurma() {
  turmaEditandoId = null;

  if (formTurma) formTurma.reset();
  if (turmaAtiva) turmaAtiva.checked = true;
  if (btnSalvarTurma) btnSalvarTurma.textContent = "Salvar turma";
  if (btnCancelarEdicaoTurma) btnCancelarEdicaoTurma.classList.add("escondido");
}

if (btnCancelarEdicaoTurma) {
  btnCancelarEdicaoTurma.addEventListener("click", () => {
    limparFormularioTurma();
    if (msgTurma) msgTurma.textContent = "Edição cancelada.";
    fecharPainelFormularioTurma();
  });
}

async function removerTurma(id) {
  if (!confirm("Remover esta turma? Os alunos não serão apagados, mas o calendário da turma será removido.")) return;

  const { error } = await supabaseClient
    .from("turmas")
    .delete()
    .eq("id", id)
    .eq("user_id", usuarioAtual.id);

  if (error) {
    mostrarToast("Erro ao remover turma.", "erro");
    return;
  }

  mostrarToast("Turma removida.");
  await carregarTurmasSistema();
  renderizarTurmas();
}

async function salvarAulaCancelada(event) {
  event.preventDefault();

  if (!usuarioAtual) return;

  const turmaId = cancelarTurma ? cancelarTurma.value : "";
  const turma = turmasCadastradas.find(t => String(t.id) === String(turmaId));
  const data = cancelarData ? cancelarData.value : "";
  const motivo = cancelarMotivo ? cancelarMotivo.value.trim() : "";
  const observacao = cancelarObservacao ? cancelarObservacao.value.trim() : "";

  if (!turma || !data) {
    if (msgCancelarAula) msgCancelarAula.textContent = "Selecione a turma e a data.";
    mostrarToast("Selecione a turma e a data.", "erro");
    return;
  }

  const { error } = await supabaseClient.from("aulas_canceladas").insert({
    user_id: usuarioAtual.id,
    turma_id: turma.id,
    turma: turma.nome,
    data_aula: data,
    motivo: motivo || null,
    observacao: observacao || null
  });

  if (error) {
    if (msgCancelarAula) msgCancelarAula.textContent = "Erro ao cancelar aula.";
    mostrarToast("Erro ao cancelar aula.", "erro");
    console.error(error);
    return;
  }

  if (formCancelarAula) formCancelarAula.reset();
  if (msgCancelarAula) msgCancelarAula.textContent = "Aula cancelada com sucesso.";

  mostrarToast("Aula cancelada. Ela não contará na frequência.");

  await carregarTurmasSistema();
  await carregarDadosFrequencia();

  renderizarTurmas();
  fecharPainelCancelarAula();

  if (typeof renderizarEvolucao === "function") {
    renderizarEvolucao();
  }
}

async function removerAulaCancelada(id) {
  const { error } = await supabaseClient
    .from("aulas_canceladas")
    .delete()
    .eq("id", id)
    .eq("user_id", usuarioAtual.id);

  if (error) {
    mostrarToast("Erro ao reativar aula.", "erro");
    return;
  }

  mostrarToast("Aula reativada.");

  await carregarTurmasSistema();
  await carregarDadosFrequencia();

  renderizarTurmas();

  if (typeof renderizarEvolucao === "function") {
    renderizarEvolucao();
  }
}

if (formTurma) formTurma.addEventListener("submit", salvarTurma);
if (formCancelarAula) formCancelarAula.addEventListener("submit", salvarAulaCancelada);