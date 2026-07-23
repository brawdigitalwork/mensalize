// ============================================================================
// MENSALIZE ALUNO — AUTENTICAÇÃO REAL v1
// Usuário escolhido pelo aluno + senha.
// Recuperação somente por link temporário emitido pelo professor.
// ============================================================================

(function inicializarModuloAuthAluno(global) {
  "use strict";

  const TOKEN_SESSAO_KEY = "mensalize:aluno:token-acesso-temporario";
  const USERNAME_MIN = 4;
  const USERNAME_MAX = 24;

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
    const username = normalizarUsername(valor);
    if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) return false;
    return /^[a-z0-9][a-z0-9._]*[a-z0-9]$/.test(username);
  }

  function limparParametroUrl(nome) {
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has(nome)) return;
      url.searchParams.delete(nome);
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    } catch (erro) {
      console.warn("[Mensalize Aluno] Não foi possível limpar parâmetro da URL:", erro);
    }
  }

  function obterTokenAcessoDaUrl() {
    try {
      const url = new URL(window.location.href);
      return String(url.searchParams.get("acesso") || "").trim();
    } catch (_) {
      return "";
    }
  }

  function salvarTokenTemporario(token) {
    try {
      if (token) sessionStorage.setItem(TOKEN_SESSAO_KEY, token);
      else sessionStorage.removeItem(TOKEN_SESSAO_KEY);
    } catch (_) {}
  }

  function obterTokenTemporarioSalvo() {
    try {
      return String(sessionStorage.getItem(TOKEN_SESSAO_KEY) || "").trim();
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

  async function invocarAlunoAuth(acao, payload = {}) {
    const { data, error } = await clienteSupabase.functions.invoke("aluno-auth", {
      body: { acao, ...payload }
    });

    if (error) {
      console.warn("[Mensalize Aluno] Falha ao chamar aluno-auth:", error);
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
    definirMensagem("msgAuthAlunoUsername", "Use 4 a 24 caracteres: letras, números, ponto ou underline.");
    mostrarTelaAuth("link");
  }

  async function validarLinkTemporario(token) {
    if (!token) return false;

    mostrarCarregando("Validando link enviado pelo professor...");

    const resultado = await invocarAlunoAuth("validar_link", { token });
    if (!resultado.ok) {
      salvarTokenTemporario("");
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

    const username = normalizarUsername(campo.value);
    campo.value = username;

    if (!usernameValido(username)) {
      definirMensagem(
        "msgAuthAlunoUsername",
        "Use 4 a 24 caracteres e não comece ou termine com ponto/underline.",
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
      resultado.disponivel ? "✓ Usuário disponível" : "Este usuário já está em uso.",
      resultado.disponivel ? "sucesso" : "erro"
    );
  }

  async function concluirAcesso(event) {
    event.preventDefault();

    const username = normalizarUsername($("authAlunoUsername")?.value);
    const senha = String($("authAlunoSenhaNova")?.value || "");
    const confirmar = String($("authAlunoSenhaConfirmar")?.value || "");
    const botao = $("btnConcluirAcessoAluno");

    definirMensagem("msgAuthAlunoLink", "");

    if (!tokenAcessoAtual) {
      definirMensagem("msgAuthAlunoLink", "Este link não está mais disponível.", "erro");
      return;
    }

    if (!usernameValido(username)) {
      definirMensagem("msgAuthAlunoLink", "Escolha um usuário válido.", "erro");
      return;
    }

    if (senha.length < 8) {
      definirMensagem("msgAuthAlunoLink", "A senha precisa ter pelo menos 8 caracteres.", "erro");
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

    salvarTokenTemporario("");
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

    const username = normalizarUsername($("authAlunoLoginUsername")?.value);
    const senha = String($("authAlunoLoginSenha")?.value || "");
    const botao = $("btnEntrarAlunoAuth");

    definirMensagem("msgAuthAlunoLogin", "");

    if (!username || !senha) {
      definirMensagem("msgAuthAlunoLogin", "Preencha usuário e senha.", "erro");
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

    username?.addEventListener("input", () => {
      const normalizado = normalizarUsername(username.value);
      if (username.value !== normalizado) username.value = normalizado;

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
    salvarTokenTemporario("");
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
      salvarTokenTemporario(tokenUrl);
      limparParametroUrl("acesso");
      return validarLinkTemporario(tokenUrl);
    }

    const tokenSalvo = obterTokenTemporarioSalvo();
    if (tokenSalvo) {
      tokenAcessoAtual = tokenSalvo;
      return validarLinkTemporario(tokenSalvo);
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
