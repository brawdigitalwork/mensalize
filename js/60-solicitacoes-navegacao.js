// 30.1 LINK DA PÁGINA DO ALUNO + SOLICITAÇÕES
// ===============================

function montarUrlAcessoAluno(token) {
  if (!token) return "";
  const base = window.location.origin || "";
  return `${base}/aluno.html#acesso=${encodeURIComponent(token)}`;
}

async function enviarLinkPaginaAluno(id) {
  const aluno = alunos.find(a => String(a.id) === String(id));

  if (!aluno) {
    mostrarToast("Aluno não encontrado.", "erro");
    return;
  }

  const numeroAluno = limparNumeroWhatsApp(aluno.telefone);
  const numeroResponsavel = limparNumeroWhatsApp(aluno.responsavel_whatsapp);
  const numero = numeroAluno && numeroAluno.length >= 10
    ? numeroAluno
    : numeroResponsavel;

  if (!numero || numero.length < 10) {
    mostrarToast("Cadastre o WhatsApp do aluno ou responsável.", "erro");
    return;
  }

  const janelaWhatsApp = window.open("about:blank", "_blank");

  try {
    mostrarToast("Gerando link seguro do aluno...");

    const { data, error } = await supabaseClient.functions.invoke(
      "professor-acesso-aluno",
      {
        body: { aluno_id: aluno.id }
      }
    );

    if (error || !data?.ok || !data?.token) {
      let mensagem = data?.mensagem || "";
      if (error?.context) {
        try {
          const detalhe = await error.context.clone().json();
          mensagem = detalhe?.mensagem || mensagem;
        } catch (_) {}
      }
      throw new Error(mensagem || "Falha ao gerar link");
    }

    const link = montarUrlAcessoAluno(data.token);
    const ehRecuperacao = data.tipo === "recuperacao";

    const mensagem = ehRecuperacao
      ? `Olá, ${aluno.nome}. A ${nomeEmpresa || "academia"} enviou um link para recuperar seu acesso ao Mensalize Aluno.\n\nPor ele você pode escolher um novo usuário e uma nova senha:\n\n${link}\n\nEste link é pessoal, funciona uma única vez e expira em 1 hora.`
      : `Olá, ${aluno.nome}. A ${nomeEmpresa || "academia"} enviou seu link para criar o acesso ao Mensalize Aluno.\n\nVocê poderá escolher seu próprio usuário e criar uma senha:\n\n${link}\n\nEste link é pessoal, funciona uma única vez e expira em 24 horas.`;

    const urlWhatsApp = `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`;

    if (janelaWhatsApp) {
      janelaWhatsApp.location.href = urlWhatsApp;
    } else {
      const copiado = await navigator.clipboard?.writeText(link)
        .then(() => true)
        .catch(() => false);

      mostrarToast(
        copiado
          ? "Link seguro copiado. Envie ao aluno pelo WhatsApp."
          : "Link gerado, mas o navegador bloqueou a nova aba.",
        copiado ? "sucesso" : "erro"
      );
    }

    mostrarToast(
      ehRecuperacao
        ? "Link de recuperação gerado."
        : "Link de primeiro acesso gerado.",
      "sucesso"
    );
  } catch (erro) {
    if (janelaWhatsApp) janelaWhatsApp.close();
    console.error("Erro ao gerar acesso do aluno:", erro);
    mostrarToast(
      erro?.message || "Não foi possível gerar o link de acesso agora.",
      "erro"
    );
  }
}

let filtroSolicitacoesAtual = "pendente";

function obterConfigFiltroSolicitacoes(status) {
  const configuracoes = {
    pendente: {
      titulo: "Solicitações pendentes",
      descricao: "Pedidos que ainda precisam da sua resposta.",
      vazio: "Nenhuma solicitação pendente no momento."
    },
    aprovada: {
      titulo: "Solicitações aprovadas",
      descricao: "Pedidos que já foram aceitos e finalizados.",
      vazio: "Nenhuma solicitação aprovada ainda."
    },
    recusada: {
      titulo: "Solicitações recusadas",
      descricao: "Pedidos que foram analisados e não aprovados.",
      vazio: "Nenhuma solicitação recusada ainda."
    }
  };

  return configuracoes[status] || configuracoes.pendente;
}

function atualizarInterfaceFiltroSolicitacoes(contadores = {}) {
  const config = obterConfigFiltroSolicitacoes(filtroSolicitacoesAtual);
  const titulo = document.getElementById("tituloListaSolicitacoes");
  const descricao = document.getElementById("descricaoListaSolicitacoes");

  if (titulo) titulo.textContent = config.titulo;
  if (descricao) descricao.textContent = config.descricao;

  document.querySelectorAll("[data-filtro-solicitacao]").forEach(botao => {
    const ativo = botao.dataset.filtroSolicitacao === filtroSolicitacoesAtual;
    botao.classList.toggle("ativo", ativo);
    botao.setAttribute("aria-selected", ativo ? "true" : "false");
  });

  const totalPendentes = contadores.pendente ?? 0;
  const totalAprovadas = contadores.aprovada ?? 0;
  const totalRecusadas = contadores.recusada ?? 0;

  if (totalSolicitacoesPendentes) totalSolicitacoesPendentes.textContent = totalPendentes;
  if (totalSolicitacoesAprovadas) totalSolicitacoesAprovadas.textContent = totalAprovadas;
  if (totalSolicitacoesRecusadas) totalSolicitacoesRecusadas.textContent = totalRecusadas;
}

function inicializarFiltrosSolicitacoes() {
  document.querySelectorAll("[data-filtro-solicitacao]").forEach(botao => {
    if (botao.dataset.solicitacaoFiltroConfigurado === "true") return;

    botao.dataset.solicitacaoFiltroConfigurado = "true";
    botao.addEventListener("click", () => {
      filtroSolicitacoesAtual = botao.dataset.filtroSolicitacao || "pendente";
      atualizarInterfaceFiltroSolicitacoes();
      carregarSolicitacoesAlteracao();
    });
  });
}

function rotuloTipoSolicitacao(solicitacao) {
  if (solicitacao.categoria_solicitacao === "pagamento") return "Pagamento";
  if (solicitacao.tipo === "graduacao") return "Graduação";
  if (solicitacao.tipo === "turma") return "Turma";
  return "Alteração";
}

function statusSolicitacaoTexto(status) {
  if (status === "pendente") return "Pendente";
  if (status === "aprovada") return "Aprovada";
  if (status === "recusada") return "Recusada";
  return "Solicitação";
}


const solicitacoesRenderizadasMensalize = new Map();
let solicitacaoAbertaAtualMensalize = null;

function sanitizarHtmlSolicitacao(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatarDataSolicitacao(valor) {
  if (!valor) return "Não informada";
  if (typeof formatarData === "function") return formatarData(valor);

  try {
    return new Date(valor).toLocaleDateString("pt-BR");
  } catch (erro) {
    return "Não informada";
  }
}

function formatarMoedaSolicitacao(valor) {
  const numero = typeof valorParaNumero === "function" ? valorParaNumero(valor) : Number(valor || 0);
  if (typeof formatarMoeda === "function") return formatarMoeda(numero);
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dadosSolicitacaoAlteracao(solicitacao) {
  return solicitacao.dados_solicitados || {};
}

function resumoSolicitacao(solicitacao, aluno) {
  const dados = dadosSolicitacaoAlteracao(solicitacao);

  if (solicitacao.categoria_solicitacao === "pagamento") {
    const valorAluno = aluno ? valorParaNumero(aluno.valor) : 0;
    const valorInformado = valorParaNumero(solicitacao.valor_informado || valorAluno);
    return `Pagamento informado: ${formatarMoedaSolicitacao(valorInformado)} • Data: ${formatarDataSolicitacao(solicitacao.data_pagamento)}`;
  }

  if (solicitacao.tipo === "graduacao") {
    const faixa = dados.faixa || dados.nova_faixa || "sem alteração";
    const grau = dados.grau || dados.novo_grau || "sem alteração";
    return `Correção de graduação: faixa ${faixa} • grau ${grau}`;
  }

  const turmaAtual = aluno?.turma || "sem turma";
  const novaTurma = dados.turma || dados.nova_turma || "não informada";
  return `Troca de turma: ${turmaAtual} → ${novaTurma}`;
}

function descricaoSolicitacaoAlteracaoHtml(solicitacao, aluno) {
  const dados = dadosSolicitacaoAlteracao(solicitacao);

  if (solicitacao.tipo === "graduacao") {
    return `
      <div class="solicitacao-detalhe-grade">
        <div><span>Pedido</span><strong>Correção de graduação</strong></div>
        <div><span>Faixa atual</span><strong>${sanitizarHtmlSolicitacao(aluno?.faixa || "Não informada")}</strong></div>
        <div><span>Faixa solicitada</span><strong>${sanitizarHtmlSolicitacao(dados.faixa || dados.nova_faixa || "Sem alteração")}</strong></div>
        <div><span>Grau atual</span><strong>${sanitizarHtmlSolicitacao(aluno?.grau || "Não informado")}</strong></div>
        <div><span>Grau solicitado</span><strong>${sanitizarHtmlSolicitacao(dados.grau || dados.novo_grau || "Sem alteração")}</strong></div>
        <div><span>Última graduação atual</span><strong>${sanitizarHtmlSolicitacao(aluno?.data_ultima_graduacao ? formatarDataSolicitacao(aluno.data_ultima_graduacao) : "Não informada")}</strong></div>
        <div><span>Data solicitada</span><strong>${sanitizarHtmlSolicitacao(dados.data_ultima_graduacao ? formatarDataSolicitacao(dados.data_ultima_graduacao) : "Sem alteração")}</strong></div>
      </div>
      ${solicitacao.observacao ? `<div class="solicitacao-observacao"><span>Observação</span><p>${sanitizarHtmlSolicitacao(solicitacao.observacao)}</p></div>` : ""}
    `;
  }

  return `
    <div class="solicitacao-detalhe-grade">
      <div><span>Pedido</span><strong>Troca de turma</strong></div>
      <div><span>Turma atual</span><strong>${sanitizarHtmlSolicitacao(aluno?.turma || "Não informada")}</strong></div>
      <div><span>Nova turma</span><strong>${sanitizarHtmlSolicitacao(dados.turma || dados.nova_turma || "Não informada")}</strong></div>
    </div>
    ${solicitacao.observacao ? `<div class="solicitacao-observacao"><span>Observação</span><p>${sanitizarHtmlSolicitacao(solicitacao.observacao)}</p></div>` : ""}
  `;
}

function descricaoSolicitacaoPagamentoHtml(solicitacao, aluno) {
  const valorAluno = aluno ? valorParaNumero(aluno.valor) : 0;
  const valorInformado = valorParaNumero(solicitacao.valor_informado || valorAluno);

  return `
    <div class="solicitacao-detalhe-grade">
      <div><span>Pedido</span><strong>Confirmação de pagamento</strong></div>
      <div><span>Valor informado</span><strong>${sanitizarHtmlSolicitacao(formatarMoedaSolicitacao(valorInformado))}</strong></div>
      <div><span>Valor cadastrado</span><strong>${sanitizarHtmlSolicitacao(aluno ? formatarMoedaSolicitacao(valorAluno) : "Aluno não encontrado")}</strong></div>
      <div><span>Data informada</span><strong>${sanitizarHtmlSolicitacao(formatarDataSolicitacao(solicitacao.data_pagamento))}</strong></div>
    </div>
    ${solicitacao.observacao ? `<div class="solicitacao-observacao"><span>Observação do aluno</span><p>${sanitizarHtmlSolicitacao(solicitacao.observacao)}</p></div>` : ""}
  `;
}

function textoRespostaSolicitacao(solicitacao, aluno) {
  const nome = aluno?.nome || "aluno";
  const tipo = rotuloTipoSolicitacao(solicitacao).toLowerCase();

  if (solicitacao.status === "aprovada") {
    if (solicitacao.categoria_solicitacao === "pagamento") {
      return `Olá, ${nome}! Seu pagamento foi confirmado no Mensalize. Obrigado por enviar a confirmação.`;
    }
    return `Olá, ${nome}! Sua solicitação de ${tipo} foi aprovada e atualizada no Mensalize.`;
  }

  if (solicitacao.status === "recusada") {
    return `Olá, ${nome}! Sua solicitação de ${tipo} foi analisada, mas não foi aprovada neste momento. Fale com o professor para mais detalhes.`;
  }

  return `Olá, ${nome}! Recebemos sua solicitação de ${tipo} no Mensalize. Ela está pendente e será analisada pelo professor.`;
}

function alternarDetalhesSolicitacao(chave) {
  const card = document.querySelector(`[data-solicitacao-chave="${chave}"]`);
  if (!card) return;

  const vaiAbrir = !card.classList.contains("aberta");

  document.querySelectorAll(".solicitacao-card-v3.aberta").forEach(item => {
    item.classList.remove("aberta");
    const botao = item.querySelector("[data-label-toggle]");
    if (botao) botao.textContent = "Ver detalhes";
  });

  if (vaiAbrir) {
    card.classList.add("aberta");
    const botao = card.querySelector("[data-label-toggle]");
    if (botao) botao.textContent = "Fechar detalhes";
    solicitacaoAbertaAtualMensalize = chave;
  } else {
    solicitacaoAbertaAtualMensalize = null;
  }
}

function copiarRespostaSolicitacao(chave) {
  const registro = solicitacoesRenderizadasMensalize.get(chave);
  if (!registro) {
    mostrarToast("Solicitação não encontrada para copiar resposta.", "erro");
    return;
  }

  const texto = textoRespostaSolicitacao(registro.solicitacao, registro.aluno);

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(texto).then(() => {
      mostrarToast("Resposta copiada.");
    }).catch(() => copiarTextoSolicitacaoFallback(texto));
    return;
  }

  copiarTextoSolicitacaoFallback(texto);
}

function copiarTextoSolicitacaoFallback(texto) {
  const textarea = document.createElement("textarea");
  textarea.value = texto;
  textarea.setAttribute("readonly", "readonly");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
  mostrarToast("Resposta copiada.");
}

let solicitacaoConfirmacaoPendenteMensalize = null;
let solicitacaoConfirmacaoFocoAnteriorMensalize = null;

function executarRespostaSolicitacaoConfirmada(registro, acao) {
  if (!registro?.solicitacao) return;

  const { solicitacao } = registro;
  const vaiAprovar = acao === "aprovar";

  if (solicitacao.categoria_solicitacao === "pagamento") {
    return vaiAprovar
      ? aprovarSolicitacaoPagamento(solicitacao.id)
      : recusarSolicitacaoPagamento(solicitacao.id);
  }

  return vaiAprovar
    ? aprovarSolicitacaoAlteracao(solicitacao.id)
    : recusarSolicitacaoAlteracao(solicitacao.id);
}

function fecharConfirmacaoSolicitacaoMobile() {
  const modal = document.getElementById("modalConfirmarSolicitacao");
  if (!modal) return;

  modal.classList.remove("aberta", "is-approve", "is-reject");
  modal.setAttribute("aria-hidden", "true");
  solicitacaoConfirmacaoPendenteMensalize = null;

  if (solicitacaoConfirmacaoFocoAnteriorMensalize?.focus) {
    try {
      solicitacaoConfirmacaoFocoAnteriorMensalize.focus({ preventScroll: true });
    } catch (_) {
      solicitacaoConfirmacaoFocoAnteriorMensalize.focus();
    }
  }

  solicitacaoConfirmacaoFocoAnteriorMensalize = null;
}

function inicializarConfirmacaoSolicitacaoMobile() {
  const modal = document.getElementById("modalConfirmarSolicitacao");
  const btnCancelar = document.getElementById("btnCancelarConfirmacaoSolicitacao");
  const btnConfirmar = document.getElementById("btnConfirmarAcaoSolicitacao");

  if (!modal || !btnCancelar || !btnConfirmar || modal.dataset.inicializado === "true") return;

  modal.dataset.inicializado = "true";

  modal.querySelectorAll("[data-solicitacao-confirm-cancel]").forEach(botao => {
    botao.addEventListener("click", fecharConfirmacaoSolicitacaoMobile);
  });

  btnCancelar.addEventListener("click", fecharConfirmacaoSolicitacaoMobile);

  btnConfirmar.addEventListener("click", async () => {
    const pendente = solicitacaoConfirmacaoPendenteMensalize;
    if (!pendente) return;

    btnConfirmar.disabled = true;
    const textoOriginal = btnConfirmar.textContent;
    btnConfirmar.textContent = pendente.acao === "aprovar" ? "Confirmando..." : "Recusando...";

    fecharConfirmacaoSolicitacaoMobile();

    try {
      await executarRespostaSolicitacaoConfirmada(pendente.registro, pendente.acao);
    } finally {
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = textoOriginal;
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modal.classList.contains("aberta")) {
      fecharConfirmacaoSolicitacaoMobile();
    }
  });
}

function abrirConfirmacaoSolicitacaoMobile(registro, acao) {
  const modal = document.getElementById("modalConfirmarSolicitacao");
  const eyebrow = document.getElementById("solicitacaoConfirmEyebrow");
  const titulo = document.getElementById("solicitacaoConfirmTitulo");
  const descricao = document.getElementById("solicitacaoConfirmDescricao");
  const alunoEl = document.getElementById("solicitacaoConfirmAluno");
  const btnConfirmar = document.getElementById("btnConfirmarAcaoSolicitacao");

  if (!modal || !eyebrow || !titulo || !descricao || !alunoEl || !btnConfirmar) return false;

  inicializarConfirmacaoSolicitacaoMobile();

  const { solicitacao, aluno } = registro;
  const nome = aluno?.nome || "Aluno";
  const tipo = rotuloTipoSolicitacao(solicitacao).toLowerCase();
  const vaiAprovar = acao === "aprovar";
  const ehPagamento = solicitacao.categoria_solicitacao === "pagamento";

  solicitacaoConfirmacaoPendenteMensalize = { registro, acao };
  solicitacaoConfirmacaoFocoAnteriorMensalize = document.activeElement;

  modal.classList.toggle("is-approve", vaiAprovar);
  modal.classList.toggle("is-reject", !vaiAprovar);

  if (vaiAprovar) {
    eyebrow.textContent = ehPagamento ? "Confirmação de pagamento" : "Aprovar pedido";
    titulo.textContent = ehPagamento ? "Confirmar pagamento?" : "Aprovar solicitação?";
    descricao.textContent = ehPagamento
      ? `Ao continuar, o Mensalize pode registrar o pagamento informado e atualizar a situação financeira do aluno.`
      : `Ao continuar, os dados do aluno serão atualizados conforme a solicitação de ${tipo}.`;
    btnConfirmar.textContent = ehPagamento ? "Confirmar pagamento" : "Aprovar solicitação";
  } else {
    eyebrow.textContent = "Recusar pedido";
    titulo.textContent = "Recusar solicitação?";
    descricao.textContent = `A solicitação de ${tipo} será movida para Recusadas. Nenhum dado do aluno será alterado por esta ação.`;
    btnConfirmar.textContent = "Recusar solicitação";
  }

  alunoEl.textContent = nome;
  modal.setAttribute("aria-hidden", "false");
  modal.classList.add("aberta");

  window.setTimeout(() => btnConfirmar.focus({ preventScroll: true }), 30);
  return true;
}

function confirmarRespostaSolicitacao(chave, acao) {
  const registro = solicitacoesRenderizadasMensalize.get(chave);

  if (!registro) {
    mostrarToast("Solicitação não encontrada.", "erro");
    return;
  }

  // Usa o modal próprio do Mensalize em qualquer largura de tela.
  // No mobile ele se comporta como bottom sheet; no desktop, como modal centralizado.
  // Assim eliminamos o confirm() nativo ("a página diz...") em todo o produto.
  if (abrirConfirmacaoSolicitacaoMobile(registro, acao)) return;

  console.error("[Mensalize] Modal de confirmação de solicitação indisponível.");
  mostrarToast("Não foi possível abrir a confirmação. Recarregue a página e tente novamente.", "erro");
}

async function carregarSolicitacoesAlteracao() {
  if (!listaSolicitacoes || !usuarioAtual) return;

  inicializarFiltrosSolicitacoes();
  atualizarInterfaceFiltroSolicitacoes();
  listaSolicitacoes.innerHTML = `<div class="empty-state-mini">Carregando solicitações...</div>`;

  const [resAlteracoes, resPagamentos] = await Promise.all([
    supabaseClient
      .from("solicitacoes_alteracao")
      .select("id, aluno_id, user_id, tipo, status, dados_solicitados, observacao, created_at, respondido_em")
      .eq("user_id", usuarioAtual.id)
      .order("created_at", { ascending: false })
      .limit(120),

    supabaseClient
      .from("solicitacoes_pagamento")
      .select("id, aluno_id, user_id, valor_informado, data_pagamento, observacao, status, created_at, respondido_em")
      .eq("user_id", usuarioAtual.id)
      .order("created_at", { ascending: false })
      .limit(120)
  ]);

  if (resAlteracoes.error || resPagamentos.error) {
    listaSolicitacoes.innerHTML = `<div class="empty-state-mini">Erro ao carregar solicitações.</div>`;
    console.log("Erro ao carregar solicitações:", resAlteracoes.error?.message || resPagamentos.error?.message);
    return;
  }

  const alteracoes = (resAlteracoes.data || []).map(item => ({ ...item, categoria_solicitacao: "alteracao" }));
  const pagamentos = (resPagamentos.data || []).map(item => ({ ...item, categoria_solicitacao: "pagamento" }));
  const lista = [...pagamentos, ...alteracoes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const contadores = {
    pendente: lista.filter(s => s.status === "pendente").length,
    aprovada: lista.filter(s => s.status === "aprovada").length,
    recusada: lista.filter(s => s.status === "recusada").length
  };

  atualizarInterfaceFiltroSolicitacoes(contadores);

  const idsAlunos = [...new Set(lista.map(s => s.aluno_id).filter(Boolean))];
  let alunosPorId = new Map();

  if (idsAlunos.length) {
    const { data: alunosSolicitacoes } = await supabaseClient
      .from("alunos")
      .select("id, user_id, nome, telefone, valor, vencimento, dia_vencimento, turma, faixa, grau, data_ultima_graduacao")
      .in("id", idsAlunos);

    (alunosSolicitacoes || []).forEach(a => alunosPorId.set(String(a.id), a));
  }

  if (!lista.length) {
    listaSolicitacoes.innerHTML = `<div class="empty-state-mini">Nenhuma solicitação enviada pelos alunos ainda.</div>`;
    return;
  }

  const listaFiltrada = lista.filter(solicitacao => solicitacao.status === filtroSolicitacoesAtual);
  const configFiltro = obterConfigFiltroSolicitacoes(filtroSolicitacoesAtual);

  if (!listaFiltrada.length) {
    listaSolicitacoes.innerHTML = `<div class="empty-state-mini">${configFiltro.vazio}</div>`;
    return;
  }

  solicitacoesRenderizadasMensalize.clear();

  listaSolicitacoes.innerHTML = listaFiltrada.map(solicitacao => {
    const aluno = alunosPorId.get(String(solicitacao.aluno_id));
    const chave = `${solicitacao.categoria_solicitacao}-${solicitacao.id}`;
    const statusTexto = statusSolicitacaoTexto(solicitacao.status);
    const podeResponder = solicitacao.status === "pendente";
    const isPagamento = solicitacao.categoria_solicitacao === "pagamento";
    const tipoTexto = rotuloTipoSolicitacao(solicitacao);
    const dataEnvio = solicitacao.created_at ? new Date(solicitacao.created_at).toLocaleDateString("pt-BR") : "data não informada";
    const dataResposta = solicitacao.respondido_em ? new Date(solicitacao.respondido_em).toLocaleDateString("pt-BR") : "";
    const detalheHtml = isPagamento ? descricaoSolicitacaoPagamentoHtml(solicitacao, aluno) : descricaoSolicitacaoAlteracaoHtml(solicitacao, aluno);
    const resumo = resumoSolicitacao(solicitacao, aluno);

    solicitacoesRenderizadasMensalize.set(chave, { solicitacao, aluno });

    return `
      <article class="solicitacao-card solicitacao-card-v3 status-${sanitizarHtmlSolicitacao(solicitacao.status)} ${isPagamento ? "solicitacao-pagamento" : ""}" data-solicitacao-chave="${sanitizarHtmlSolicitacao(chave)}">
        <div class="solicitacao-card-cabecalho-v3">
          <div class="solicitacao-identidade-v3">
            <div class="solicitacao-card-tags">
              <span class="solicitacao-tipo-chip">${sanitizarHtmlSolicitacao(tipoTexto)}</span>
              <span class="solicitacao-status-chip status-${sanitizarHtmlSolicitacao(solicitacao.status)}">${sanitizarHtmlSolicitacao(statusTexto)}</span>
            </div>
            <h3>${sanitizarHtmlSolicitacao(aluno?.nome || "Aluno")}</h3>
            <small>${sanitizarHtmlSolicitacao(podeResponder ? `Enviado em ${dataEnvio}` : `${statusTexto} ${dataResposta ? `em ${dataResposta}` : ""}`)}</small>
          </div>

          <button type="button" class="acao-secundaria solicitacao-toggle-v3" onclick="alternarDetalhesSolicitacao('${sanitizarHtmlSolicitacao(chave)}')">
            <span data-label-toggle>Ver detalhes</span>
          </button>
        </div>

        <p class="solicitacao-resumo-v3">${sanitizarHtmlSolicitacao(resumo)}</p>

        <div class="solicitacao-detalhes-v3">
          <div class="solicitacao-conteudo-v3">
            ${detalheHtml}
          </div>

          <div class="solicitacao-acoes-v3">
            <button type="button" class="acao-secundaria" onclick="copiarRespostaSolicitacao('${sanitizarHtmlSolicitacao(chave)}')">Copiar resposta</button>
            ${podeResponder ? `
              <button type="button" class="acao-principal" onclick="confirmarRespostaSolicitacao('${sanitizarHtmlSolicitacao(chave)}', 'aprovar')">${isPagamento ? "Confirmar pagamento" : "Aprovar"}</button>
              <button type="button" class="acao-perigo" onclick="confirmarRespostaSolicitacao('${sanitizarHtmlSolicitacao(chave)}', 'recusar')">Recusar</button>
            ` : ""}
          </div>
        </div>
      </article>
    `;
  }).join("");

  if (solicitacaoAbertaAtualMensalize && document.querySelector(`[data-solicitacao-chave="${solicitacaoAbertaAtualMensalize}"]`)) {
    alternarDetalhesSolicitacao(solicitacaoAbertaAtualMensalize);
  }

  if (typeof atualizarCentralNotificacoesInteligentes === "function") {
    atualizarCentralNotificacoesInteligentes();
  }
}

async function aprovarSolicitacaoAlteracao(id) {
  const { data: solicitacao, error: erroBusca } = await supabaseClient
    .from("solicitacoes_alteracao")
    .select("id, aluno_id, user_id, dados_solicitados, tipo, status")
    .eq("id", id)
    .single();

  if (erroBusca || !solicitacao) {
    mostrarToast("Solicitação não encontrada.", "erro");
    return;
  }

  if (solicitacao.status !== "pendente") {
    mostrarToast("Essa solicitação já foi respondida.", "erro");
    return;
  }

  const dados = solicitacao.dados_solicitados || {};
  let atualizacaoAluno = {};

  if (solicitacao.tipo === "graduacao") {
    if (dados.faixa || dados.nova_faixa) atualizacaoAluno.faixa = dados.faixa || dados.nova_faixa;
    if (dados.grau || dados.novo_grau) atualizacaoAluno.grau = dados.grau || dados.novo_grau;
    if (dados.data_ultima_graduacao) atualizacaoAluno.data_ultima_graduacao = dados.data_ultima_graduacao;
  } else {
    const novaTurma = dados.turma || dados.nova_turma || "";
    if (!novaTurma) {
      mostrarToast("A solicitação não possui turma informada.", "erro");
      return;
    }

    const normalizarTurmaSolicitacao = typeof normalizarTextoTurma === "function"
      ? normalizarTextoTurma
      : (valor) => String(valor || "").trim().toLowerCase();

    const turmaCadastrada = (turmasCadastradas || []).find(turma =>
      turma.ativa !== false && normalizarTurmaSolicitacao(turma.nome) === normalizarTurmaSolicitacao(novaTurma)
    );

    if (!turmaCadastrada) {
      mostrarToast("Essa turma não está cadastrada em Turmas. Recuse a solicitação ou cadastre a turma antes de aprovar.", "erro");
      return;
    }

    atualizacaoAluno.turma = turmaCadastrada.nome;
    atualizacaoAluno.turma_id = turmaCadastrada.id;
  }

  if (Object.keys(atualizacaoAluno).length === 0) {
    mostrarToast("Essa solicitação não possui dados para atualizar.", "erro");
    return;
  }

  const { error: erroAluno } = await supabaseClient
    .from("alunos")
    .update(atualizacaoAluno)
    .eq("id", solicitacao.aluno_id);

  if (erroAluno) {
    mostrarToast("Erro ao atualizar dados do aluno.", "erro");
    return;
  }

  const { error: erroSolicitacao } = await supabaseClient
    .from("solicitacoes_alteracao")
    .update({ status: "aprovada", respondido_em: new Date().toISOString() })
    .eq("id", id);

  if (erroSolicitacao) {
    mostrarToast("Aluno atualizado, mas erro ao finalizar solicitação.", "erro");
    return;
  }

  mostrarToast("Solicitação aprovada.");
  await carregarAlunos();
  await carregarSolicitacoesAlteracao();
}

async function recusarSolicitacaoAlteracao(id) {
  const { error } = await supabaseClient
    .from("solicitacoes_alteracao")
    .update({ status: "recusada", respondido_em: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    mostrarToast("Erro ao recusar solicitação.", "erro");
    return;
  }

  mostrarToast("Solicitação recusada.");
  await carregarSolicitacoesAlteracao();
}


async function aprovarSolicitacaoPagamento(id) {
  const { data: solicitacao, error: erroBusca } = await supabaseClient
    .from("solicitacoes_pagamento")
    .select("id, aluno_id, user_id, valor_informado, data_pagamento, status")
    .eq("id", id)
    .single();

  if (erroBusca || !solicitacao) {
    mostrarToast("Solicitação de pagamento não encontrada.", "erro");
    return;
  }

  if (solicitacao.status !== "pendente") {
    mostrarToast("Essa solicitação já foi respondida.", "erro");
    return;
  }

  const { data: aluno, error: erroAluno } = await supabaseClient
    .from("alunos")
    .select("id,user_id,nome,valor,vencimento,dia_vencimento")
    .eq("id", solicitacao.aluno_id)
    .eq("user_id", usuarioAtual.id)
    .single();

  if (erroAluno || !aluno) {
    mostrarToast("Aluno não encontrado para confirmar pagamento.", "erro");
    return;
  }

  if (typeof registrarPagamentoAluno !== "function") {
    mostrarToast("Função de pagamento não carregada. Atualize o sistema.", "erro");
    return;
  }

  const resultado = await registrarPagamentoAluno(aluno, {
    dataPagamento: solicitacao.data_pagamento || dataHojeLocalISO(),
    valorPagamento: solicitacao.valor_informado || aluno.valor
  });

  if (!resultado.ok && !resultado.jaExiste) {
    mostrarToast(resultado.mensagem || "Erro ao confirmar pagamento.", "erro");
    return;
  }

  const { error: erroFinalizar } = await supabaseClient
    .from("solicitacoes_pagamento")
    .update({ status: "aprovada", respondido_em: new Date().toISOString() })
    .eq("id", id);

  if (erroFinalizar) {
    mostrarToast("Pagamento registrado, mas erro ao finalizar solicitação.", "erro");
    return;
  }

  await carregarAlunos();
  await carregarSolicitacoesAlteracao();
  mostrarToast(resultado.jaExiste ? "Solicitação aprovada. Esse aluno já tinha pagamento no mês." : "✅ Pagamento confirmado com sucesso!");
}

async function recusarSolicitacaoPagamento(id) {
  const { error } = await supabaseClient
    .from("solicitacoes_pagamento")
    .update({ status: "recusada", respondido_em: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    mostrarToast("Erro ao recusar solicitação de pagamento.", "erro");
    return;
  }

  mostrarToast("Solicitação de pagamento recusada.");
  await carregarSolicitacoesAlteracao();
}

// ===============================
// 31. NAVEGAÇÃO PRINCIPAL — SIDEBAR
// ===============================
function abrirViewPrincipal(view) {

  // =====================================================
  // PROTEÇÃO SaaS — MÓDULOS
  // Mensagens alinhadas com os nomes de planos atuais.
  // Verificações por flag de módulo (booleano), nunca por nome de plano.
  // =====================================================

  if (view === "desafio" && !moduloDesafioAtivo) {
    abrirModalUpgradePlano("desafio");
    return;
  }

  if (view === "evolucao" && !moduloEvolucaoAtivo) {
    abrirModalUpgradePlano("evolucao");
    return;
  }

  if (view === "programaFight" && !window.moduloFightAtivo) {
    abrirModalUpgradePlano("programaFight");
    return;
  }

  if (view === "turmas" && !moduloTurmasAtivo) {
    abrirModalUpgradePlano("turmas");
    return;
  }

  if (view === "presencas" && !moduloPresencaAtivo) {
    abrirModalUpgradePlano("presencas");
    return;
  }

  if (view === "avisos" && !moduloAvisosAtivo) {
    abrirModalUpgradePlano("avisos");
    return;
  }

  const views = {
    dashboard: viewDashboard,
    alunos: viewAlunos,
    financeiro: viewFinanceiro,
    desafio: viewDesafio,
    evolucao: viewEvolucao,
    presencas: viewPresencas,
    turmas: viewTurmas,
    avisos: viewAvisos,
    solicitacoes: viewSolicitacoes,
    aniversariantes: document.getElementById("viewAniversariantes"),
    programaFight: document.getElementById("viewProgramaFight"),
    perfil: viewPerfil
  };

  Object.values(views).forEach(secao => {
    if (secao) secao.classList.remove("ativa");
  });

  if (views[view]) views[view].classList.add("ativa");

  document.querySelectorAll(".menu-item[data-view]").forEach(botao => {
    botao.classList.toggle("ativo", botao.dataset.view === view);
  });

  document.querySelectorAll(".mobile-bottom-item[data-view-target]").forEach(botao => {
    const ativo = botao.dataset.viewTarget === view;
    botao.classList.toggle("ativo", ativo);
    if (ativo) botao.setAttribute("aria-current", "page");
    else botao.removeAttribute("aria-current");
  });

  const textos = {
    dashboard: ["Início", "Tudo que você precisa acompanhar hoje em um só lugar."],
    alunos: ["Alunos", "Consulte, filtre e gerencie todos os alunos cadastrados."],
    financeiro: ["Financeiro", "Acompanhe recebimentos, previsão mensal e relatórios."],
    desafio: ["Desafio", "Acompanhe o ranking de presença dos alunos e turmas."],
    evolucao: ["Graduação", "Acompanhe faixas, graus e alunos aptos para avaliação."],
    presencas: ["Presenças", "Faça a chamada do dia separada por turma."],
    turmas: ["Turmas", "Organize dias de aula e cancele aulas sem afetar a frequência."],
    avisos: ["Avisos", "Crie avisos rápidos para alunos e turmas."],
    solicitacoes: ["Solicitações", "Separe pedidos pendentes, aprovados e recusados."],
    aniversariantes: ["Aniversariantes", "Veja os alunos que fazem aniversário e envie parabéns pelo WhatsApp."],
    programaFight: ["Programa de Graduação", "Cadastre categorias, técnicas e vídeos por faixa."],
    perfil: ["Perfil", "Atualize os dados da empresa, WhatsApp e recursos ativos."]
  };

  if (tituloPagina && textos[view]) tituloPagina.textContent = textos[view][0];
  if (descricaoPagina && textos[view]) descricaoPagina.textContent = textos[view][1];

  if (view === "financeiro") {
    if (typeof carregarResumoFinanceiroMensal === "function") {
      carregarResumoFinanceiroMensal();
    }
    if (typeof carregarGrafico === "function") {
      carregarGrafico();
    }
  }
  if (view === "desafio" && typeof atualizarDesafioPresencaProfessor === "function") {
    atualizarDesafioPresencaProfessor();
  }
  if (view === "evolucao") {
    renderizarEvolucao();
  }
  if (view === "presencas") {
    prepararTelaPresencas();
  }
  if (view === "turmas" && typeof prepararTelaTurmas === "function") {
    prepararTelaTurmas();
  }
  if (view === "avisos") {
    carregarAvisos();
  }
  if (view === "solicitacoes") {
    carregarSolicitacoesAlteracao();
  }
  if (view === "aniversariantes" && typeof renderizarAniversariantes === "function") {
    renderizarAniversariantes();
  }
  if (view === "programaFight" && typeof prepararProgramaFight === "function") {
    prepararProgramaFight();
  }

  fecharMenuLateral();
  window.scrollTo({ top: 0, behavior: "smooth" });
}


function abrirMenuLateral() {
  document.body.classList.add("menu-aberto");
}

function fecharMenuLateral() {
  document.body.classList.remove("menu-aberto");
}

function inicializarNavegacaoPrincipal() {
  if (btnAbrirMenu) {
    btnAbrirMenu.addEventListener("click", function(event) {
      event.preventDefault();
      event.stopPropagation();
      abrirMenuLateral();
    });
  }

  if (menuOverlay) {
    menuOverlay.addEventListener("click", fecharMenuLateral);
  }

  document.querySelectorAll("[data-mobile-menu-open]").forEach(botao => {
    if (botao.dataset.mobileMenuConfigurado === "true") return;
    botao.dataset.mobileMenuConfigurado = "true";
    botao.addEventListener("click", event => {
      event.preventDefault();
      abrirMenuLateral();
    });
  });

  document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
      fecharMenuLateral();
    }

    const tecla = String(event.key || "").toLowerCase();
    const atalhoBusca = tecla === "k" && (event.ctrlKey || event.metaKey);

    if (atalhoBusca) {
      event.preventDefault();
      abrirViewPrincipal("alunos");

      setTimeout(() => {
        const campo = document.getElementById("campoBusca");
        if (campo) {
          campo.focus();
          campo.select();
        }
      }, 80);
    }
  });

  if (btnNavDashboard) btnNavDashboard.addEventListener("click", () => abrirViewPrincipal("dashboard"));
  if (btnNavAlunos) btnNavAlunos.addEventListener("click", () => abrirViewPrincipal("alunos"));
  if (btnNavFinanceiro) btnNavFinanceiro.addEventListener("click", () => abrirViewPrincipal("financeiro"));

  const botaoNavDesafio = document.getElementById("btnNavDesafio");
  if (botaoNavDesafio) botaoNavDesafio.addEventListener("click", () => abrirViewPrincipal("desafio"));

  if (btnNavEvolucao) btnNavEvolucao.addEventListener("click", () => abrirViewPrincipal("evolucao"));
  if (btnNavPresencas) btnNavPresencas.addEventListener("click", () => abrirViewPrincipal("presencas"));
  if (btnNavTurmas) btnNavTurmas.addEventListener("click", () => abrirViewPrincipal("turmas"));
  if (btnNavAniversariantes) btnNavAniversariantes.addEventListener("click", () => abrirViewPrincipal("aniversariantes"));
  if (btnNavAvisos) btnNavAvisos.addEventListener("click", () => abrirViewPrincipal("avisos"));
  if (btnNavSolicitacoes) btnNavSolicitacoes.addEventListener("click", () => abrirViewPrincipal("solicitacoes"));

  const btnNavProgramaFight = document.getElementById("btnNavProgramaFight");
  if (btnNavProgramaFight) {
    btnNavProgramaFight.addEventListener("click", () => abrirViewPrincipal("programaFight"));
  }

  if (btnNavPerfil) btnNavPerfil.addEventListener("click", () => abrirViewPrincipal("perfil"));

  if (btnNavCadastrar) {
    btnNavCadastrar.addEventListener("click", () => {
      fecharMenuLateral();
      if (btnMostrarForm) btnMostrarForm.click();
    });
  }

  if (btnAbrirCadastroRapido) {
    btnAbrirCadastroRapido.addEventListener("click", () => {
      if (btnMostrarForm) btnMostrarForm.click();
    });
  }

  if (btnAtualizarSolicitacoes) btnAtualizarSolicitacoes.addEventListener("click", carregarSolicitacoesAlteracao);
  inicializarFiltrosSolicitacoes();

  document.querySelectorAll("[data-view-target]").forEach(botao => {
    botao.addEventListener("click", () => abrirViewPrincipal(botao.dataset.viewTarget));
  });
}


function limparNumeroWhatsApp(numero) {
  return String(numero || "").replace(/\D/g, "");
}

function obterNumeroConfiguracao(campo, padrao, minimo, maximo) {
  const valor = Number(campo?.value || padrao);
  if (!Number.isFinite(valor)) return padrao;
  return Math.min(maximo, Math.max(minimo, Math.round(valor)));
}

async function salvarPerfilProfessor(event) {
  event.preventDefault();

  if (!usuarioAtual) {
    mostrarToast("Você precisa estar logado.", "erro");
    return;
  }

  const nome = perfilNomeEmpresa ? perfilNomeEmpresa.value.trim() : "";
  const whatsapp = perfilWhatsApp ? limparNumeroWhatsApp(perfilWhatsApp.value) : "";
  const campoPixCopiaCola = document.getElementById("perfilPixCopiaCola");
  const pixCopiaCola = campoPixCopiaCola ? campoPixCopiaCola.value.trim() : "";

  const presencaMinima = obterNumeroConfiguracao(perfilPresencaMinima, 70, 0, 100);
  const periodoFrequencia = obterNumeroConfiguracao(perfilPeriodoFrequencia, 6, 1, 24);
  const minimoAulasRanking = obterNumeroConfiguracao(perfilRankingMinimoAulas, 4, 0, 100);

  if (!nome) {
    if (msgPerfil) msgPerfil.textContent = "Informe o nome da academia.";
    mostrarToast("Informe o nome da academia.", "erro");
    return;
  }

  if (whatsapp && whatsapp.length < 10) {
    if (msgPerfil) msgPerfil.textContent = "Informe um WhatsApp válido com DDD.";
    mostrarToast("Informe um WhatsApp válido com DDD.", "erro");
    return;
  }

  const botaoAcionado = event.submitter;
  const botaoSalvar = botaoAcionado?.matches?.("button[type='submit']")
    ? botaoAcionado
    : formPerfil?.querySelector("button[type='submit']");
  const textoOriginalBotao = botaoSalvar?.textContent || "Salvar configurações";

  if (botaoSalvar) {
    botaoSalvar.disabled = true;
    botaoSalvar.textContent = "Salvando...";
  }

  const { error } = await supabaseClient
    .from("profiles")
    .update({
      nome_empresa: nome,
      whatsapp_professor: whatsapp || null,
      pix_copia_cola: pixCopiaCola || null,
      presenca_minima_percentual: presencaMinima,
      frequencia_periodo_meses: periodoFrequencia,
      ranking_minimo_aulas: minimoAulasRanking
    })
    .eq("id", usuarioAtual.id);

  if (botaoSalvar) {
    botaoSalvar.disabled = false;
    botaoSalvar.textContent = textoOriginalBotao;
  }

  if (error) {
    if (msgPerfil) msgPerfil.textContent = "Erro ao salvar configurações.";
    mostrarToast("Erro ao salvar configurações.", "erro");
    return;
  }

  nomeEmpresa = nome;
  presencaMinimaPercentual = presencaMinima;
  frequenciaPeriodoMeses = periodoFrequencia;
  rankingMinimoAulas = minimoAulasRanking;

  sincronizarEstado();

  if (nomeClienteDashboard) {
    nomeClienteDashboard.textContent = nome;
  }

  if (perfilWhatsApp) perfilWhatsApp.value = whatsapp;
  if (campoPixCopiaCola) campoPixCopiaCola.value = pixCopiaCola;
  if (perfilPresencaMinima) perfilPresencaMinima.value = presencaMinima;
  if (perfilPeriodoFrequencia) perfilPeriodoFrequencia.value = periodoFrequencia;
  if (perfilRankingMinimoAulas) perfilRankingMinimoAulas.value = minimoAulasRanking;

  if (msgPerfil) {
    msgPerfil.textContent = "Configurações salvas com sucesso.";
  }

  mostrarToast("Configurações salvas com sucesso!");

  if (typeof atualizarOnboardingProfessor === "function") {
    atualizarOnboardingProfessor();
  }
}

if (formPerfil) {
  formPerfil.addEventListener("submit", salvarPerfilProfessor);
}



// ===============================
