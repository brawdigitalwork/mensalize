// 30.1 LINK DA PÁGINA DO ALUNO + SOLICITAÇÕES
// ===============================

function montarUrlPaginaAluno(codigoPublico) {
  if (!codigoPublico) return "";
  const base = window.location.origin || "";
  return `${base}/aluno.html?codigo=${encodeURIComponent(codigoPublico)}`;
}

function enviarLinkPaginaAluno(id) {
  const aluno = alunos.find(a => String(a.id) === String(id));

  if (!aluno) {
    mostrarToast("Aluno não encontrado.", "erro");
    return;
  }

  const numero = limparNumeroWhatsApp(aluno.telefone);
  if (!numero || numero.length < 10) {
    mostrarToast("Esse aluno ainda não tem WhatsApp cadastrado.", "erro");
    return;
  }

  if (!aluno.codigo_publico) {
    mostrarToast("Esse aluno ainda não tem link público.", "erro");
    return;
  }

  const linkPagina = montarUrlPaginaAluno(aluno.codigo_publico);
  const mensagem = `Olá, ${aluno.nome}. Segue sua página do aluno no ${nomeEmpresa || "Mensalize"}:\n\n${linkPagina}\n\nPor ela você consegue acompanhar sua mensalidade, pagamentos e dados da academia.`;
  const url = `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, "_blank");
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

function confirmarRespostaSolicitacao(chave, acao) {
  const registro = solicitacoesRenderizadasMensalize.get(chave);

  if (!registro) {
    mostrarToast("Solicitação não encontrada.", "erro");
    return;
  }

  const { solicitacao, aluno } = registro;
  const nome = aluno?.nome || "Aluno";
  const tipo = rotuloTipoSolicitacao(solicitacao).toLowerCase();
  const vaiAprovar = acao === "aprovar";

  const mensagem = vaiAprovar
    ? `Aprovar solicitação de ${tipo} de ${nome}?${solicitacao.categoria_solicitacao === "pagamento" ? "\n\nIsso pode registrar o pagamento do aluno." : "\n\nOs dados do aluno serão atualizados."}`
    : `Recusar solicitação de ${tipo} de ${nome}?\n\nEla será movida para a aba Recusadas.`;

  if (!confirm(mensagem)) return;

  if (solicitacao.categoria_solicitacao === "pagamento") {
    return vaiAprovar ? aprovarSolicitacaoPagamento(solicitacao.id) : recusarSolicitacaoPagamento(solicitacao.id);
  }

  return vaiAprovar ? aprovarSolicitacaoAlteracao(solicitacao.id) : recusarSolicitacaoAlteracao(solicitacao.id);
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
      .select("id, user_id, nome, telefone, valor, vencimento, turma, faixa, grau, data_ultima_graduacao")
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
    .select("id,user_id,nome,valor,vencimento")
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
    dataPagamento: solicitacao.data_pagamento || new Date().toISOString().split("T")[0],
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

  const botaoSalvar = formPerfil?.querySelector("button[type='submit']");
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
