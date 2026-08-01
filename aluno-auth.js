// ============================================================================
// MENSALIZE ALUNO — AUTENTICAÇÃO REAL v1
// Usuário escolhido pelo aluno + senha.
// Recuperação somente por link temporário emitido pelo professor.
// ============================================================================

(function inicializarModuloAuthAluno(global) {
  "use strict";

  const USERNAME_MIN = 4;
  const USERNAME_MAX = 24;
  const SENHA_MIN = 8;
  const SENHA_MAX = 72;
  const USERNAME_ORIENTACAO =
    "Use de 4 a 24 caracteres: letras minúsculas, números, ponto (.) ou sublinhado (_). Não comece nem termine com ponto ou sublinhado.";
  const SENHAS_COMUNS = new Set([
    "senha123.",
    "senha.123",
    "aluno123.",
    "aluno.123",
    "admin123.",
    "qwerty1!",
    "password1!",
    "mensalize1.",
    "academia1.",
    "jiujitsu1.",
  ]);
  const SEQUENCIAS_NUMERICAS = [
    "0123", "1234", "2345", "3456", "4567", "5678", "6789", "7890", "8901", "9012",
    "9876", "8765", "7654", "6543", "5432", "4321", "3210", "2109", "1098", "0987",
    "0000", "1111", "2222", "3333", "4444",
    "5555", "6666", "7777", "8888", "9999",
  ];

  let clienteSupabase = null;
  let carregarAlunoComCodigo = null;
  let tokenAcessoAtual = "";
  let temporizadorUsername = null;

  function $(id) {
    return document.getElementById(id);
  }

  function normalizarUsername(valor) {
    return String(valor || "")
      .trim()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9._]/g, "");
  }

  function usernameValido(valor) {
    const original = String(valor || "").trim();
    const username = normalizarUsername(original);
    if (original !== username) return false;
    if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) return false;
    return /^[a-z0-9][a-z0-9._]*[a-z0-9]$/.test(username);
  }

  function validarSenhaNova(senha) {
    if (senha.length < SENHA_MIN || senha.length > SENHA_MAX) {
      return "Use uma senha de 8 a 72 caracteres.";
    }

    const temLetra = /\p{L}/u.test(senha);
    const temNumero = /\p{N}/u.test(senha);
    const temCaractereEspecial = /[^\p{L}\p{N}\s]/u.test(senha);

    if (!temLetra || !temNumero || !temCaractereEspecial) {
      return "Combine pelo menos uma letra, um número e um caractere especial, como ponto (.).";
    }

    if (SEQUENCIAS_NUMERICAS.some((sequencia) => senha.includes(sequencia))) {
      return "Não use sequências ou repetições numéricas, como 1234, 4321 ou 0000.";
    }

    if (SENHAS_COMUNS.has(senha.toLowerCase())) {
      return "Essa senha é muito comum. Escolha uma combinação diferente.";
    }

    return "";
  }

  function limparTokenDoFragmento() {
    try {
      const url = new URL(window.location.href);
      if (!url.hash) return;
      const parametros = new URLSearchParams(url.hash.slice(1));
      if (!parametros.has("acesso")) return;
      parametros.delete("acesso");
      const fragmento = parametros.toString();
      window.history.replaceState(
        null,
        "",
        `${url.pathname}${url.search}${fragmento ? `#${fragmento}` : ""}`,
      );
    } catch (erro) {
      console.warn("[Mensalize Aluno] Não foi possível limpar o link temporário:", erro);
    }
  }

  function obterTokenAcessoDaUrl() {
    try {
      const parametros = new URLSearchParams(window.location.hash.slice(1));
      return String(parametros.get("acesso") || "").trim();
    } catch (_) {
      return "";
    }
  }

  function mostrarTelaAuth(modo = "login") {
    const tela = $("portalAuthAluno");
    const login = $("authAlunoLoginView");
    const link = $("authAlunoLinkView");
    const loading = $("estadoInicial");
    const portal = $("portalConteudo");
    const erro = $("estadoErro");

    loading?.classList.add("escondido");
    portal?.classList.add("escondido");
    erro?.classList.add("escondido");
    tela?.classList.remove("escondido");

    login?.classList.toggle("escondido", modo !== "login");
    link?.classList.toggle("escondido", modo !== "link");
    ocultarSenhas();
  }

  function mostrarCarregando(mensagem = "Carregando seu acesso...") {
    const tela = $("portalAuthAluno");
    const loading = $("estadoInicial");
    const portal = $("portalConteudo");
    const erro = $("estadoErro");
    const texto = loading?.querySelector(".loading-card strong");

    tela?.classList.add("escondido");
    portal?.classList.add("escondido");
    erro?.classList.add("escondido");
    loading?.classList.remove("escondido");

    if (texto) texto.textContent = mensagem;
  }

  function definirMensagem(id, mensagem, tipo = "") {
    const elemento = $(id);
    if (!elemento) return;
    elemento.textContent = mensagem || "";
    elemento.classList.toggle("is-error", tipo === "erro");
    elemento.classList.toggle("is-success", tipo === "sucesso");
  }

  function ocultarSenhas() {
    document.querySelectorAll("[data-password-target]").forEach((botao) => {
      const campo = $(botao.getAttribute("data-password-target"));
      if (campo) campo.type = "password";
      botao.textContent = "VER";
      botao.setAttribute("aria-label", "Mostrar senha");
      botao.setAttribute("aria-pressed", "false");
    });
  }

  function configurarVisibilidadeSenhas() {
    document.querySelectorAll("[data-password-target]").forEach((botao) => {
      botao.addEventListener("click", () => {
        const campo = $(botao.getAttribute("data-password-target"));
        if (!campo) return;

        const deveMostrar = campo.type === "password";
        campo.type = deveMostrar ? "text" : "password";
        botao.textContent = deveMostrar ? "OCULTAR" : "VER";
        botao.setAttribute(
          "aria-label",
          deveMostrar ? "Ocultar senha" : "Mostrar senha",
        );
        botao.setAttribute("aria-pressed", String(deveMostrar));
        campo.focus({ preventScroll: true });
      });
    });
  }

  async function invocarAlunoAuth(acao, payload = {}) {
    const { data, error } = await clienteSupabase.functions.invoke("aluno-auth", {
      body: { acao, ...payload }
    });

    if (error) {
      console.warn("[Mensalize Aluno] Falha ao chamar aluno-auth:", error);
      try {
        const detalhe = await error.context?.clone?.().json();
        if (detalhe?.mensagem) return detalhe;
      } catch (_) {}
      return { ok: false, mensagem: "Serviço de acesso indisponível no momento." };
    }

    return data || { ok: false, mensagem: "Resposta inválida do serviço de acesso." };
  }

  async function definirSessao(sessao) {
    if (!sessao?.access_token || !sessao?.refresh_token) {
      throw new Error("Sessão de acesso inválida.");
    }

    const { error } = await clienteSupabase.auth.setSession({
      access_token: sessao.access_token,
      refresh_token: sessao.refresh_token
    });

    if (error) throw error;
  }

  async function abrirPortalAutenticado() {
    mostrarCarregando("Abrindo sua área segura...");

    global.MENSALIZE_ALUNO_AUTENTICADO = true;

    const btnSair = $("btnEsquecerAcessoAluno");
    const btnCompartilhar = $("btnCompartilhar");
    if (btnSair) {
      const textoSair = btnSair.querySelector("span");
      if (textoSair) textoSair.textContent = "SAIR";
      else btnSair.textContent = "SAIR";
      btnSair.setAttribute("aria-label", "SAIR");
    }
    if (btnCompartilhar) btnCompartilhar.textContent = "🔗 Compartilhar portal";

    const portalCarregado = await carregarAlunoComCodigo();
    if (portalCarregado === false) {
      console.warn("[Mensalize Aluno] Sessão sem vínculo de aluno ativo.");
      await clienteSupabase.auth.signOut({ scope: "local" }).catch(() => {});
      global.MENSALIZE_ALUNO_AUTENTICADO = false;
      mostrarTelaAuth("login");
      definirMensagem(
        "msgAuthAlunoLogin",
        "Não foi possível vincular esta sessão ao aluno. Peça um novo link ao professor.",
        "erro"
      );
    }
  }

  async function tentarSessaoExistente() {
    try {
      const { data: sessaoData } = await clienteSupabase.auth.getSession();
      if (!sessaoData?.session) return false;

      const { data: usuarioData, error } = await clienteSupabase.auth.getUser();
      if (error || !usuarioData?.user) {
        await clienteSupabase.auth.signOut({ scope: "local" }).catch(() => {});
        return false;
      }

      await abrirPortalAutenticado();
      return true;
    } catch (erro) {
      console.warn("[Mensalize Aluno] Sessão existente inválida:", erro);
      return false;
    }
  }

  function prepararTelaLink(resultado) {
    const tipo = resultado.tipo === "recuperacao" ? "recuperacao" : "ativacao";
    const titulo = $("authAlunoLinkTitulo");
    const descricao = $("authAlunoLinkDescricao");
    const etiqueta = $("authAlunoLinkEyebrow");
    const usuario = $("authAlunoUsername");
    const senha = $("authAlunoSenhaNova");
    const confirmar = $("authAlunoSenhaConfirmar");

    if (etiqueta) etiqueta.textContent = tipo === "recuperacao" ? "Recuperação segura" : "Primeiro acesso";
    if (titulo) titulo.textContent = tipo === "recuperacao" ? "Crie um novo acesso" : "Crie seu acesso";
    if (descricao) {
      descricao.textContent = tipo === "recuperacao"
        ? `Olá, ${resultado.nome || "aluno"}. Escolha seu usuário e uma nova senha. Este link substitui os dados de acesso anteriores.`
        : `Olá, ${resultado.nome || "aluno"}. Escolha seu próprio usuário e crie uma senha para entrar no portal.`;
    }

    if (usuario) {
      usuario.value = normalizarUsername(resultado.sugestao_usuario || "");
      usuario.dispatchEvent(new Event("input"));
    }

    if (senha) senha.value = "";
    if (confirmar) confirmar.value = "";

    definirMensagem("msgAuthAlunoLink", "");
    definirMensagem("msgAuthAlunoUsername", USERNAME_ORIENTACAO);
    mostrarTelaAuth("link");
  }

  async function validarLinkTemporario(token) {
    if (!token) return false;

    mostrarCarregando("Validando link enviado pelo professor...");

    const resultado = await invocarAlunoAuth("validar_link", { token });
    if (!resultado.ok) {
      tokenAcessoAtual = "";
      mostrarTelaAuth("login");
      definirMensagem(
        "msgAuthAlunoLogin",
        resultado.mensagem || "Link inválido ou expirado. Peça um novo link ao professor.",
        "erro"
      );
      return false;
    }

    tokenAcessoAtual = token;
    prepararTelaLink(resultado);
    return true;
  }

  async function verificarDisponibilidadeUsername() {
    const campo = $("authAlunoUsername");
    if (!campo || !tokenAcessoAtual) return;

    const username = String(campo.value || "").trim();

    if (!usernameValido(username)) {
      definirMensagem(
        "msgAuthAlunoUsername",
        USERNAME_ORIENTACAO,
        "erro"
      );
      return;
    }

    definirMensagem("msgAuthAlunoUsername", "Verificando disponibilidade...");

    const resultado = await invocarAlunoAuth("verificar_username", {
      token: tokenAcessoAtual,
      username
    });

    if (!resultado.ok) {
      definirMensagem(
        "msgAuthAlunoUsername",
        resultado.mensagem || "Não foi possível verificar agora.",
        "erro"
      );
      return;
    }

    definirMensagem(
      "msgAuthAlunoUsername",
      resultado.disponivel ? "Usuário disponível." : "Este usuário já está em uso.",
      resultado.disponivel ? "sucesso" : "erro"
    );
  }

  async function concluirAcesso(event) {
    event.preventDefault();

    const username = String($("authAlunoUsername")?.value || "").trim();
    const senha = String($("authAlunoSenhaNova")?.value || "");
    const confirmar = String($("authAlunoSenhaConfirmar")?.value || "");
    const botao = $("btnConcluirAcessoAluno");

    definirMensagem("msgAuthAlunoLink", "");

    if (!tokenAcessoAtual) {
      definirMensagem("msgAuthAlunoLink", "Este link não está mais disponível.", "erro");
      return;
    }

    if (!usernameValido(username)) {
      definirMensagem("msgAuthAlunoLink", USERNAME_ORIENTACAO, "erro");
      return;
    }

    const erroSenha = validarSenhaNova(senha);
    if (erroSenha) {
      definirMensagem("msgAuthAlunoLink", erroSenha, "erro");
      return;
    }

    if (senha !== confirmar) {
      definirMensagem("msgAuthAlunoLink", "As senhas não conferem.", "erro");
      return;
    }

    if (botao) {
      botao.disabled = true;
      botao.textContent = "Criando acesso...";
    }

    const resultado = await invocarAlunoAuth("concluir_link", {
      token: tokenAcessoAtual,
      username,
      senha
    });

    if (botao) {
      botao.disabled = false;
      botao.textContent = "Confirmar meu acesso";
    }

    if (!resultado.ok) {
      definirMensagem(
        "msgAuthAlunoLink",
        resultado.mensagem || "Não foi possível concluir o acesso.",
        "erro"
      );
      return;
    }

    tokenAcessoAtual = "";

    if (resultado.sessao) {
      try {
        await definirSessao(resultado.sessao);
        await abrirPortalAutenticado();
        return;
      } catch (erro) {
        console.warn("[Mensalize Aluno] Acesso criado, mas sessão não aplicada:", erro);
      }
    }

    const loginUsername = $("authAlunoLoginUsername");
    if (loginUsername) loginUsername.value = username;

    mostrarTelaAuth("login");
    definirMensagem(
      "msgAuthAlunoLogin",
      "Acesso criado. Entre com o usuário e a senha que você acabou de escolher.",
      "sucesso"
    );
  }

  async function entrar(event) {
    event.preventDefault();

    const username = String($("authAlunoLoginUsername")?.value || "").trim();
    const senha = String($("authAlunoLoginSenha")?.value || "");
    const botao = $("btnEntrarAlunoAuth");

    definirMensagem("msgAuthAlunoLogin", "");

    if (!usernameValido(username)) {
      definirMensagem(
        "msgAuthAlunoLogin",
        USERNAME_ORIENTACAO,
        "erro",
      );
      return;
    }

    if (!senha) {
      definirMensagem("msgAuthAlunoLogin", "Digite sua senha.", "erro");
      return;
    }

    if (botao) {
      botao.disabled = true;
      botao.textContent = "Entrando...";
    }

    const resultado = await invocarAlunoAuth("login", { username, senha });

    if (botao) {
      botao.disabled = false;
      botao.textContent = "Entrar";
    }

    if (!resultado.ok || !resultado.sessao) {
      definirMensagem(
        "msgAuthAlunoLogin",
        resultado.mensagem || "Usuário ou senha inválidos.",
        "erro"
      );
      return;
    }

    try {
      await definirSessao(resultado.sessao);
      await abrirPortalAutenticado();
    } catch (erro) {
      console.warn("[Mensalize Aluno] Não foi possível aplicar a sessão:", erro);
      definirMensagem("msgAuthAlunoLogin", "Não foi possível abrir sua sessão agora.", "erro");
    }
  }

  function configurarEventos() {
    const formLogin = $("formAuthAlunoLogin");
    const formLink = $("formAuthAlunoLink");
    const username = $("authAlunoUsername");

    formLogin?.addEventListener("submit", entrar);
    formLink?.addEventListener("submit", concluirAcesso);
    configurarVisibilidadeSenhas();

    username?.addEventListener("input", () => {
      clearTimeout(temporizadorUsername);
      temporizadorUsername = setTimeout(verificarDisponibilidadeUsername, 450);
    });

    username?.addEventListener("blur", verificarDisponibilidadeUsername);
  }

  async function sair() {
    try {
      await clienteSupabase?.auth.signOut({ scope: "local" });
    } catch (_) {}

    global.MENSALIZE_ALUNO_AUTENTICADO = false;
    tokenAcessoAtual = "";
  }

  async function inicializar(opcoes) {
    clienteSupabase = opcoes?.supabaseClient;
    carregarAlunoComCodigo = opcoes?.carregarAlunoComCodigo;

    if (!clienteSupabase || typeof carregarAlunoComCodigo !== "function") {
      console.error("[Mensalize Aluno] Módulo de autenticação sem dependências.");
      return false;
    }

    configurarEventos();

    const tokenUrl = obterTokenAcessoDaUrl();
    if (tokenUrl) {
      tokenAcessoAtual = tokenUrl;
      limparTokenDoFragmento();
      return validarLinkTemporario(tokenUrl);
    }

    if (await tentarSessaoExistente()) return true;

    mostrarTelaAuth("login");
    return true;
  }

  global.MensalizeAlunoAuth = {
    inicializar,
    sair,
    normalizarUsername
  };
})(window);
