// 33. TURMAS + FREQUÊNCIA INTELIGENTE
// ===============================
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];


// ===============================
// 33.1 MULTI-TURMA — VÍNCULOS ALUNO ↔ TURMAS
// Fonte oficial: public.aluno_turmas.
// Compatibilidade: turma/turma_id continuam como turma principal.
// ===============================
let alunoTurmasVinculos = new Map();

function idsTurmasVinculadasAluno(alunoOuId) {
  const aluno = typeof alunoOuId === "object"
    ? alunoOuId
    : (alunos || []).find(item => String(item.id) === String(alunoOuId));

  if (!aluno) return [];

  const ids = new Set(
    (alunoTurmasVinculos.get(String(aluno.id)) || [])
      .map(id => String(id))
      .filter(Boolean)
  );

  // Fallback legado: garante que clientes antigos continuem funcionando
  // mesmo antes de gravar o primeiro vínculo em aluno_turmas.
  if (aluno.turma_id) ids.add(String(aluno.turma_id));

  return [...ids];
}

function turmasVinculadasAluno(aluno) {
  const ids = new Set(idsTurmasVinculadasAluno(aluno));

  const lista = (turmasCadastradas || [])
    .filter(turma => ids.has(String(turma.id)));

  // Compatibilidade para registros antigos que só possuem nome da turma.
  if (lista.length === 0 && aluno && aluno.turma) {
    const legado = encontrarTurmaPorNome(aluno.turma);
    if (legado) lista.push(legado);
  }

  return lista;
}

function nomesTurmasAluno(aluno) {
  const nomes = turmasVinculadasAluno(aluno)
    .map(turma => String(turma.nome || "").trim())
    .filter(Boolean);

  if (nomes.length === 0 && aluno && aluno.turma) {
    nomes.push(String(aluno.turma).trim());
  }

  return [...new Set(nomes)];
}

function textoTurmasAluno(aluno, fallback = "Sem turma") {
  const nomes = nomesTurmasAluno(aluno);
  return nomes.length ? nomes.join(" • ") : fallback;
}

function alunoVinculadoTurmaId(aluno, turmaId) {
  if (!aluno || !turmaId) return false;
  return idsTurmasVinculadasAluno(aluno).includes(String(turmaId));
}

async function carregarVinculosAlunoTurmas() {
  alunoTurmasVinculos = new Map();

  if (!usuarioAtual || !(alunos || []).length) return;

  const { data, error } = await supabaseClient
    .from("aluno_turmas")
    .select("aluno_id,turma_id")
    .eq("user_id", usuarioAtual.id);

  if (error) {
    console.warn("[Mensalize] Não foi possível carregar vínculos multi-turma:", error.message);
    return;
  }

  (data || []).forEach(vinculo => {
    const alunoId = String(vinculo.aluno_id || "");
    const turmaId = String(vinculo.turma_id || "");
    if (!alunoId || !turmaId) return;

    const atual = alunoTurmasVinculos.get(alunoId) || [];
    if (!atual.includes(turmaId)) atual.push(turmaId);
    alunoTurmasVinculos.set(alunoId, atual);
  });
}

function obterIdsTurmasSelecionadasFormulario() {
  const container = document.getElementById("turmasAlunoMultiLista");
  const ids = new Set();

  if (container) {
    container.querySelectorAll('input[data-turma-aluno-id]:checked').forEach(input => {
      if (input.dataset.turmaAlunoId) ids.add(String(input.dataset.turmaAlunoId));
    });
  }

  // A turma principal nunca pode ficar fora dos vínculos.
  if (turmaAluno && turmaAluno.value) {
    const principal = encontrarTurmaPorNome(turmaAluno.value);
    if (principal && principal.id) ids.add(String(principal.id));
  }

  return [...ids];
}

function escaparHtmlMultiTurma(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function atualizarResumoSeletorMultiTurmasAluno() {
  const resumo = document.getElementById("turmasAlunoMultiResumo");
  if (!resumo) return;

  const total = obterIdsTurmasSelecionadasFormulario().length;
  resumo.textContent = total === 0
    ? "Nenhuma selecionada"
    : `${total} turma${total === 1 ? "" : "s"} selecionada${total === 1 ? "" : "s"}`;
}

function renderizarSeletorMultiTurmasAluno(idsSelecionados = null) {
  const container = document.getElementById("turmasAlunoMultiLista");
  if (!container) return;

  const ativas = (turmasCadastradas || [])
    .filter(turma => turma.ativa !== false)
    .slice()
    .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));

  if (!ativas.length) {
    container.innerHTML = '<div class="empty-state-mini">Cadastre uma turma primeiro para vincular alunos.</div>';
    atualizarResumoSeletorMultiTurmasAluno();
    return;
  }

  const selecionados = idsSelecionados instanceof Set
    ? new Set([...idsSelecionados].map(String))
    : new Set(
        Array.isArray(idsSelecionados)
          ? idsSelecionados.map(String)
          : obterIdsTurmasSelecionadasFormulario()
      );

  container.innerHTML = ativas.map(turma => {
    const id = String(turma.id);
    const checked = selecionados.has(id) ? "checked" : "";
    const detalhe = [turma.horario, turma.professor].filter(Boolean).join(" • ");

    return `
      <label class="aluno-turma-chip">
        <input
          type="checkbox"
          data-turma-aluno-id="${id}"
          ${checked}
        >
        <span class="aluno-turma-chip-texto">
          <strong>${escaparHtmlMultiTurma(turma.nome || "Turma")}</strong>
          ${detalhe ? `<small>${escaparHtmlMultiTurma(detalhe)}</small>` : ""}
        </span>
      </label>
    `;
  }).join("");

  atualizarResumoSeletorMultiTurmasAluno();
}

function aplicarVinculosAlunoNoFormulario(aluno) {
  const selecionados = new Set(idsTurmasVinculadasAluno(aluno));
  renderizarSeletorMultiTurmasAluno(selecionados);
}

function resetarSeletorMultiTurmasAluno() {
  renderizarSeletorMultiTurmasAluno(new Set());
  atualizarResumoSeletorMultiTurmasAluno();
}

async function sincronizarVinculosAlunoTurmas(alunoId, turmaIds = []) {
  if (!usuarioAtual || !alunoId) {
    return { ok: false, error: new Error("Usuário ou aluno inválido.") };
  }

  const desejados = [...new Set((turmaIds || []).map(String).filter(Boolean))];
  const atuais = (alunoTurmasVinculos.get(String(alunoId)) || []).map(String);

  const adicionar = desejados.filter(id => !atuais.includes(id));
  const remover = atuais.filter(id => !desejados.includes(id));

  if (remover.length) {
    const { error } = await supabaseClient
      .from("aluno_turmas")
      .delete()
      .eq("user_id", usuarioAtual.id)
      .eq("aluno_id", alunoId)
      .in("turma_id", remover);

    if (error) return { ok: false, error };
  }

  if (adicionar.length) {
    const registros = adicionar.map(turmaId => ({
      user_id: usuarioAtual.id,
      aluno_id: alunoId,
      turma_id: turmaId
    }));

    const { error } = await supabaseClient
      .from("aluno_turmas")
      .upsert(registros, { onConflict: "aluno_id,turma_id" });

    if (error) return { ok: false, error };
  }

  alunoTurmasVinculos.set(String(alunoId), desejados);
  return { ok: true };
}

function configurarSeletorMultiTurmasAluno() {
  const container = document.getElementById("turmasAlunoMultiLista");

  if (container && !container.dataset.multiTurmaConfigurado) {
    container.dataset.multiTurmaConfigurado = "true";
    container.addEventListener("change", event => {
      if (!event.target.matches('input[data-turma-aluno-id]')) return;

      const input = event.target;
      const turmaId = String(input.dataset.turmaAlunoId || "");

      // Se a turma principal foi desmarcada, limpa o campo principal.
      if (!input.checked && turmaAluno && turmaAluno.value) {
        const principal = encontrarTurmaPorNome(turmaAluno.value);
        if (principal && String(principal.id) === turmaId) {
          turmaAluno.value = "";
        }
      }

      // Se ainda não existe principal, a primeira marcada assume esse papel.
      if (input.checked && turmaAluno && !turmaAluno.value) {
        const turma = (turmasCadastradas || []).find(item => String(item.id) === turmaId);
        if (turma) turmaAluno.value = turma.nome;
      }

      atualizarResumoSeletorMultiTurmasAluno();
    });
  }

  if (turmaAluno && !turmaAluno.dataset.multiTurmaConfigurado) {
    turmaAluno.dataset.multiTurmaConfigurado = "true";
    turmaAluno.addEventListener("change", () => {
      if (!turmaAluno.value) {
        atualizarResumoSeletorMultiTurmasAluno();
        return;
      }

      const principal = encontrarTurmaPorNome(turmaAluno.value);
      if (principal) {
        const input = document.querySelector(
          `#turmasAlunoMultiLista input[data-turma-aluno-id="${String(principal.id)}"]`
        );
        if (input) input.checked = true;
      }

      atualizarResumoSeletorMultiTurmasAluno();
    });
  }

  if (formAluno && !formAluno.dataset.multiTurmaResetConfigurado) {
    formAluno.dataset.multiTurmaResetConfigurado = "true";
    formAluno.addEventListener("reset", () => {
      setTimeout(resetarSeletorMultiTurmasAluno, 0);
    });
  }

  if (btnMostrarForm && !btnMostrarForm.dataset.multiTurmaNovoConfigurado) {
    btnMostrarForm.dataset.multiTurmaNovoConfigurado = "true";
    btnMostrarForm.addEventListener("click", () => {
      setTimeout(resetarSeletorMultiTurmasAluno, 0);
    });
  }

  // editarAluno é declarado em 30-financeiro-pagamentos.js, que já foi
  // carregado quando este arquivo (76) executa.
  if (typeof window.editarAluno === "function" && !window.editarAluno.__multiTurma) {
    const editarAlunoOriginal = window.editarAluno;

    const editarAlunoComMultiTurma = function(id) {
      const retorno = editarAlunoOriginal.apply(this, arguments);
      const aluno = (alunos || []).find(item => String(item.id) === String(id));

      setTimeout(() => {
        if (aluno) aplicarVinculosAlunoNoFormulario(aluno);
      }, 0);

      return retorno;
    };

    editarAlunoComMultiTurma.__multiTurma = true;
    window.editarAluno = editarAlunoComMultiTurma;
  }
}

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
  await carregarVinculosAlunoTurmas();
  preencherSelectsTurmas();
  configurarSeletorMultiTurmasAluno();
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
    .map(turma => {
      const nomeSeguro = escaparHtmlMultiTurma(turma.nome || "");
      const horarioSeguro = escaparHtmlMultiTurma(turma.horario || "");
      return `<option value="${nomeSeguro}">${nomeSeguro}${horarioSeguro ? " • " + horarioSeguro : ""}</option>`;
    })
    .join("");

  if (turmaAluno) {
    const valorAtual = turmaAluno.value || turmaAluno.getAttribute("data-valor-atual") || "";

    turmaAluno.innerHTML = `<option value="">Selecione a turma principal</option>${opcoes}`;

    if (valorAtual && ![...turmaAluno.options].some(opt => opt.value === valorAtual)) {
      turmaAluno.insertAdjacentHTML("beforeend", `<option value="" disabled>Turma antiga: ${escaparHtmlMultiTurma(valorAtual)} — selecione uma turma cadastrada</option>`);
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
      ${turmasCadastradas.map(turma => {
        const idSeguro = escaparHtmlMultiTurma(turma.id || "");
        const nomeSeguro = escaparHtmlMultiTurma(turma.nome || "Turma");
        const horarioSeguro = escaparHtmlMultiTurma(turma.horario || "");
        return `<option value="${idSeguro}">${nomeSeguro}${horarioSeguro ? " • " + horarioSeguro : ""}</option>`;
      }).join("")}
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

  renderizarSeletorMultiTurmasAluno();
  configurarSeletorMultiTurmasAluno();

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

function obterSessoesValidasTurma(turma, inicioISO, fimISO) {
  const sessoes = new Set();

  if (!turma || !Array.isArray(turma.dias_semana) || turma.dias_semana.length === 0) {
    return sessoes;
  }

  const inicio = parseDataISO(inicioISO);
  const fim = parseDataISO(fimISO);
  if (!inicio || !fim) return sessoes;

  const diasSet = new Set(
    turma.dias_semana
      .map(normalizarDiaSemanaParaNumero)
      .filter(dia => dia !== null)
  );

  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());

  while (cursor <= fim) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;

    if (diasSet.has(cursor.getDay()) && !aulaCanceladaPara(turma.nome, iso)) {
      sessoes.add(`${String(turma.id)}|${iso}`);
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return sessoes;
}

function calcularFrequenciaAluno(aluno) {
  if (!aluno) {
    return {
      percentual: null,
      presencas: 0,
      aulasValidas: 0,
      minimo: presencaMinimaPercentual || 70,
      periodo: frequenciaPeriodoMeses || 6,
      texto: "Aluno inválido"
    };
  }

  const turmasAluno = turmasVinculadasAluno(aluno);

  if (!turmasAluno.length) {
    return {
      percentual: null,
      presencas: 0,
      aulasValidas: 0,
      minimo: presencaMinimaPercentual || 70,
      periodo: frequenciaPeriodoMeses || 6,
      texto: "Turma não definida"
    };
  }

  const inicioPeriodo = dataMenosMesesISO(frequenciaPeriodoMeses || 6);
  const inicio = aluno.data_inicio_academia && aluno.data_inicio_academia > inicioPeriodo
    ? aluno.data_inicio_academia
    : inicioPeriodo;
  const fim = dataLocalISO();

  const sessoesValidas = new Set();

  turmasAluno.forEach(turma => {
    obterSessoesValidasTurma(turma, inicio, fim).forEach(chave => sessoesValidas.add(chave));
  });

  const idsTurmasAluno = new Set(turmasAluno.map(turma => String(turma.id)));
  const sessoesPresentes = new Set();

  (presencasPeriodo || []).forEach(p => {
    if (String(p.aluno_id) !== String(aluno.id)) return;
    if (p.presente !== true) return;
    if (!p.data_aula || p.data_aula < inicio || p.data_aula > fim) return;

    let turma = null;

    if (p.turma_id) {
      turma = turmasAluno.find(item => String(item.id) === String(p.turma_id)) || null;
    }

    if (!turma && p.turma) {
      turma = turmasAluno.find(
        item => normalizarTextoTurma(item.nome) === normalizarTextoTurma(p.turma)
      ) || null;
    }

    if (!turma || !idsTurmasAluno.has(String(turma.id))) return;
    if (aulaCanceladaPara(turma.nome, p.data_aula)) return;

    const chaveSessao = `${String(turma.id)}|${p.data_aula}`;
    if (!sessoesValidas.has(chaveSessao)) return;

    sessoesPresentes.add(chaveSessao);
  });

  const aulasValidas = sessoesValidas.size;
  const presencas = Math.min(sessoesPresentes.size, aulasValidas);
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
  if (!turma || !turma.id) return [];

  return (alunos || []).filter(aluno => {
    const status = String(aluno.status_aluno || "ativo").toLowerCase();
    if (status === "inativo") return false;

    return alunoVinculadoTurmaId(aluno, turma.id);
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
  const contadorCanceladasLista = document.getElementById("contadorAulasCanceladasLista");

  if (totalTurmas) totalTurmas.textContent = String((turmasCadastradas || []).length);
  if (turmasAtivas) turmasAtivas.textContent = String((turmasCadastradas || []).filter(t => t.ativa !== false).length);
  if (aulasCanceladasResumo) aulasCanceladasResumo.textContent = String((aulasCanceladas || []).length);
  if (contadorCanceladasLista) contadorCanceladasLista.textContent = String((aulasCanceladas || []).length);
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

  if (painelTurma) painelTurma.classList.add("escondido");
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

  if (listaTurmas && !listaTurmas.dataset.acoesInicializadas) {
    listaTurmas.dataset.acoesInicializadas = "true";
    listaTurmas.addEventListener("click", event => {
      const botao = event.target.closest("[data-acao-turma]");
      if (!botao || !listaTurmas.contains(botao)) return;

      const id = botao.dataset.turmaId || "";
      if (botao.dataset.acaoTurma === "editar") editarTurma(id);
      if (botao.dataset.acaoTurma === "remover") removerTurma(id);
    });
  }

  if (listaAulasCanceladas && !listaAulasCanceladas.dataset.acoesInicializadas) {
    listaAulasCanceladas.dataset.acoesInicializadas = "true";
    listaAulasCanceladas.addEventListener("click", event => {
      const botao = event.target.closest("[data-acao-aula-cancelada]");
      if (!botao || !listaAulasCanceladas.contains(botao)) return;

      if (botao.dataset.acaoAulaCancelada === "reativar") {
        removerAulaCancelada(botao.dataset.aulaCanceladaId || "");
      }
    });
  }
}

function renderizarTurmas() {
  atualizarResumoTurmasPremium();

  if (listaTurmas) {
    if (!turmasCadastradas.length) {
      listaTurmas.innerHTML = `<div class="empty-state-mini">Nenhuma turma cadastrada ainda.</div>`;
    } else {
      listaTurmas.innerHTML = turmasCadastradas.map(turma => {
        const idSeguro = escaparHtmlMultiTurma(turma.id || "");
        const nomeSeguro = escaparHtmlMultiTurma(turma.nome || "Turma");
        const horarioSeguro = escaparHtmlMultiTurma(turma.horario || "");
        const professorSeguro = escaparHtmlMultiTurma(turma.professor || "");
        const turmaAtiva = turma.ativa !== false;

        return `
          <article class="turma-item ${turmaAtiva ? "" : "inativa"}">
            <div class="turma-item-conteudo">
              <div class="turma-item-cabecalho">
                <strong>${nomeSeguro}</strong>
                <span class="turma-status-badge ${turmaAtiva ? "ativa" : "inativa"}">${turmaAtiva ? "Ativa" : "Inativa"}</span>
              </div>

              <div class="turma-agenda">
                <span>${diasSemanaTexto(turma.dias_semana)}</span>
                ${horarioSeguro ? `<span>${horarioSeguro}</span>` : ""}
              </div>

              <div class="turma-dados">
                <span class="turma-dado">
                  <small>Professor</small>
                  <b>${professorSeguro || "Não informado"}</b>
                </span>
                <span class="turma-dado">
                  <small>Alunos</small>
                  <b>${textoQuantidadeAlunosTurma(turma)}</b>
                </span>
              </div>
            </div>

            <div class="turma-item-acoes">
              <button type="button" class="acao-secundaria" data-acao-turma="editar" data-turma-id="${idSeguro}">Editar</button>
              <button type="button" class="turma-acao-remover" data-acao-turma="remover" data-turma-id="${idSeguro}">Remover</button>
            </div>
          </article>
        `;
      }).join("");
    }
  }

  if (listaAulasCanceladas) {
    if (!aulasCanceladas.length) {
      listaAulasCanceladas.innerHTML = `<div class="empty-state-mini">Nenhuma aula cancelada cadastrada.</div>`;
    } else {
      listaAulasCanceladas.innerHTML = aulasCanceladas.slice(0, 20).map(aula => {
        const idSeguro = escaparHtmlMultiTurma(aula.id || "");
        const turmaSegura = escaparHtmlMultiTurma(turmaDaAulaCancelada(aula) || "Turma");
        const motivoSeguro = escaparHtmlMultiTurma(aula.motivo || "");
        const observacaoSegura = escaparHtmlMultiTurma(aula.observacao || "");

        return `
          <article class="turma-item aula-cancelada-item">
            <div class="turma-item-conteudo">
              <strong>${turmaSegura}</strong>
              <span>${formatarData(aula.data_aula)}${motivoSeguro ? " • " + motivoSeguro : ""}</span>
              ${observacaoSegura ? `<small>${observacaoSegura}</small>` : ""}
            </div>

            <button type="button" class="acao-secundaria" data-acao-aula-cancelada="reativar" data-aula-cancelada-id="${idSeguro}">Reativar</button>
          </article>
        `;
      }).join("");
    }
  }
}

async function prepararTelaTurmas() {
  inicializarTelaTurmasPremium();
  await carregarTurmasSistema();
  renderizarTurmas();
  fecharPainelFormularioTurma();
  fecharPainelCancelarAula();
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

// Inicializa a interface multi-turma sem alterar a ordem atual dos módulos.
configurarSeletorMultiTurmasAluno();
