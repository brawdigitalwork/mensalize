// 86. ONBOARDING DO PROFESSOR — ATIVAÇÃO INICIAL
// ================================================================
// Checklist profissional calculado automaticamente pelo estado real da conta.
// Não cria tabela nova: usa profiles, alunos e pagamentos já existentes.

const MENSALIZE_ONBOARDING_OCULTO_PREFIX = "mensalize:onboarding-professor-oculto";
let onboardingProfessorPagamentoRegistradoCache = null;
let onboardingProfessorAtualizando = false;
let onboardingProfessorPendente = false;

function onboardingProfessorHojeISO() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

function onboardingProfessorChaveOculto() {
  const userId = usuarioAtual?.id || "anonimo";
  return `${MENSALIZE_ONBOARDING_OCULTO_PREFIX}:${userId}`;
}

function onboardingProfessorOcultoHoje() {
  try {
    return localStorage.getItem(onboardingProfessorChaveOculto()) === onboardingProfessorHojeISO();
  } catch (erro) {
    console.warn("Erro ao ler preferência do onboarding:", erro);
    return false;
  }
}

function onboardingProfessorOcultarHoje() {
  try {
    localStorage.setItem(onboardingProfessorChaveOculto(), onboardingProfessorHojeISO());
  } catch (erro) {
    console.warn("Erro ao salvar preferência do onboarding:", erro);
  }

  const card = document.getElementById("onboardingProfessorCard");
  if (card) card.classList.add("escondido");
}

function onboardingProfessorTextoSeguro(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function onboardingProfessorNumeroWhatsApp(valor) {
  if (typeof limparNumeroWhatsApp === "function") return limparNumeroWhatsApp(valor);
  return String(valor || "").replace(/\D/g, "");
}

function onboardingProfessorAcademiaConfigurada() {
  const nome = String(perfilNomeEmpresa?.value || nomeEmpresa || "").trim();
  const whatsapp = onboardingProfessorNumeroWhatsApp(perfilWhatsApp?.value || "");
  return Boolean(nome && nome.toLowerCase() !== "mensalize" && whatsapp.length >= 10);
}

function onboardingProfessorPixConfigurado() {
  const pix = String(document.getElementById("perfilPixCopiaCola")?.value || "").trim();
  return pix.length >= 10;
}

function onboardingProfessorTemAluno() {
  return Array.isArray(alunos) && alunos.length > 0;
}

function onboardingProfessorTemPortalAluno() {
  return Array.isArray(alunos) && alunos.some(aluno => Boolean(aluno && aluno.id));
}

async function onboardingProfessorTemPagamentoRegistrado({ forcar = false } = {}) {
  if (!usuarioAtual) return false;

  if (typeof alunosPagosMes !== "undefined" && alunosPagosMes instanceof Set && alunosPagosMes.size > 0) {
    onboardingProfessorPagamentoRegistradoCache = true;
    return true;
  }

  if (!forcar && onboardingProfessorPagamentoRegistradoCache !== null) {
    return onboardingProfessorPagamentoRegistradoCache;
  }

  const { data, error } = await supabaseClient
    .from("pagamentos")
    .select("id")
    .eq("user_id", usuarioAtual.id)
    .limit(1);

  if (error) {
    console.warn("Erro ao verificar pagamento para onboarding:", error.message);
    return false;
  }

  onboardingProfessorPagamentoRegistradoCache = Array.isArray(data) && data.length > 0;
  return onboardingProfessorPagamentoRegistradoCache;
}

function onboardingProfessorPassos(temPagamento) {
  return [
    {
      id: "academia",
      icone: "🏢",
      titulo: "Configure sua academia",
      descricao: "Informe nome e WhatsApp para deixar cobranças e portal do aluno com identidade profissional.",
      concluido: onboardingProfessorAcademiaConfigurada(),
      acao: "config-academia",
      acaoTexto: "Configurar"
    },
    {
      id: "pix",
      icone: "💸",
      titulo: "Cadastre o Pix",
      descricao: "Esse Pix aparece no portal do aluno e reduz atrito para receber mensalidades.",
      concluido: onboardingProfessorPixConfigurado(),
      acao: "config-pix",
      acaoTexto: "Cadastrar Pix"
    },
    {
      id: "aluno",
      icone: "👥",
      titulo: "Cadastre o primeiro aluno",
      descricao: "A partir do primeiro aluno, o dashboard começa a mostrar cobrança, vencimento e previsão.",
      concluido: onboardingProfessorTemAluno(),
      acao: "novo-aluno",
      acaoTexto: "Novo aluno"
    },
    {
      id: "portal",
      icone: "📲",
      titulo: "Envie o portal do aluno",
      descricao: "Compartilhe o link individual para o aluno acompanhar mensalidade, Pix e dados da academia.",
      concluido: onboardingProfessorTemPortalAluno(),
      acao: "portal-aluno",
      acaoTexto: "Enviar link"
    },
    {
      id: "pagamento",
      icone: "✅",
      titulo: "Registre o primeiro pagamento",
      descricao: "Feche o ciclo: aluno cadastrado, cobrança enviada e pagamento marcado no financeiro.",
      concluido: Boolean(temPagamento),
      acao: "registrar-pagamento",
      acaoTexto: "Registrar"
    }
  ];
}

function onboardingProfessorInsight(concluidos, total, passos) {
  if (concluidos === 0) return "Comece configurando academia e Pix. Isso deixa o sistema pronto para cobrar com aparência profissional.";
  if (!passos.find(p => p.id === "aluno")?.concluido) return "O próximo marco importante é cadastrar o primeiro aluno. Sem aluno, o dashboard não gera ação.";
  if (!passos.find(p => p.id === "portal")?.concluido) return "Agora envie o portal do aluno. Isso aumenta valor percebido e reduz mensagens manuais no WhatsApp.";
  if (!passos.find(p => p.id === "pagamento")?.concluido) return "Falta registrar o primeiro pagamento. Esse é o momento em que o Mensalize começa a provar valor financeiro.";
  return "Configuração inicial concluída. Agora o foco é manter cadastros, cobranças e pagamentos atualizados.";
}

function renderizarOnboardingProfessor(passos) {
  const card = document.getElementById("onboardingProfessorCard");
  const lista = document.getElementById("onboardingProfessorLista");
  const barra = document.getElementById("onboardingProfessorBarra");
  const percentualEl = document.getElementById("onboardingProfessorPercentual");
  const progressoEl = document.getElementById("onboardingProfessorProgressoTexto");
  const resumoEl = document.getElementById("onboardingProfessorResumo");
  const insightEl = document.getElementById("onboardingProfessorInsight");

  if (!card || !lista) return;

  if (!usuarioAtual || usuarioEhAdmin || onboardingProfessorOcultoHoje()) {
    card.classList.add("escondido");
    return;
  }

  const total = passos.length || 1;
  const concluidos = passos.filter(passo => passo.concluido).length;
  const percentual = Math.round((concluidos / total) * 100);

  // Quando tudo está pronto, o onboarding sai do caminho.
  if (concluidos >= total) {
    card.classList.add("escondido");
    return;
  }

  if (percentualEl) percentualEl.textContent = `${percentual}%`;
  if (progressoEl) progressoEl.textContent = `${concluidos} de ${total} concluídos`;
  if (barra) barra.style.width = `${percentual}%`;
  if (resumoEl) {
    resumoEl.textContent = concluidos === 0
      ? "Complete os passos essenciais para tirar valor do Mensalize nos primeiros minutos."
      : "Você já começou. Continue até registrar a primeira cobrança para ativar o uso real do sistema.";
  }
  if (insightEl) insightEl.textContent = onboardingProfessorInsight(concluidos, total, passos);

  lista.innerHTML = passos.map(passo => `
    <article class="onboarding-passo-card ${passo.concluido ? "concluido" : "pendente"}" data-onboarding-passo="${onboardingProfessorTextoSeguro(passo.id)}">
      <div class="onboarding-passo-icone" aria-hidden="true">${onboardingProfessorTextoSeguro(passo.icone)}</div>
      <span class="onboarding-passo-status">${passo.concluido ? "Concluído" : "Pendente"}</span>
      <strong>${onboardingProfessorTextoSeguro(passo.titulo)}</strong>
      <p>${onboardingProfessorTextoSeguro(passo.descricao)}</p>
      <button type="button" class="acao-secundaria" data-onboarding-acao="${onboardingProfessorTextoSeguro(passo.acao)}">
        ${onboardingProfessorTextoSeguro(passo.acaoTexto)}
      </button>
    </article>
  `).join("");

  card.classList.remove("escondido");
}

async function atualizarOnboardingProfessor(opcoes = {}) {
  if (onboardingProfessorAtualizando) {
    onboardingProfessorPendente = true;
    return;
  }

  onboardingProfessorAtualizando = true;

  try {
    const temPagamento = await onboardingProfessorTemPagamentoRegistrado({ forcar: opcoes.forcarPagamento === true });
    renderizarOnboardingProfessor(onboardingProfessorPassos(temPagamento));
  } finally {
    onboardingProfessorAtualizando = false;

    if (onboardingProfessorPendente) {
      onboardingProfessorPendente = false;
      setTimeout(() => atualizarOnboardingProfessor(opcoes), 120);
    }
  }
}

function onboardingProfessorSelecionarAbaConfig(aba) {
  const botao = document.querySelector(`.config-aba[data-config-aba="${aba}"]`);
  if (botao) botao.click();
}

function onboardingProfessorFocarCampo(campo) {
  setTimeout(() => {
    if (!campo) return;
    campo.scrollIntoView({ behavior: "smooth", block: "center" });
    campo.focus({ preventScroll: true });
  }, 120);
}

function onboardingProfessorAbrirPerfil(aba = "academia") {
  if (typeof abrirViewPrincipal === "function") abrirViewPrincipal("perfil");
  onboardingProfessorSelecionarAbaConfig(aba);
}

function onboardingProfessorExecutarAcao(acao) {
  if (acao === "config-academia") {
    onboardingProfessorAbrirPerfil("academia");
    onboardingProfessorFocarCampo(perfilNomeEmpresa || perfilWhatsApp);
    return;
  }

  if (acao === "config-pix") {
    onboardingProfessorAbrirPerfil("financeiro");
    onboardingProfessorFocarCampo(document.getElementById("perfilPixCopiaCola"));
    return;
  }

  if (acao === "novo-aluno") {
    if (btnMostrarForm) btnMostrarForm.click();
    return;
  }

  if (acao === "portal-aluno") {
    const alunoComPortal = (alunos || []).find(aluno => aluno && aluno.id && onboardingProfessorNumeroWhatsApp(aluno.telefone).length >= 10)
      || (alunos || []).find(aluno => aluno && aluno.id);

    if (alunoComPortal && typeof enviarLinkPaginaAluno === "function") {
      enviarLinkPaginaAluno(alunoComPortal.id);
      return;
    }

    if (!onboardingProfessorTemAluno()) {
      mostrarToast("Cadastre um aluno antes de enviar o portal.", "erro");
      if (btnMostrarForm) btnMostrarForm.click();
      return;
    }

    mostrarToast("Cadastre um WhatsApp válido para enviar o acesso.", "erro");
    if (typeof abrirViewPrincipal === "function") abrirViewPrincipal("alunos");
    return;
  }

  if (acao === "registrar-pagamento") {
    if (!onboardingProfessorTemAluno()) {
      mostrarToast("Cadastre um aluno antes de registrar pagamento.", "erro");
      if (btnMostrarForm) btnMostrarForm.click();
      return;
    }

    if ((alunos || []).length === 1 && typeof marcarComoPago === "function") {
      marcarComoPago(alunos[0].id);
      return;
    }

    if (typeof abrirViewPrincipal === "function") abrirViewPrincipal("financeiro");
    mostrarToast("Escolha o aluno e registre o pagamento no financeiro.");
  }
}

function inicializarOnboardingProfessor() {
  const lista = document.getElementById("onboardingProfessorLista");
  const btnOcultar = document.getElementById("btnOnboardingOcultarHoje");

  if (lista && lista.dataset.onboardingConfigurado !== "true") {
    lista.dataset.onboardingConfigurado = "true";
    lista.addEventListener("click", event => {
      const botao = event.target.closest("[data-onboarding-acao]");
      if (!botao) return;
      onboardingProfessorExecutarAcao(botao.dataset.onboardingAcao);
    });
  }

  if (btnOcultar && btnOcultar.dataset.onboardingConfigurado !== "true") {
    btnOcultar.dataset.onboardingConfigurado = "true";
    btnOcultar.addEventListener("click", onboardingProfessorOcultarHoje);
  }
}
