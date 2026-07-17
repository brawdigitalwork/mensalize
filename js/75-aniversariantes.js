// ===============================
// 36. ANIVERSARIANTES — RELACIONAMENTO COM ALUNOS
// ===============================

/** Escapa dados do aluno antes de compor os cards via innerHTML. */
function escaparHtmlAniversariante(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

let acoesAniversariantesConfiguradas = false;

/** Delegação evita handlers inline e também funciona após rerender da lista. */
function configurarAcoesAniversariantes() {
  if (acoesAniversariantesConfiguradas) return;
  acoesAniversariantesConfiguradas = true;

  document.addEventListener("click", event => {
    const botao = event.target.closest?.("[data-aniversario-parabens]");
    if (!botao) return;
    enviarParabensWhatsApp(botao.dataset.aniversarioParabens || "");
  });
}

function dataNascimentoParaProximoAniversario(dataNascimento) {
  if (!dataNascimento) return null;

  const partes = String(dataNascimento).split("-");
  if (partes.length < 3) return null;

  const mes = Number(partes[1]) - 1;
  const dia = Number(partes[2]);

  if (!Number.isFinite(mes) || !Number.isFinite(dia)) return null;

  const hoje = dataHojeSemHora();
  const anoAtual = hoje.getFullYear();

  let aniversario = new Date(anoAtual, mes, dia);

  // Ajuste simples para 29/02 em ano não bissexto: considera 28/02.
  if (aniversario.getMonth() !== mes) {
    aniversario = new Date(anoAtual, mes + 1, 0);
  }

  if (aniversario < hoje) {
    aniversario = new Date(anoAtual + 1, mes, dia);
    if (aniversario.getMonth() !== mes) {
      aniversario = new Date(anoAtual + 1, mes + 1, 0);
    }
  }

  return aniversario;
}

function formatarDiaMes(dataNascimento) {
  if (!dataNascimento) return "--/--";
  const partes = String(dataNascimento).split("-");
  if (partes.length < 3) return "--/--";
  return `${partes[2]}/${partes[1]}`;
}

function diasAteAniversario(dataNascimento) {
  const aniversario = dataNascimentoParaProximoAniversario(dataNascimento);
  if (!aniversario) return null;

  const hoje = dataHojeSemHora();
  return Math.round((aniversario - hoje) / (1000 * 60 * 60 * 24));
}

function obterAniversariantesOrdenados() {
  const hoje = dataHojeSemHora();

  return (alunos || [])
    .filter(aluno => aluno.data_nascimento)
    .map(aluno => {
      const dias = diasAteAniversario(aluno.data_nascimento);
      const proximo = dataNascimentoParaProximoAniversario(aluno.data_nascimento);
      return {
        ...aluno,
        dias_aniversario: dias,
        proximo_aniversario: proximo,
        aniversario_hoje: dias === 0,
        aniversario_semana: dias !== null && dias >= 0 && dias <= 7,
        aniversario_mes: proximo && proximo.getMonth() === hoje.getMonth() && proximo.getFullYear() === hoje.getFullYear()
      };
    })
    .filter(aluno => aluno.dias_aniversario !== null)
    .sort((a, b) => a.dias_aniversario - b.dias_aniversario || String(a.nome).localeCompare(String(b.nome), "pt-BR"));
}

function resumoTextoAniversariante(aluno) {
  if (aluno.dias_aniversario === 0) return "Aniversário hoje";
  if (aluno.dias_aniversario === 1) return "Amanhã";
  return `Daqui a ${aluno.dias_aniversario} dias`;
}

function gerarMensagemParabens(aluno) {
  const primeiroNome = String(aluno.nome || "").trim().split(" ")[0] || "aluno";
  const empresa = nomeEmpresa || "Mensalize";

  return `${empresa} parabeniza você, ${primeiroNome}! 🎉\n\nQue seu novo ciclo venha com muita saúde, alegria, aprendizado e muitas conquistas. Feliz aniversário! 🥳`;
}

function obterTelefoneAniversariante(aluno) {
  return limparNumeroWhatsApp(aluno.telefone || aluno.responsavel_whatsapp || "");
}

function enviarParabensWhatsApp(alunoId) {
  const aluno = (alunos || []).find(item => String(item.id) === String(alunoId));

  if (!aluno) {
    mostrarToast("Aluno não encontrado.", "erro");
    return;
  }

  const telefone = obterTelefoneAniversariante(aluno);
  if (!telefone || telefone.length < 10) {
    mostrarToast("Aluno sem WhatsApp válido cadastrado.", "erro");
    return;
  }

  const mensagem = gerarMensagemParabens(aluno);
  window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`, "_blank");
}

function atualizarResumoAniversariantes() {
  const lista = obterAniversariantesOrdenados();
  const hoje = lista.filter(aluno => aluno.aniversario_hoje);
  const semana = lista.filter(aluno => aluno.aniversario_semana);
  const mes = lista.filter(aluno => aluno.aniversario_mes);

  const dashboardHoje = document.getElementById("dashboardAniversariosHoje");
  const dashboardSemana = document.getElementById("dashboardAniversariosSemana");
  const dashboardTexto = document.getElementById("dashboardAniversariantesTexto");
  const totalHoje = document.getElementById("totalAniversariantesHoje");
  const totalSemana = document.getElementById("totalAniversariantesSemana");
  const totalMes = document.getElementById("totalAniversariantesMes");

  if (dashboardHoje) dashboardHoje.textContent = hoje.length;
  if (dashboardSemana) dashboardSemana.textContent = semana.length;
  if (totalHoje) totalHoje.textContent = hoje.length;
  if (totalSemana) totalSemana.textContent = semana.length;
  if (totalMes) totalMes.textContent = mes.length;

  if (dashboardTexto) {
    if (hoje.length > 0) {
      dashboardTexto.textContent = `${hoje.length} aniversariante${hoje.length > 1 ? "s" : ""} hoje.`;
    } else if (semana.length > 0) {
      dashboardTexto.textContent = `${semana.length} aniversariante${semana.length > 1 ? "s" : ""} esta semana.`;
    } else if (mes.length > 0) {
      dashboardTexto.textContent = `${mes.length} aniversariante${mes.length > 1 ? "s" : ""} este mês.`;
    } else {
      dashboardTexto.textContent = "Nenhum aniversariante próximo.";
    }
  }
}

function criarItemAniversariante(aluno) {
  const telefone = obterTelefoneAniversariante(aluno);
  const telefoneValido = telefone && telefone.length >= 10;
  const nomeRaw = String(aluno.nome || "Aluno").trim() || "Aluno";
  const nomeSeguro = escaparHtmlAniversariante(nomeRaw);
  const inicialSegura = escaparHtmlAniversariante(nomeRaw.charAt(0).toUpperCase() || "A");
  const fotoUrlSegura = escaparHtmlAniversariante(aluno.foto_url || "");
  const alunoIdSeguro = escaparHtmlAniversariante(aluno.id || "");
  const foto = aluno.foto_url
    ? `<img src="${fotoUrlSegura}" alt="Foto de ${nomeSeguro}" class="aniversariante-foto">`
    : `<div class="aniversariante-avatar">${inicialSegura}</div>`;

  return `
    <div class="aniversariante-item">
      <div class="aniversariante-identidade">
        ${foto}
        <div>
          <strong>${nomeSeguro}</strong>
          <span>${formatarDiaMes(aluno.data_nascimento)} • ${resumoTextoAniversariante(aluno)}</span>
        </div>
      </div>
      <button type="button" class="btn-parabens" ${telefoneValido ? `data-aniversario-parabens="${alunoIdSeguro}"` : "disabled"}>
        Parabenizar
      </button>
    </div>
  `;
}

function blocoAniversariantes(titulo, descricao, lista) {
  if (!lista.length) return "";

  return `
    <article class="aniversariantes-bloco">
      <div class="painel-topo aniversariantes-bloco-topo">
        <div>
          <span class="page-eyebrow">${descricao}</span>
          <h2>${titulo}</h2>
        </div>
      </div>
      <div class="aniversariantes-lista-interna">
        ${lista.map(criarItemAniversariante).join("")}
      </div>
    </article>
  `;
}

function renderizarAniversariantes() {
  configurarAcoesAniversariantes();
  atualizarResumoAniversariantes();

  const container = document.getElementById("listaAniversariantes");
  if (!container) return;

  const lista = obterAniversariantesOrdenados();
  const hoje = lista.filter(aluno => aluno.aniversario_hoje);
  const semana = lista.filter(aluno => aluno.aniversario_semana && !aluno.aniversario_hoje);
  const mes = lista.filter(aluno => aluno.aniversario_mes && !aluno.aniversario_semana);

  if (!lista.length) {
    container.innerHTML = `<div class="empty-state-mini">Nenhum aluno com data de nascimento cadastrada.</div>`;
    return;
  }

  const html = [
    blocoAniversariantes("Hoje", "Aniversário hoje", hoje),
    blocoAniversariantes("Esta semana", "Próximos 7 dias", semana),
    blocoAniversariantes("Este mês", "Ainda neste mês", mes)
  ].join("");

  container.innerHTML = html || `<div class="empty-state-mini">Nenhum aniversariante próximo neste mês.</div>`;
}
