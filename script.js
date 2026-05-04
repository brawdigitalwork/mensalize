// ===============================
// CONECTANDO AO SUPABASE
// ===============================

const supabaseClient = supabase.createClient(
  CONFIG.supabaseUrl,
  CONFIG.supabaseAnonKey
);

// ===============================
// CONFIGURAÇÕES VISUAIS
// ===============================

document.getElementById("loginNomeApp").textContent = CONFIG.nomeApp;
document.getElementById("loginSlogan").textContent = CONFIG.slogan;
document.getElementById("nomeApp").textContent = CONFIG.nomeApp;
document.getElementById("slogan").textContent = CONFIG.slogan;

// ===============================
// VARIÁVEIS PRINCIPAIS
// ===============================

let alunos = [];
let usuarioAtual = null;
let alunoEditandoId = null;
let limiteAlunos = 30;
let usuarioEhAdmin = false;
let filtroAtual = "todos";
let textoBusca = "";

// ===============================
// ELEMENTOS DO LOGIN
// ===============================

const telaLogin = document.getElementById("telaLogin");
const app = document.getElementById("app");
const telaAdmin = document.getElementById("telaAdmin");

const emailLogin = document.getElementById("emailLogin");
const senhaLogin = document.getElementById("senhaLogin");
const btnEntrar = document.getElementById("btnEntrar");
const btnSair = document.getElementById("btnSair");
const mensagemLogin = document.getElementById("mensagemLogin");
const emailUsuario = document.getElementById("emailUsuario");


const btnAdmin = document.getElementById("btnAdmin");
const btnVoltar = document.getElementById("btnVoltar");

const novoEmail = document.getElementById("novoEmail");
const novaSenha = document.getElementById("novaSenha");
const btnCriarUsuario = document.getElementById("btnCriarUsuario");
const msgAdmin = document.getElementById("msgAdmin");
const listaClientes = document.getElementById("listaClientes");
const totalClientes = document.getElementById("totalClientes");
const totalAlunosAdmin = document.getElementById("totalAlunosAdmin");
const campoBusca = document.getElementById("campoBusca");
const clientesLimite = document.getElementById("clientesLimite");



// ===============================
// ELEMENTOS DO SISTEMA
// ===============================

let clientesCache = [];
const formAluno = document.getElementById("formAluno");
const listaAlunos = document.getElementById("listaAlunos");
const toast = document.getElementById("toast");
const contadorLista = document.getElementById("contadorLista");
const modalHistorico = document.getElementById("modalHistorico");
const modalNomeAluno = document.getElementById("modalNomeAluno");
const modalInfoAluno = document.getElementById("modalInfoAluno");
const modalListaPagamentos = document.getElementById("modalListaPagamentos");
const modalAluno = document.getElementById("modalAluno");
const btnFecharModalAluno = document.getElementById("btnFecharModalAluno");
const btnFecharModal = document.getElementById("btnFecharModal");
const modalConfirmarRemocao = document.getElementById("modalConfirmarRemocao");
const textoConfirmarRemocao = document.getElementById("textoConfirmarRemocao");
const btnCancelarRemocao = document.getElementById("btnCancelarRemocao");
const btnConfirmarRemocao = document.getElementById("btnConfirmarRemocao");
const modalRemoverCliente = document.getElementById("modalRemoverCliente");
const textoRemoverCliente = document.getElementById("textoRemoverCliente");
const btnCancelarRemoverCliente = document.getElementById("btnCancelarRemoverCliente");
const btnConfirmarRemoverCliente = document.getElementById("btnConfirmarRemoverCliente");

let clienteParaRemoverId = null;
let clienteParaRemoverEmail = "";

let alunoParaRemoverId = null;

const totalAlunos = document.getElementById("totalAlunos");
const totalPagos = document.getElementById("totalPagos");
const totalPendentes = document.getElementById("totalPendentes");
const totalAtrasados = document.getElementById("totalAtrasados");
const totalAReceber = document.getElementById("totalAReceber");
const totalPrevisao = document.getElementById("totalPrevisao");

const tituloFormulario = document.getElementById("tituloFormulario");
const btnFormulario = document.getElementById("btnFormulario");
const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");

// ===============================
// INICIAR SISTEMA
// ===============================

iniciarSistema();

async function iniciarSistema() {
  const { data } = await supabaseClient.auth.getSession();

  if (data.session) {
    usuarioAtual = data.session.user;
    await mostrarApp();
    await carregarAlunos();
  } else {
    mostrarLogin();
  }
}

// ===============================
// MOSTRAR LOGIN / APP
// ===============================

function mostrarLogin() {
  telaLogin.classList.remove("escondido");
  app.classList.add("escondido");
  telaAdmin.classList.add("escondido");

  btnAdmin.classList.add("escondido");

  emailLogin.value = "";
  senhaLogin.value = "";
  mensagemLogin.textContent = "";
}

async function mostrarApp() {
  telaLogin.classList.add("escondido");
  telaAdmin.classList.add("escondido");
  app.classList.remove("escondido");

  emailUsuario.textContent = usuarioAtual.email;

  await carregarPerfil();
}

// ===============================
// CARREGAR PERFIL DO USUÁRIO
// ===============================

async function carregarPerfil() {
  btnAdmin.classList.add("escondido");
  usuarioEhAdmin = false;
  limiteAlunos = 30;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("is_admin, limite_alunos")
    .eq("id", usuarioAtual.id)
    .single();

  if (error) {
    console.log("Erro ao carregar perfil:", error.message);
    return;
  }

  usuarioEhAdmin = data.is_admin === true;
  limiteAlunos = data.limite_alunos || 30;

  if (usuarioEhAdmin) {
    btnAdmin.classList.remove("escondido");
  }
}

// ===============================
// CRIAR CONTA
// ===============================



// ===============================
// ENTRAR
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

  await mostrarApp();
  await carregarAlunos();
});

// ===============================
// SAIR
// ===============================

btnSair.addEventListener("click", async function() {
  await supabaseClient.auth.signOut();

  usuarioAtual = null;
  alunos = [];
  alunoEditandoId = null;
  usuarioEhAdmin = false;
  limiteAlunos = 30;

 formAluno.reset();
 modalAluno.classList.add("escondido");
 await carregarAlunos();

});

// ===============================
// CARREGAR ALUNOS DO SUPABASE
// ===============================

async function carregarAlunos() {
  const { data, error } = await supabaseClient
    .from("alunos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    mostrarToast("Erro ao carregar alunos.", "erro");
    return;
  }

  alunos = data;
  mostrarAlunos();
  await atualizarPainel();
}

// ===============================
// CADASTRAR / ATUALIZAR ALUNO
// ===============================

formAluno.addEventListener("submit", async function(event) {
  event.preventDefault();

  const nome = document.getElementById("nomeAluno").value.trim();
  const telefone = document.getElementById("telefoneAluno").value.trim();
  const valor = document.getElementById("valorMensalidade").value;
  const vencimento = document.getElementById("dataVencimento").value;

  if (!usuarioAtual) {
   mostrarToast("Você precisa estar logado.", "erro");
    return;
  }

  if (alunoEditandoId) {
    const { error } = await supabaseClient
      .from("alunos")
      .update({
        nome: nome,
        telefone: telefone,
        valor: valor,
        vencimento: vencimento
      })
      .eq("id", alunoEditandoId);

    if (error) {
      mostrarToast("Erro ao atualizar aluno.", "erro");
      return;
    }

    sairModoEdicao();
    mostrarToast("Aluno atualizado com sucesso!");
  } else {
    if (!usuarioEhAdmin && alunos.length >= limiteAlunos) {
     mostrarToast(`Limite de ${limiteAlunos} alunos atingido.`, "erro");
      return;
    }

    const { error } = await supabaseClient
      .from("alunos")
      .insert({
        user_id: usuarioAtual.id,
        nome: nome,
        telefone: telefone,
        valor: valor,
        vencimento: vencimento,
        status_pagamento: "pendente"
      });

    if (error) {
      mostrarToast("Erro ao cadastrar aluno.", "erro");
      return;
    }

    mostrarToast("Aluno cadastrado com sucesso!");
  }

  formAluno.reset();
  modalAluno.classList.add("escondido");
  await carregarAlunos();
});

// ===============================
// CANCELAR EDIÇÃO
// ===============================

btnCancelarEdicao.addEventListener("click", function() {
  sairModoEdicao();
  formAluno.reset();
});

function sairModoEdicao() {
  alunoEditandoId = null;
  tituloFormulario.textContent = "Cadastrar aluno";
  btnFormulario.textContent = "Cadastrar aluno";
  btnCancelarEdicao.classList.add("escondido");
}

// ===============================
// FUNÇÕES DE DATA
// ===============================

function verificarStatus(vencimento) {
  const hoje = new Date();

  const dataHoje = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate()
  );

  const partes = vencimento.split("-");
  const dataVencimento = new Date(
    Number(partes[0]),
    Number(partes[1]) - 1,
    Number(partes[2])
  );

  if (dataHoje > dataVencimento) {
    return "atrasado";
  }

  return "pendente";
}

function calcularDias(vencimento) {
  const hoje = new Date();

  const dataHoje = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate()
  );

  const partes = vencimento.split("-");
  const dataVencimento = new Date(
    Number(partes[0]),
    Number(partes[1]) - 1,
    Number(partes[2])
  );

  const diff = dataVencimento - dataHoje;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatarData(data) {
  const partes = data.split("-");
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// ===============================
// MOSTRAR ALUNOS
// ===============================

function mostrarAlunos() {
  console.log("Alunos carregados:", alunos);
  console.log("Filtro atual:", filtroAtual);

  listaAlunos.innerHTML = "";

  let alunosExibidos = 0;

  if (alunos.length === 0) {
    listaAlunos.innerHTML = "<p>Nenhum aluno cadastrado ainda.</p>";
    return;
  }

alunos.forEach(function(aluno) {

  const status = verificarStatus(aluno.vencimento);
  const dias = calcularDias(aluno.vencimento);

  const nomeAluno = aluno.nome.toLowerCase();
  const telefoneAluno = aluno.telefone.toLowerCase();

  if (
    textoBusca &&
    !nomeAluno.includes(textoBusca) &&
    !telefoneAluno.includes(textoBusca)
  ) {
  return;
  }

  // 🔥 FILTRO (ADICIONA ISSO)
  if (filtroAtual === "pendente" && (status !== "pendente" || dias === 0)) return;
  if (filtroAtual === "atrasado" && status !== "atrasado") return;
  if (filtroAtual === "hoje" && dias !== 0) return;

  let textoStatus = "";
  let classeStatus = "";

  if (status === "atrasado") {
    textoStatus = `Atrasado há ${Math.abs(dias)} dia(s)`;
    classeStatus = "status-atrasado";

  } else if (dias === 0) {
    textoStatus = "Vence hoje";
    classeStatus = "status-pendente";

  } else if (dias <= 3) {
    textoStatus = `Vence em ${dias} dia(s)`;
    classeStatus = "status-pendente";

  } else {
    textoStatus = "Pendente";
    classeStatus = "status-pendente";
  }
    alunosExibidos++;
    const card = document.createElement("div");
    card.classList.add("aluno-card");

    card.innerHTML = `
  <div class="aluno-premium-topo">
    <div>
      <h3>${aluno.nome}</h3>
      <p>WhatsApp: ${aluno.telefone}</p>
    </div>

    <span class="badge-status ${classeStatus}">
      ${textoStatus}
    </span>
  </div>

  <div class="aluno-premium-grid">
    <div class="info-premium">
      <span>Mensalidade</span>
      <strong>${Number(aluno.valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      })}</strong>
    </div>

    <div class="info-premium">
      <span>Vencimento</span>
      <strong>${formatarData(aluno.vencimento)}</strong>
    </div>
  </div>

  <div class="acoes-premium">
    <button class="acao-principal" onclick="marcarComoPago('${aluno.id}')">
      Registrar pagamento
    </button>

    <button class="acao-secundaria whatsapp" onclick="enviarWhatsApp('${aluno.id}')">
      WhatsApp
    </button>

    <button class="acao-secundaria" onclick="abrirHistorico('${aluno.id}')">
      Histórico
    </button>

    <button class="acao-secundaria" onclick="editarAluno('${aluno.id}')">
      Editar
    </button>

    <button class="acao-perigo" onclick="removerAluno('${aluno.id}')">
      Remover
    </button>
  </div>
`;

    listaAlunos.appendChild(card);
  });

  contadorLista.textContent = `${alunosExibidos} aluno(s)`;
}

// ===============================
// ATUALIZAR PAINEL
// ===============================

async function atualizarPainel() {
  let pendentes = 0;
  let atrasados = 0;
  let valorAReceber = 0;

  alunos.forEach(function(aluno) {
    const status = verificarStatus(aluno.vencimento);

   if (status === "atrasado") {
    atrasados++;
    valorAReceber += Number(aluno.valor);
   } else {
    pendentes++;
    valorAReceber += Number(aluno.valor);
   }
  });

  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const { data: pagamentos, error } = await supabaseClient
    .from("pagamentos")
    .select("*")
    .gte("data_pagamento", primeiroDiaMes)
    .lte("data_pagamento", ultimoDiaMes);

  if (error) {
    console.log("Erro ao carregar pagamentos:", error.message);
    
    totalPagos.textContent = 0;
    totalRecebido.textContent = "R$ 0,00";

    totalPrevisao.textContent = valorAReceber.toLocaleString("pt-BR", {
     style: "currency",
    currency: "BRL"
  });

  } else {
    totalPagos.textContent = pagamentos.length;

    const recebido = pagamentos.reduce((total, pagamento) => {
      return total + Number(pagamento.valor);
    }, 0);

    totalRecebido.textContent = recebido.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });

    const previsao = recebido + valorAReceber;

    totalPrevisao.textContent = previsao.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  totalAlunos.textContent = alunos.length;
  totalPendentes.textContent = pendentes;
  totalAtrasados.textContent = atrasados;
  totalAReceber.textContent = valorAReceber.toLocaleString("pt-BR", {
  style: "currency",
  currency: "BRL"
  });
}

// ===============================
// MARCAR COMO PAGO
// ===============================

async function marcarComoPago(id) {
  const aluno = alunos.find(a => a.id === id);

  if (!aluno) {
    mostrarToast("Aluno não encontrado.", "erro");
    return;
  }

  // 1. Registra o pagamento na tabela pagamentos
  const { error: erroPagamento } = await supabaseClient
    .from("pagamentos")
    .insert({
      aluno_id: aluno.id,
      user_id: aluno.user_id,
      valor: aluno.valor
    });

  if (erroPagamento) {
    mostrarToast("Erro ao registrar pagamento.", "erro");
    return;
  }

  // 2. Calcula próximo vencimento
  const partes = aluno.vencimento.split("-");
  const ano = Number(partes[0]);
  const mes = Number(partes[1]) - 1;
  const dia = Number(partes[2]);

  const novaData = new Date(ano, mes + 1, dia);

  const novoAno = novaData.getFullYear();
  const novoMes = String(novaData.getMonth() + 1).padStart(2, "0");
  const novoDia = String(novaData.getDate()).padStart(2, "0");

  const novoVencimento = `${novoAno}-${novoMes}-${novoDia}`;

  // 3. Atualiza o vencimento para o próximo mês
  const { error } = await supabaseClient
    .from("alunos")
    .update({
      vencimento: novoVencimento,
      status_pagamento: "pendente"
    })
    .eq("id", id);

  if (error) {
    mostrarToast("Pagamento salvo, mas erro ao atualizar vencimento.", "erro");
    return;
  }

  await carregarAlunos();

mostrarToast(`Pagamento registrado! Próximo vencimento: ${formatarData(novoVencimento)}`);
}

// ===============================
// REMOVER ALUNO
// ===============================

function removerAluno(id) {
  const aluno = alunos.find(a => a.id === id);

  if (!aluno) {
    mostrarToast("Aluno não encontrado.", "erro");
    return;
  }

  alunoParaRemoverId = id;
  textoConfirmarRemocao.textContent = `Tem certeza que deseja remover ${aluno.nome}?`;
  modalConfirmarRemocao.classList.remove("escondido");
}

// ===============================
// EDITAR ALUNO
// ===============================

function editarAluno(id) {
  const aluno = alunos.find(a => a.id === id);

  if (!aluno) {
   mostrarToast("Aluno não encontrado.", "erro");
    return;
  }

  alunoEditandoId = id;

  document.getElementById("nomeAluno").value = aluno.nome;
  document.getElementById("telefoneAluno").value = aluno.telefone;
  document.getElementById("valorMensalidade").value = aluno.valor;
  document.getElementById("dataVencimento").value = aluno.vencimento;

  tituloFormulario.textContent = "Editar aluno";
  btnFormulario.textContent = "Atualizar aluno";
  btnCancelarEdicao.classList.remove("escondido");

  modalAluno.classList.remove("escondido");

}

// ===============================
// WHATSAPP
// ===============================

function enviarWhatsApp(id) {
  const aluno = alunos.find(a => a.id === id);

  if (!aluno) {
   mostrarToast("Aluno não encontrado.", "erro");
    return;
  }

  const dias = calcularDias(aluno.vencimento);
  const data = formatarData(aluno.vencimento);

  let msg = "";

  if (dias < 0) {
    msg = `Olá ${aluno.nome}, sua mensalidade venceu em ${data}. Valor: R$ ${aluno.valor}.`;
  } else if (dias === 0) {
    msg = `Olá ${aluno.nome}, sua mensalidade vence HOJE. Valor: R$ ${aluno.valor}.`;
  } else if (dias <= 3) {
    msg = `Olá ${aluno.nome}, sua mensalidade vence em ${dias} dia(s), no dia ${data}. Valor: R$ ${aluno.valor}.`;
  } else {
    msg = `Olá ${aluno.nome}, sua mensalidade vence no dia ${data}. Valor: R$ ${aluno.valor}.`;
  }

  const tel = aluno.telefone.replace(/\D/g, "");
  window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, "_blank");
}

// ===============================
// PAINEL ADMIN
// ===============================

btnAdmin.addEventListener("click", async function() {
  app.classList.add("escondido");
  telaAdmin.classList.remove("escondido");

  await carregarClientes();
  await carregarDashboard();
});

btnVoltar.addEventListener("click", function() {
  telaAdmin.classList.add("escondido");
  app.classList.remove("escondido");
});

btnCriarUsuario.addEventListener("click", async function() {
  const email = novoEmail.value.trim();
  const senha = novaSenha.value.trim();

  if (!email || !senha) {
    msgAdmin.textContent = "Preencha email e senha.";
    return;
  }

  msgAdmin.textContent = "Criando usuário...";

  try {
    const res = await fetch("https://wdeyorkcrenibtkbgsjw.supabase.co/functions/v1/smart-function", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": CONFIG.supabaseAnonKey,
        "Authorization": `Bearer ${CONFIG.supabaseAnonKey}`
      },
      body: JSON.stringify({
        email: email,
        senha: senha
      })
    });

    const data = await res.json();

    console.log("Resposta criar usuário:", data);

    if (data.error) {
      msgAdmin.textContent = "Erro: " + data.error;
      return;
    }

    msgAdmin.textContent = "Usuário criado com sucesso!";

    novoEmail.value = "";
    novaSenha.value = "";

    await carregarClientes();
    await carregarDashboard();

  } catch (err) {
    console.log("Erro completo ao criar usuário:", err);
    msgAdmin.textContent = "Erro ao criar usuário.";
  }
});

async function carregarClientes() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*");

  if (error) {
    mostrarToast("Erro ao carregar clientes.", "erro");
    return;
  }
  clientesCache = data;
  listaClientes.innerHTML = "";

  data.forEach(cliente => {
    const div = document.createElement("div");

    div.classList.add("cliente-card");

    div.innerHTML = `
      <div class="cliente-header">
        <strong>${cliente.email}</strong>

        <div style="display:flex; gap:10px; align-items:center;">
          
          <span class="${cliente.is_admin ? "badge-admin" : "badge-cliente"}">
            ${cliente.is_admin ? "ADMIN" : "CLIENTE"}
          </span>

          <button onclick="removerCliente('${cliente.id}')" 
            style="background:#ef4444; border:none; padding:5px 10px; border-radius:6px; cursor:pointer;">
            🗑
          </button>

        </div>
      </div>

      <div class="cliente-info">
        <label>Limite de alunos</label>
        <input 
          type="number" 
          value="${cliente.limite_alunos}" 
          onchange="alterarLimite('${cliente.id}', this.value)"
        >
      </div>
    `;

    listaClientes.appendChild(div);
  });
}

async function alterarLimite(id, novoLimite) {
  const { error } = await supabaseClient
    .from("profiles")
    .update({ limite_alunos: Number(novoLimite) })
    .eq("id", id);

  if (error) {
   mostrarToast("Erro ao atualizar limite.", "erro");
    return;
  }

 mostrarToast("Limite atualizado com sucesso!");
}

async function carregarDashboard() {
  const { data: clientes, error: erroClientes } = await supabaseClient
    .from("profiles")
    .select("*");

  const { data: alunos, error: erroAlunos } = await supabaseClient
    .from("alunos")
    .select("*");

  if (erroClientes || erroAlunos) {
    mostrarToast("Erro ao carregar dashboard.", "erro");
    return;
  }

  totalClientes.textContent = clientes.length;
  totalAlunosAdmin.textContent = alunos.length;

  let noLimite = 0;

  clientes.forEach(cliente => {
    const alunosDoCliente = alunos.filter(a => String(a.user_id) === String(cliente.id));

    console.log("Cliente:", cliente.email);
    console.log("Alunos:", alunosDoCliente.length);
    console.log("Limite:", cliente.limite_alunos);

    if (alunosDoCliente.length >= cliente.limite_alunos) {
      noLimite++;
    }
  });

  clientesLimite.textContent = noLimite;
}

function removerCliente(userId) {
  const perfil = clientesCache.find(c => c.id === userId);

  clienteParaRemoverId = userId;
  clienteParaRemoverEmail = perfil ? perfil.email : "este cliente";

  textoRemoverCliente.textContent =
    `Tem certeza que deseja remover ${clienteParaRemoverEmail}? Essa ação removerá a conta, alunos e pagamentos.`;

  modalRemoverCliente.classList.remove("escondido");
}

function setFiltro(filtro) {
  filtroAtual = filtro;

  document.querySelectorAll(".filtros button").forEach(botao => {
    botao.classList.remove("filtro-ativo");
  });

  if (filtro === "todos") {
    document.getElementById("filtroTodos").classList.add("filtro-ativo");
  }

  if (filtro === "pendente") {
    document.getElementById("filtroPendente").classList.add("filtro-ativo");
  }

  if (filtro === "atrasado") {
    document.getElementById("filtroAtrasado").classList.add("filtro-ativo");
  }

  if (filtro === "hoje") {
    document.getElementById("filtroHoje").classList.add("filtro-ativo");
  }

  mostrarAlunos();
}

setFiltro("todos");

async function abrirHistorico(alunoId) {
  const aluno = alunos.find(a => a.id === alunoId);

  if (!aluno) {
    mostrarToast("Aluno não encontrado.", "erro");
    return;
  }

  const status = verificarStatus(aluno.vencimento);
  const dias = calcularDias(aluno.vencimento);

  let textoStatus = "Pendente";
  let classeStatus = "status-pendente";

  if (status === "atrasado") {
    textoStatus = `Atrasado há ${Math.abs(dias)} dia(s)`;
    classeStatus = "status-atrasado";
  } else if (dias === 0) {
    textoStatus = "Vence hoje";
    classeStatus = "status-pendente";
  } else if (dias <= 3) {
    textoStatus = `Vence em ${dias} dia(s)`;
    classeStatus = "status-pendente";
  }

  modalNomeAluno.textContent = aluno.nome;

  modalInfoAluno.innerHTML = `
    <p><strong>WhatsApp:</strong> ${aluno.telefone}</p>
    <p><strong>Mensalidade:</strong> ${Number(aluno.valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    })}</p>
    <p><strong>Vencimento atual:</strong> ${formatarData(aluno.vencimento)}</p>
    <p><strong>Status:</strong> <span class="${classeStatus}">${textoStatus}</span></p>
  `;

  modalListaPagamentos.innerHTML = "<p>Carregando histórico...</p>";

  modalHistorico.classList.remove("escondido");

  const { data, error } = await supabaseClient
    .from("pagamentos")
    .select("*")
    .eq("aluno_id", alunoId)
    .order("data_pagamento", { ascending: false });

  if (error) {
    modalListaPagamentos.innerHTML = "<p>Erro ao carregar histórico.</p>";
    return;
  }

  if (data.length === 0) {
    modalListaPagamentos.innerHTML = "<p>Nenhum pagamento registrado ainda.</p>";
    return;
  }

  modalListaPagamentos.innerHTML = "";

  data.forEach(pagamento => {
    const div = document.createElement("div");
    div.classList.add("pagamento-item");

    const valor = Number(pagamento.valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });

    div.innerHTML = `
      <span>${formatarData(pagamento.data_pagamento)}</span>
      <strong>${valor}</strong>
    `;

    modalListaPagamentos.appendChild(div);
  });
}

campoBusca.addEventListener("input", function() {
  textoBusca = campoBusca.value.toLowerCase().trim();
  mostrarAlunos();
});

btnFecharModal.addEventListener("click", function() {
  modalHistorico.classList.add("escondido");
});

modalHistorico.addEventListener("click", function(event) {
  if (event.target === modalHistorico) {
    modalHistorico.classList.add("escondido");
  }
});

function mostrarToast(mensagem, tipo = "sucesso") {
  toast.textContent = mensagem;
  toast.className = `toast toast-${tipo}`;

  setTimeout(() => {
    toast.classList.add("escondido");
  }, 3500);
}

async function confirmarRemocaoAluno() {
  if (!alunoParaRemoverId) return;

  const { error } = await supabaseClient
    .from("alunos")
    .delete()
    .eq("id", alunoParaRemoverId);

  if (error) {
    mostrarToast("Erro ao remover aluno.", "erro");
    return;
  }

  alunoParaRemoverId = null;
  modalConfirmarRemocao.classList.add("escondido");

  await carregarAlunos();

  mostrarToast("Aluno removido com sucesso!");
}

btnCancelarRemocao.addEventListener("click", function() {
  alunoParaRemoverId = null;
  modalConfirmarRemocao.classList.add("escondido");
});

btnConfirmarRemocao.addEventListener("click", confirmarRemocaoAluno);

modalConfirmarRemocao.addEventListener("click", function(event) {
  if (event.target === modalConfirmarRemocao) {
    alunoParaRemoverId = null;
    modalConfirmarRemocao.classList.add("escondido");
  }
});

async function confirmarRemocaoCliente() {
  if (!clienteParaRemoverId) return;

  try {
    const res = await fetch("https://wdeyorkcrenibtkbgsjw.supabase.co/functions/v1/deletar-usuario", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": CONFIG.supabaseAnonKey,
        "Authorization": `Bearer ${CONFIG.supabaseAnonKey}`
      },
      body: JSON.stringify({ user_id: clienteParaRemoverId })
    });

    const data = await res.json();

    if (data.error) {
      mostrarToast(data.error, "erro");
      return;
    }

    modalRemoverCliente.classList.add("escondido");

    clienteParaRemoverId = null;
    clienteParaRemoverEmail = "";

    await carregarClientes();
    await carregarDashboard();
    await carregarAlunos();

    mostrarToast("Cliente removido com sucesso!");

  } catch (err) {
    console.log("Erro completo:", err);
    mostrarToast("Erro ao remover cliente.", "erro");
  }
}

btnCancelarRemoverCliente.addEventListener("click", function() {
  clienteParaRemoverId = null;
  clienteParaRemoverEmail = "";
  modalRemoverCliente.classList.add("escondido");
});

btnConfirmarRemoverCliente.addEventListener("click", confirmarRemocaoCliente);

modalRemoverCliente.addEventListener("click", function(event) {
  if (event.target === modalRemoverCliente) {
    clienteParaRemoverId = null;
    clienteParaRemoverEmail = "";
    modalRemoverCliente.classList.add("escondido");
  }
});

// ===============================
// ABRIR / FECHAR MODAL DE ALUNO
// ===============================

if (btnMostrarForm && modalAluno) {
  btnMostrarForm.onclick = function() {
    alunoEditandoId = null;

    formAluno.reset();

    tituloFormulario.textContent = "Cadastrar aluno";
    btnFormulario.textContent = "Cadastrar aluno";
    btnCancelarEdicao.classList.add("escondido");

    modalAluno.classList.remove("escondido");
  };
}

if (btnFecharModalAluno && modalAluno) {
  btnFecharModalAluno.onclick = function() {
    modalAluno.classList.add("escondido");
  };
}

