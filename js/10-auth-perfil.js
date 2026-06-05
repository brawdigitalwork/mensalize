// 07. INICIALIZAÇÃO DO SISTEMA
// ===============================

// iniciarSistema() agora é chamado em js/99-app.js, após carregar todos os módulos.

/** Verifica se já existe sessão ativa e abre login ou app. */
async function iniciarSistema() {
  setFiltro(typeof obterFiltroSalvoAlunos === "function" ? obterFiltroSalvoAlunos() : "todos");
  const { data } = await supabaseClient.auth.getSession();

  if (data.session) {
    usuarioAtual = data.session.user;
    sincronizarEstado();

    const acessoLiberado = await mostrarApp();
    if (!acessoLiberado) return;

    await carregarAlunos();
  } else {
    mostrarLogin();
  }
}

// ===============================
// 08. CONTROLE DE TELAS — LOGIN / APP
// ===============================

/** Mostra a tela de login e limpa dados sensíveis dos campos. */
function mostrarLogin() {
  telaLogin.classList.remove("escondido");
  app.classList.add("escondido");
  telaAdmin.classList.add("escondido");

  btnAdmin.classList.add("escondido");

  emailLogin.value = "";
  senhaLogin.value = "";
  mensagemLogin.textContent = "";
}

/** Bloqueia a abertura do app quando o Admin desativa a conta do cliente. */
async function bloquearAcessoCliente(motivo = "Conta bloqueada pelo administrador.") {
  telaLogin.classList.remove("escondido");
  app.classList.add("escondido");
  telaAdmin.classList.add("escondido");
  btnAdmin.classList.add("escondido");

  if (emailLogin) emailLogin.value = usuarioAtual?.email || "";
  if (senhaLogin) senhaLogin.value = "";
  if (mensagemLogin) {
    mensagemLogin.textContent = motivo;
    mensagemLogin.classList.add("erro");
  }

  try {
    await supabaseClient.auth.signOut();
  } catch (erro) {
    console.warn("Erro ao encerrar sessão bloqueada:", erro);
  }

  usuarioAtual = null;
  sincronizarEstado();
}

/** Mostra o app principal e carrega permissões do usuário. */
async function mostrarApp() {
  telaLogin.classList.add("escondido");
  telaAdmin.classList.add("escondido");
  app.classList.remove("escondido");

  emailUsuario.textContent = usuarioAtual.email;

  return await carregarPerfil();
}

// ===============================
// 09. PERFIL DO USUÁRIO / ADMIN
// ===============================

/** Carrega perfil do usuário logado para saber limite e permissão de admin. */
async function carregarPerfil() {
  btnAdmin.classList.add("escondido");
  usuarioEhAdmin = false;
  limiteAlunos = 30;

const { data, error } = await supabaseClient
  .from("profiles")
  .select(`
    is_admin,
    limite_alunos,
    nome_empresa,
    whatsapp_professor,
    pix_copia_cola,
    modulo_fight,

    modulo_evolucao,
    modulo_presenca,
    modulo_avisos,

    modulo_ranking,
    modulo_desafio,
    modulo_turmas,
    modulo_fight,

    plano,
    status,
    pode_usar,

    presenca_minima_percentual,
    frequencia_periodo_meses,

    ranking_geral_ativo,
    ranking_turma_ativo,
    ranking_turmas_ativo,
    ranking_minimo_aulas
  `)
  .eq("id", usuarioAtual.id)
  .single();

if (error) {
  console.log("Erro ao carregar perfil:", error.message);
  return false;
}

  usuarioEhAdmin = data.is_admin === true;
  limiteAlunos = data.limite_alunos || 30;
  
  nomeEmpresa = data.nome_empresa || "Mensalize";

  if (nomeClienteDashboard) {
    nomeClienteDashboard.textContent = nomeEmpresa;
  }

  if (perfilNomeEmpresa) {
    perfilNomeEmpresa.value = nomeEmpresa;
  }

  if (perfilWhatsApp) {
    perfilWhatsApp.value = data.whatsapp_professor || "";
  }

  if (perfilPixCopiaCola) {
    perfilPixCopiaCola.value = data.pix_copia_cola || "";
  }

  window.moduloFightAtivo = data.modulo_fight === true;

  moduloEvolucaoAtivo = data.modulo_evolucao !== false;
  moduloPresencaAtivo = data.modulo_presenca === true;
  moduloAvisosAtivo = data.modulo_avisos === true;

  presencaMinimaPercentual = Number(data.presenca_minima_percentual || 70);
  frequenciaPeriodoMeses = Number(data.frequencia_periodo_meses || 6);
  rankingGeralAtivo = data.ranking_geral_ativo !== false;
  rankingTurmaAtivo = data.ranking_turma_ativo !== false;
  rankingTurmasAtivo = data.ranking_turmas_ativo !== false;
  rankingMinimoAulas = Number(data.ranking_minimo_aulas || 4);

planoAtual = data.plano || "trial";
statusConta = data.status || "ativo";
podeUsarSistema = data.pode_usar !== false && statusConta !== "bloqueado";

if (!usuarioEhAdmin && !podeUsarSistema) {
  await bloquearAcessoCliente("Sua conta está bloqueada. Fale com o administrador do Mensalize para regularizar o acesso.");
  return false;
}

moduloRankingAtivo = data.modulo_ranking !== false;
moduloDesafioAtivo = data.modulo_desafio !== false;
moduloTurmasAtivo = data.modulo_turmas !== false;
window.moduloFightAtivo = data.modulo_fight === true;

document.querySelectorAll(".modulo-fight").forEach(el => {
  el.classList.toggle("escondido", !window.moduloFightAtivo);
});


  if (perfilModuloEvolucao) perfilModuloEvolucao.checked = moduloEvolucaoAtivo;
  if (perfilModuloPresenca) perfilModuloPresenca.checked = moduloPresencaAtivo;
  if (perfilModuloAvisos) perfilModuloAvisos.checked = moduloAvisosAtivo;
  if (perfilPresencaMinima) perfilPresencaMinima.value = presencaMinimaPercentual;
  if (perfilPeriodoFrequencia) perfilPeriodoFrequencia.value = frequenciaPeriodoMeses;
  if (perfilRankingGeral) perfilRankingGeral.checked = rankingGeralAtivo;
  if (perfilRankingTurma) perfilRankingTurma.checked = rankingTurmaAtivo;
  if (perfilRankingTurmas) perfilRankingTurmas.checked = rankingTurmasAtivo;
  if (perfilRankingMinimoAulas) perfilRankingMinimoAulas.value = rankingMinimoAulas;
  aplicarModulosInterface();
  if (typeof aplicarModuloFightInterface === "function") aplicarModuloFightInterface();
  sincronizarEstado();

    const btnDesafio = document.getElementById("btnNavDesafio");
  const btnTurmas = document.getElementById("btnNavTurmas");

if (btnDesafio) {
  btnDesafio.classList.toggle(
    "escondido",
    !moduloDesafioAtivo
  );
}

if (btnTurmas) {
  btnTurmas.classList.toggle(
    "escondido",
    !moduloTurmasAtivo
  );
}

  if (usuarioEhAdmin) {
    btnAdmin.classList.remove("escondido");
  }

  return true;
}


// ===============================
// CRIAR CONTA
// ===============================



// ===============================
// 10. AUTENTICAÇÃO — ENTRAR
// ===============================

btnEntrar.addEventListener("click", async function() {
  const email = emailLogin.value.trim();
  const senha = senhaLogin.value.trim();

  if (!email || !senha) {
    mensagemLogin.textContent = "Preencha e-mail e senha.";
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: senha
  });

  if (error) {
    mensagemLogin.textContent = error.message;
    return;
  }

  usuarioAtual = data.user;
  sincronizarEstado();



  const acessoLiberado = await mostrarApp();
  if (!acessoLiberado) return;

  await carregarAlunos();
});

emailLogin.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    btnEntrar.click();
  }
});

senhaLogin.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    btnEntrar.click();
  }
});

// ===============================
// 11. AUTENTICAÇÃO — SAIR
// ===============================

btnSair.addEventListener("click", async function() {
  await supabaseClient.auth.signOut();

  usuarioAtual = null;
  alunos = [];
  sincronizarEstado();
  alunoEditandoId = null;
  usuarioEhAdmin = false;
  limiteAlunos = 30;

  formAluno.reset();
  modalAluno.classList.add("escondido");
  mostrarLogin();
});

// ===============================
