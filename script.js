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

// ===============================
// ELEMENTOS DO LOGIN
// ===============================

const telaLogin = document.getElementById("telaLogin");
const app = document.getElementById("app");
const telaAdmin = document.getElementById("telaAdmin");

const emailLogin = document.getElementById("emailLogin");
const senhaLogin = document.getElementById("senhaLogin");
const btnEntrar = document.getElementById("btnEntrar");
const btnCriarConta = document.getElementById("btnCriarConta");
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
const clientesLimite = document.getElementById("clientesLimite");

// ===============================
// ELEMENTOS DO SISTEMA
// ===============================

const formAluno = document.getElementById("formAluno");
const listaAlunos = document.getElementById("listaAlunos");

const totalAlunos = document.getElementById("totalAlunos");
const totalPagos = document.getElementById("totalPagos");
const totalPendentes = document.getElementById("totalPendentes");
const totalAtrasados = document.getElementById("totalAtrasados");

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

btnCriarConta.addEventListener("click", async function() {
  const email = emailLogin.value.trim();
  const senha = senhaLogin.value.trim();

  if (!email || !senha) {
    mensagemLogin.textContent = "Preencha e-mail e senha.";
    return;
  }

  const { error } = await supabaseClient.auth.signUp({
    email: email,
    password: senha
  });

  if (error) {
    mensagemLogin.textContent = error.message;
    return;
  }

  mensagemLogin.textContent = "Conta criada. Verifique seu e-mail, se o Supabase pedir confirmação.";
});

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
  mostrarLogin();
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
    alert("Erro ao carregar alunos: " + error.message);
    return;
  }

  alunos = data;
  mostrarAlunos();
  atualizarPainel();
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
    alert("Você precisa estar logado.");
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
      alert("Erro ao atualizar aluno: " + error.message);
      return;
    }

    sairModoEdicao();
  } else {
    if (!usuarioEhAdmin && alunos.length >= limiteAlunos) {
      alert(`Limite de ${limiteAlunos} alunos atingido. Entre em contato para aumentar seu plano.`);
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
      alert("Erro ao cadastrar aluno: " + error.message);
      return;
    }
  }

  formAluno.reset();
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
  listaAlunos.innerHTML = "";

  if (alunos.length === 0) {
    listaAlunos.innerHTML = "<p>Nenhum aluno cadastrado ainda.</p>";
    return;
  }

  alunos.forEach(function(aluno) {
    const status = verificarStatus(aluno.vencimento);
    const dias = calcularDias(aluno.vencimento);

    let textoStatus = "";
    let classeStatus = "";

    if (aluno.status_pagamento === "pago") {
      textoStatus = "Pago";
      classeStatus = "status-pago";
    } else if (status === "atrasado") {
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

    const card = document.createElement("div");
    card.classList.add("aluno-card");

    card.innerHTML = `
      <h3>${aluno.nome}</h3>
      <p>WhatsApp: ${aluno.telefone}</p>
      <p>Valor: R$ ${aluno.valor}</p>
      <p>Vencimento: ${formatarData(aluno.vencimento)}</p>
      <p>Status: <span class="${classeStatus}">${textoStatus}</span></p>

      <div class="botoes-card">
        ${aluno.status_pagamento !== "pago" ? `
          <button class="btn-pago" onclick="marcarComoPago('${aluno.id}')">
            ✔ Pago
          </button>
        ` : ""}

        <button class="btn-whatsapp" onclick="enviarWhatsApp('${aluno.id}')">
          💬 WhatsApp
        </button>

        <button class="btn-editar" onclick="editarAluno('${aluno.id}')">
          ✏ Editar
        </button>

        <button class="btn-remover" onclick="removerAluno('${aluno.id}')">
          🗑 Remover
        </button>
      </div>
    `;

    listaAlunos.appendChild(card);
  });
}

// ===============================
// ATUALIZAR PAINEL
// ===============================

function atualizarPainel() {
  let pagos = 0;
  let pendentes = 0;
  let atrasados = 0;

  alunos.forEach(function(aluno) {
    const status = verificarStatus(aluno.vencimento);

    if (aluno.status_pagamento === "pago") {
      pagos++;
    } else if (status === "atrasado") {
      atrasados++;
    } else {
      pendentes++;
    }
  });

  totalAlunos.textContent = alunos.length;
  totalPagos.textContent = pagos;
  totalPendentes.textContent = pendentes;
  totalAtrasados.textContent = atrasados;
}

// ===============================
// MARCAR COMO PAGO
// ===============================

async function marcarComoPago(id) {
  const aluno = alunos.find(a => a.id === id);

  if (!aluno) {
    alert("Aluno não encontrado.");
    return;
  }

  const partes = aluno.vencimento.split("-");
  const ano = Number(partes[0]);
  const mes = Number(partes[1]) - 1;
  const dia = Number(partes[2]);

  const novaData = new Date(ano, mes + 1, dia);

  const novoAno = novaData.getFullYear();
  const novoMes = String(novaData.getMonth() + 1).padStart(2, "0");
  const novoDia = String(novaData.getDate()).padStart(2, "0");

  const novoVencimento = `${novoAno}-${novoMes}-${novoDia}`;

  const { error } = await supabaseClient
    .from("alunos")
    .update({
      vencimento: novoVencimento,
      status_pagamento: "pendente"
    })
    .eq("id", id);

  if (error) {
    alert("Erro ao registrar pagamento: " + error.message);
    return;
  }

  await carregarAlunos();
  alert("Pagamento registrado. Vencimento atualizado para o próximo mês.");
}

// ===============================
// REMOVER ALUNO
// ===============================

async function removerAluno(id) {
  const confirmar = confirm("Tem certeza que deseja remover este aluno?");

  if (!confirmar) return;

  const { error } = await supabaseClient
    .from("alunos")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Erro ao remover aluno: " + error.message);
    return;
  }

  await carregarAlunos();
}

// ===============================
// EDITAR ALUNO
// ===============================

function editarAluno(id) {
  const aluno = alunos.find(a => a.id === id);

  if (!aluno) {
    alert("Aluno não encontrado.");
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

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

// ===============================
// WHATSAPP
// ===============================

function enviarWhatsApp(id) {
  const aluno = alunos.find(a => a.id === id);

  if (!aluno) {
    alert("Aluno não encontrado.");
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
    msgAdmin.textContent = "Preencha tudo.";
    return;
  }

  try {
    const res = await fetch("https://wdeyorkcrenibtkbgsjw.supabase.co/functions/v1/smart-function", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": CONFIG.supabaseAnonKey
      },
      body: JSON.stringify({ email, senha })
    });

    const data = await res.json();

    if (data.error) {
      msgAdmin.textContent = data.error;
      return;
    }

    msgAdmin.textContent = "Usuário criado com sucesso!";
    await carregarClientes();

  } catch (err) {
    msgAdmin.textContent = "Erro ao criar usuário";
  }
});

async function carregarClientes() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*");

  if (error) {
    alert("Erro ao carregar clientes");
    return;
  }

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
    alert("Erro ao atualizar limite");
    return;
  }

  alert("Limite atualizado com sucesso");
}

async function carregarDashboard() {
  const { data: clientes, error: erroClientes } = await supabaseClient
    .from("profiles")
    .select("*");

  const { data: alunos, error: erroAlunos } = await supabaseClient
    .from("alunos")
    .select("*");

  if (erroClientes || erroAlunos) {
    alert("Erro ao carregar dashboard");
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

async function removerCliente(userId) {
  const confirmar = confirm("Tem certeza que deseja remover este cliente?");
  if (!confirmar) return;

  try {
    const res = await fetch("https://wdeyorkcrenibtkbgsjw.supabase.co/functions/v1/deletar-usuario", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": CONFIG.supabaseAnonKey,
        "Authorization": `Bearer ${CONFIG.supabaseAnonKey}`
      },
      body: JSON.stringify({ user_id: userId })
    });

    const data = await res.json();

    if (data.error) {
      alert(data.error);
      return;
    }

    console.log("Resposta da função:", data);

    alert("Cliente removido com sucesso!");

    await carregarClientes();
    await carregarDashboard();
    await carregarAlunos();

  } catch (err) {
    console.log("Erro completo:", err);
    alert("Erro ao remover cliente");
  }
}