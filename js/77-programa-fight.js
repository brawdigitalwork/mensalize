// 77. MENSALIZE FIGHT — PROGRAMA DE GRADUAÇÃO
// ================================================================
// CRUD do programa técnico por faixa: categorias + técnicas + link de vídeo.
// Banco: faixas, categorias_graduacao, tecnicas_graduacao.

let programaFightFaixas = [];
let programaFightCategorias = [];
let programaFightTecnicas = [];
let programaFightCarregando = false;
const programaFightCategoriasAbertas = new Set();

function programaFightAtivo() {
  return window.moduloFightAtivo === true;
}

function aplicarModuloFightInterface() {
  document.querySelectorAll('.modulo-fight').forEach(el => {
    el.classList.toggle('escondido', !programaFightAtivo());
  });
}

function programaFightEscape(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function programaFightNormalizar(valor) {
  return String(valor || '').trim().toLowerCase();
}

function programaFightFaixaPorId(id) {
  return programaFightFaixas.find(f => String(f.id) === String(id)) || null;
}

function programaFightCategoriaPorId(id) {
  return programaFightCategorias.find(c => String(c.id) === String(id)) || null;
}

function programaFightLabelCategoria(categoria) {
  const origem = programaFightFaixaPorId(categoria.faixa_origem_id)?.nome || 'Faixa';
  const destino = programaFightFaixaPorId(categoria.faixa_destino_id)?.nome || '';
  const transicao = destino ? `${origem} → ${destino}` : origem;
  return `${transicao} • ${categoria.nome}`;
}

function alternarProgramaFightCategoria(categoriaId) {
  const id = String(categoriaId || '');
  if (!id) return;

  if (programaFightCategoriasAbertas.has(id)) {
    programaFightCategoriasAbertas.delete(id);
  } else {
    programaFightCategoriasAbertas.add(id);
  }

  renderizarProgramaGraduacao();
}

function abrirTodasCategoriasProgramaFight() {
  programaFightCategorias.forEach(categoria => programaFightCategoriasAbertas.add(String(categoria.id)));
  renderizarProgramaGraduacao();
}

function fecharTodasCategoriasProgramaFight() {
  programaFightCategoriasAbertas.clear();
  renderizarProgramaGraduacao();
}

function abrirCriacaoProgramaFight(tipo) {
  const panel = document.getElementById('programaFightCriacaoPanel');
  const titulo = document.getElementById('programaFightCriacaoTitulo');
  const texto = document.getElementById('programaFightCriacaoTexto');
  const formCategoria = document.getElementById('formCategoriaGraduacao');
  const formTecnica = document.getElementById('formTecnicaGraduacao');

  if (!panel) return;

  const ehCategoria = tipo === 'categoria';
  panel.classList.remove('escondido');
  panel.dataset.aberto = tipo || 'tecnica';

  if (formCategoria) formCategoria.classList.toggle('escondido', !ehCategoria);
  if (formTecnica) formTecnica.classList.toggle('escondido', ehCategoria);

  if (titulo) titulo.textContent = ehCategoria ? 'Nova categoria de graduação' : 'Nova técnica do programa';
  if (texto) {
    texto.textContent = ehCategoria
      ? 'Crie um grupo, como Quedas, Defesas ou Finalizações, dentro de uma transição de faixa.'
      : 'Adicione um golpe, posição, requisito ou link de aula dentro de uma categoria já cadastrada.';
  }

  setTimeout(() => {
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const primeiroCampo = panel.querySelector(`${ehCategoria ? '#categoriaFaixaOrigem' : '#tecnicaGraduacaoCategoria'}`);
    if (primeiroCampo) primeiroCampo.focus({ preventScroll: true });
  }, 40);
}

function fecharCriacaoProgramaFight() {
  const panel = document.getElementById('programaFightCriacaoPanel');
  if (!panel) return;

  panel.classList.add('escondido');
  panel.dataset.aberto = '';

  const formCategoria = document.getElementById('formCategoriaGraduacao');
  const formTecnica = document.getElementById('formTecnicaGraduacao');
  if (formCategoria) formCategoria.classList.add('escondido');
  if (formTecnica) formTecnica.classList.add('escondido');
}


function programaFightOrdenarFaixas(lista) {
  return [...(lista || [])].sort((a, b) => {
    const aCustom = a.user_id ? 0 : 1;
    const bCustom = b.user_id ? 0 : 1;
    return aCustom - bCustom || Number(a.ordem || 0) - Number(b.ordem || 0) || String(a.nome).localeCompare(String(b.nome), 'pt-BR');
  });
}

function preencherSelectsProgramaFight() {
  const faixas = programaFightOrdenarFaixas(programaFightFaixas).filter(f => f.ativa !== false);
  const opcoesFaixas = faixas.map(f => `<option value="${f.id}">${programaFightEscape(f.nome)}${f.user_id ? ' • personalizada' : ''}</option>`).join('');

  const selectsFaixa = [
    document.getElementById('categoriaFaixaOrigem'),
    document.getElementById('categoriaFaixaDestino')
  ];

  selectsFaixa.forEach(select => {
    if (!select) return;
    const valor = select.value;
    const primeira = select.id === 'categoriaFaixaDestino' ? '<option value="">Opcional</option>' : '<option value="">Selecione</option>';
    select.innerHTML = `${primeira}${opcoesFaixas}`;
    if (valor && [...select.options].some(opt => opt.value === valor)) select.value = valor;
  });

  const filtro = document.getElementById('programaFightFiltroFaixa');
  if (filtro) {
    const valor = filtro.value || 'todos';
    filtro.innerHTML = `<option value="todos">Todas as faixas</option>${opcoesFaixas}`;
    if ([...filtro.options].some(opt => opt.value === valor)) filtro.value = valor;
  }

  const selectCategoria = document.getElementById('tecnicaGraduacaoCategoria');
  if (selectCategoria) {
    const valor = selectCategoria.value;
    const categorias = [...programaFightCategorias].sort((a, b) => {
      const fa = programaFightFaixaPorId(a.faixa_origem_id);
      const fb = programaFightFaixaPorId(b.faixa_origem_id);
      return Number(fa?.ordem || 0) - Number(fb?.ordem || 0) || Number(a.ordem || 0) - Number(b.ordem || 0) || String(a.nome).localeCompare(String(b.nome), 'pt-BR');
    });

    selectCategoria.innerHTML = `<option value="">Selecione uma categoria</option>${categorias.map(c => `<option value="${c.id}">${programaFightEscape(programaFightLabelCategoria(c))}</option>`).join('')}`;
    if (valor && [...selectCategoria.options].some(opt => opt.value === valor)) selectCategoria.value = valor;
  }
}

function atualizarResumoProgramaFight() {
  const totalFaixas = document.getElementById('programaFightTotalFaixas');
  const totalCategorias = document.getElementById('programaFightTotalCategorias');
  const totalTecnicas = document.getElementById('programaFightTotalTecnicas');

  if (totalFaixas) totalFaixas.textContent = programaFightFaixas.filter(f => f.ativa !== false).length;
  if (totalCategorias) totalCategorias.textContent = programaFightCategorias.filter(c => c.ativo !== false).length;
  if (totalTecnicas) totalTecnicas.textContent = programaFightTecnicas.filter(t => t.ativo !== false).length;
}

async function carregarProgramaGraduacao() {
  const lista = document.getElementById('listaProgramaGraduacao');
  if (!usuarioAtual || !lista) return;

  if (!programaFightAtivo()) {
    aplicarModuloFightInterface();
    return;
  }

  if (programaFightCarregando) return;
  programaFightCarregando = true;
  lista.innerHTML = `<div class="empty-state-mini">Carregando programa de graduação...</div>`;

  try {
    const [resFaixas, resCategorias, resTecnicas] = await Promise.all([
      supabaseClient
        .from('faixas')
        .select('id,user_id,nome,ordem,cor,ativa')
        .order('ordem', { ascending: true }),

      supabaseClient
        .from('categorias_graduacao')
        .select('id,user_id,faixa_origem_id,faixa_destino_id,nome,ordem,ativo,created_at')
        .eq('user_id', usuarioAtual.id)
        .order('ordem', { ascending: true }),

      supabaseClient
        .from('tecnicas_graduacao')
        .select('id,user_id,categoria_id,titulo,descricao,video_url,ordem,ativo,created_at')
        .eq('user_id', usuarioAtual.id)
        .order('ordem', { ascending: true })
    ]);

    if (resFaixas.error || resCategorias.error || resTecnicas.error) {
      console.log('Erro Programa Fight:', resFaixas.error || resCategorias.error || resTecnicas.error);
      lista.innerHTML = `<div class="empty-state-mini">Erro ao carregar o programa de graduação.</div>`;
      return;
    }

    programaFightFaixas = resFaixas.data || [];
    programaFightCategorias = resCategorias.data || [];
    programaFightTecnicas = resTecnicas.data || [];

    preencherSelectsProgramaFight();
    atualizarResumoProgramaFight();
    renderizarProgramaGraduacao();
  } finally {
    programaFightCarregando = false;
  }
}

function renderizarProgramaGraduacao() {
  const lista = document.getElementById('listaProgramaGraduacao');
  if (!lista) return;

  const filtroFaixa = document.getElementById('programaFightFiltroFaixa')?.value || 'todos';
  let categorias = [...programaFightCategorias];

  if (filtroFaixa !== 'todos') {
    categorias = categorias.filter(c => String(c.faixa_origem_id) === String(filtroFaixa));
  }

  categorias.sort((a, b) => {
    const fa = programaFightFaixaPorId(a.faixa_origem_id);
    const fb = programaFightFaixaPorId(b.faixa_origem_id);
    return Number(fa?.ordem || 0) - Number(fb?.ordem || 0) || Number(a.ordem || 0) - Number(b.ordem || 0) || String(a.nome).localeCompare(String(b.nome), 'pt-BR');
  });

  if (!categorias.length) {
    lista.innerHTML = `<div class="empty-state-mini">Nenhuma categoria cadastrada ainda. Comece criando uma categoria para uma faixa.</div>`;
    return;
  }

  const totalTecnicasLista = categorias.reduce((total, categoria) => {
    return total + programaFightTecnicas.filter(t => String(t.categoria_id) === String(categoria.id)).length;
  }, 0);

  lista.innerHTML = `
    <div class="programa-fight-toolbar">
      <div>
        <strong>${categorias.length} categoria${categorias.length === 1 ? '' : 's'}</strong>
        <span>${totalTecnicasLista} técnica${totalTecnicasLista === 1 ? '' : 's'} cadastrada${totalTecnicasLista === 1 ? '' : 's'}</span>
      </div>
      <div class="programa-fight-toolbar-actions">
        <button type="button" class="acao-secundaria" onclick="abrirTodasCategoriasProgramaFight()">Abrir todas</button>
        <button type="button" class="acao-secundaria" onclick="fecharTodasCategoriasProgramaFight()">Fechar todas</button>
      </div>
    </div>
  ` + categorias.map(categoria => {
    const origem = programaFightFaixaPorId(categoria.faixa_origem_id);
    const destino = programaFightFaixaPorId(categoria.faixa_destino_id);
    const tecnicas = programaFightTecnicas
      .filter(t => String(t.categoria_id) === String(categoria.id))
      .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0) || String(a.titulo).localeCompare(String(b.titulo), 'pt-BR'));
    const categoriaAberta = programaFightCategoriasAbertas.has(String(categoria.id));
    const transicao = `${programaFightEscape(origem?.nome || 'Faixa')}${destino ? ` → ${programaFightEscape(destino.nome)}` : ''}`;

    return `
      <article class="programa-fight-card programa-fight-accordion ${categoriaAberta ? 'aberta' : ''} ${categoria.ativo === false ? 'inativo' : ''}">
        <div class="programa-fight-card-head programa-fight-accordion-head">
          <button type="button" class="programa-fight-toggle" onclick="alternarProgramaFightCategoria('${categoria.id}')" aria-expanded="${categoriaAberta ? 'true' : 'false'}">
            <span class="programa-fight-toggle-icon">${categoriaAberta ? '▾' : '▸'}</span>
            <span class="programa-fight-toggle-text">
              <span class="programa-fight-faixa">${transicao}</span>
              <strong>${programaFightEscape(categoria.nome)}</strong>
              <small>Ordem ${Number(categoria.ordem || 0)} • ${tecnicas.length} técnica${tecnicas.length === 1 ? '' : 's'}${categoria.ativo === false ? ' • categoria inativa' : ''}</small>
            </span>
          </button>
          <div class="programa-fight-actions">
            <button type="button" class="acao-secundaria" onclick="editarCategoriaGraduacao('${categoria.id}')">Editar</button>
            <button type="button" class="acao-secundaria" onclick="alternarCategoriaGraduacao('${categoria.id}')">${categoria.ativo === false ? 'Ativar' : 'Desativar'}</button>
          </div>
        </div>

        <div class="programa-fight-tecnicas ${categoriaAberta ? '' : 'escondido'}">
          ${tecnicas.length ? tecnicas.map(t => `
            <div class="programa-fight-tecnica ${t.ativo === false ? 'inativa' : ''}">
              <div>
                <strong>${programaFightEscape(t.titulo)}</strong>
                ${t.descricao ? `<p>${programaFightEscape(t.descricao)}</p>` : `<p>Sem descrição cadastrada.</p>`}
                <span>Ordem ${Number(t.ordem || 0)}${t.ativo === false ? ' • inativa' : ''}</span>
              </div>
              <div class="programa-fight-tecnica-actions">
                ${t.video_url ? `<a href="${programaFightEscape(t.video_url)}" target="_blank" rel="noopener" class="programa-fight-video">Vídeo</a>` : ''}
                <button type="button" class="acao-secundaria" onclick="editarTecnicaGraduacao('${t.id}')">Editar</button>
                <button type="button" class="acao-secundaria" onclick="alternarTecnicaGraduacao('${t.id}')">${t.ativo === false ? 'Ativar' : 'Desativar'}</button>
              </div>
            </div>
          `).join('') : `<div class="empty-state-mini">Nenhuma técnica cadastrada nesta categoria.</div>`}
        </div>
      </article>
    `;
  }).join('');
}

async function salvarCategoriaGraduacao(event) {
  event.preventDefault();
  if (!usuarioAtual) return;

  const msg = document.getElementById('msgCategoriaGraduacao');
  const faixaOrigem = document.getElementById('categoriaFaixaOrigem')?.value || '';
  const faixaDestino = document.getElementById('categoriaFaixaDestino')?.value || null;
  const nome = document.getElementById('categoriaGraduacaoNome')?.value.trim() || '';
  const ordem = Number(document.getElementById('categoriaGraduacaoOrdem')?.value || 0);

  if (!faixaOrigem || !nome) {
    if (msg) msg.textContent = 'Escolha a faixa atual e informe o nome da categoria.';
    return;
  }

  if (msg) msg.textContent = 'Salvando categoria...';

  const { error } = await supabaseClient.from('categorias_graduacao').insert({
    user_id: usuarioAtual.id,
    faixa_origem_id: faixaOrigem,
    faixa_destino_id: faixaDestino || null,
    nome,
    ordem: Number.isFinite(ordem) ? ordem : 0,
    ativo: true
  });

  if (error) {
    console.log(error);
    if (msg) msg.textContent = 'Erro ao salvar categoria.';
    return;
  }

  event.target.reset();
  if (msg) msg.textContent = 'Categoria salva com sucesso.';
  await carregarProgramaGraduacao();
}

async function salvarTecnicaGraduacao(event) {
  event.preventDefault();
  if (!usuarioAtual) return;

  const msg = document.getElementById('msgTecnicaGraduacao');
  const categoriaId = document.getElementById('tecnicaGraduacaoCategoria')?.value || '';
  const titulo = document.getElementById('tecnicaGraduacaoTitulo')?.value.trim() || '';
  const descricao = document.getElementById('tecnicaGraduacaoDescricao')?.value.trim() || null;
  const videoUrl = document.getElementById('tecnicaGraduacaoVideo')?.value.trim() || null;
  const ordem = Number(document.getElementById('tecnicaGraduacaoOrdem')?.value || 0);

  if (!categoriaId || !titulo) {
    if (msg) msg.textContent = 'Escolha a categoria e informe o título da técnica.';
    return;
  }

  if (msg) msg.textContent = 'Salvando técnica...';

  const { error } = await supabaseClient.from('tecnicas_graduacao').insert({
    user_id: usuarioAtual.id,
    categoria_id: categoriaId,
    titulo,
    descricao,
    video_url: videoUrl,
    ordem: Number.isFinite(ordem) ? ordem : 0,
    ativo: true
  });

  if (error) {
    console.log(error);
    if (msg) msg.textContent = 'Erro ao salvar técnica.';
    return;
  }

  event.target.reset();
  if (msg) msg.textContent = 'Técnica salva com sucesso.';
  await carregarProgramaGraduacao();
}

async function editarCategoriaGraduacao(categoriaId) {
  const categoria = programaFightCategoriaPorId(categoriaId);
  if (!categoria) return;

  const novoNome = prompt('Nome da categoria:', categoria.nome);
  if (novoNome === null) return;
  const novaOrdem = prompt('Ordem da categoria:', String(categoria.ordem || 0));
  if (novaOrdem === null) return;

  const { error } = await supabaseClient
    .from('categorias_graduacao')
    .update({ nome: novoNome.trim(), ordem: Number(novaOrdem || 0) })
    .eq('id', categoriaId)
    .eq('user_id', usuarioAtual.id);

  if (error) {
    console.log(error);
    mostrarToast('Erro ao editar categoria.', 'erro');
    return;
  }

  mostrarToast('Categoria atualizada.');
  await carregarProgramaGraduacao();
}

async function alternarCategoriaGraduacao(categoriaId) {
  const categoria = programaFightCategoriaPorId(categoriaId);
  if (!categoria) return;

  const { error } = await supabaseClient
    .from('categorias_graduacao')
    .update({ ativo: categoria.ativo === false })
    .eq('id', categoriaId)
    .eq('user_id', usuarioAtual.id);

  if (error) {
    console.log(error);
    mostrarToast('Erro ao alterar categoria.', 'erro');
    return;
  }

  await carregarProgramaGraduacao();
}

function garantirModalEdicaoCategoriaProgramaFight() {
  let modal = document.getElementById('modalEditarCategoriaProgramaFight');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'modalEditarCategoriaProgramaFight';
  modal.className = 'programa-fight-edit-modal escondido';
  modal.innerHTML = `
    <div class="programa-fight-edit-backdrop" data-fechar-modal-categoria="true"></div>

    <div class="programa-fight-edit-card">
      <div class="programa-fight-edit-topo">
        <div>
          <span class="page-eyebrow">Editar categoria</span>
          <h3>Ajustar categoria do programa</h3>
          <p>Edite nome, ordem e transição de faixa sem abrir alerta feio do navegador.</p>
        </div>

        <button type="button" class="btn-fechar" id="btnFecharModalCategoriaFight" aria-label="Fechar edição">×</button>
      </div>

      <form id="formEditarCategoriaProgramaFight" class="programa-fight-edit-form">
        <label class="campo-perfil">
          <span>Faixa atual</span>
          <select id="editarCategoriaFaixaOrigem">
            <option value="">Selecione</option>
          </select>
        </label>

        <label class="campo-perfil">
          <span>Próxima faixa</span>
          <select id="editarCategoriaFaixaDestino">
            <option value="">Opcional</option>
          </select>
        </label>

        <label class="campo-perfil campo-cheio">
          <span>Nome da categoria</span>
          <input type="text" id="editarCategoriaNome" placeholder="Ex: Quedas, Defesas, Raspagens">
        </label>

        <label class="campo-perfil">
          <span>Ordem</span>
          <input type="number" id="editarCategoriaOrdem" min="0" value="0">
        </label>

        <div class="programa-fight-edit-actions">
          <button type="button" class="acao-secundaria" id="btnCancelarEdicaoCategoriaFight">Cancelar</button>
          <button type="submit" class="acao-principal">Salvar alterações</button>
        </div>

        <p id="msgEditarCategoriaFight" class="msg-perfil"></p>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const fechar = () => fecharModalEdicaoCategoriaProgramaFight();

  modal.querySelector('#btnFecharModalCategoriaFight')?.addEventListener('click', fechar);
  modal.querySelector('#btnCancelarEdicaoCategoriaFight')?.addEventListener('click', fechar);

  modal.querySelector('[data-fechar-modal-categoria="true"]')?.addEventListener('click', fechar);

  modal.querySelector('#formEditarCategoriaProgramaFight')?.addEventListener('submit', salvarEdicaoCategoriaProgramaFight);

  return modal;
}

function fecharModalEdicaoCategoriaProgramaFight() {
  const modal = document.getElementById('modalEditarCategoriaProgramaFight');
  if (!modal) return;

  modal.classList.add('escondido');
  modal.dataset.categoriaId = '';

  const msg = document.getElementById('msgEditarCategoriaFight');
  if (msg) msg.textContent = '';
}

function preencherSelectsEdicaoCategoriaProgramaFight(categoria) {
  const origem = document.getElementById('editarCategoriaFaixaOrigem');
  const destino = document.getElementById('editarCategoriaFaixaDestino');

  const faixas = programaFightOrdenarFaixas(programaFightFaixas).filter(faixa => faixa.ativa !== false);
  const opcoes = faixas.map(faixa => `
    <option value="${faixa.id}">
      ${programaFightEscape(faixa.nome)}${faixa.user_id ? ' • personalizada' : ''}
    </option>
  `).join('');

  if (origem) {
    origem.innerHTML = `<option value="">Selecione</option>${opcoes}`;
    origem.value = categoria.faixa_origem_id || '';
  }

  if (destino) {
    destino.innerHTML = `<option value="">Opcional</option>${opcoes}`;
    destino.value = categoria.faixa_destino_id || '';
  }
}

function editarCategoriaGraduacao(categoriaId) {
  const categoria = programaFightCategoriaPorId(categoriaId);
  if (!categoria) return;

  const modal = garantirModalEdicaoCategoriaProgramaFight();

  modal.dataset.categoriaId = String(categoria.id);
  modal.classList.remove('escondido');

  preencherSelectsEdicaoCategoriaProgramaFight(categoria);

  const nome = document.getElementById('editarCategoriaNome');
  const ordem = document.getElementById('editarCategoriaOrdem');
  const msg = document.getElementById('msgEditarCategoriaFight');

  if (nome) nome.value = categoria.nome || '';
  if (ordem) ordem.value = Number(categoria.ordem || 0);
  if (msg) msg.textContent = '';

  setTimeout(() => {
    if (nome) nome.focus();
  }, 80);
}

async function salvarEdicaoCategoriaProgramaFight(event) {
  event.preventDefault();

  if (!usuarioAtual) return;

  const modal = document.getElementById('modalEditarCategoriaProgramaFight');
  const categoriaId = modal?.dataset.categoriaId || '';
  const categoria = programaFightCategoriaPorId(categoriaId);

  if (!modal || !categoria) return;

  const msg = document.getElementById('msgEditarCategoriaFight');
  const faixaOrigem = document.getElementById('editarCategoriaFaixaOrigem')?.value || '';
  const faixaDestino = document.getElementById('editarCategoriaFaixaDestino')?.value || null;
  const nome = document.getElementById('editarCategoriaNome')?.value.trim() || '';
  const ordem = Number(document.getElementById('editarCategoriaOrdem')?.value || 0);

  if (!faixaOrigem || !nome) {
    if (msg) msg.textContent = 'Informe a faixa atual e o nome da categoria.';
    return;
  }

  if (msg) msg.textContent = 'Salvando alterações...';

  const { error } = await supabaseClient
    .from('categorias_graduacao')
    .update({
      faixa_origem_id: faixaOrigem,
      faixa_destino_id: faixaDestino || null,
      nome,
      ordem: Number.isFinite(ordem) ? ordem : 0
    })
    .eq('id', categoriaId)
    .eq('user_id', usuarioAtual.id);

  if (error) {
    console.log(error);
    if (msg) msg.textContent = 'Erro ao editar categoria.';
    mostrarToast('Erro ao editar categoria.', 'erro');
    return;
  }

  fecharModalEdicaoCategoriaProgramaFight();
  mostrarToast('Categoria atualizada.');
  await carregarProgramaGraduacao();
}

function inicializarProgramaFight() {
  aplicarModuloFightInterface();

  const formCategoria = document.getElementById('formCategoriaGraduacao');
  if (formCategoria && !formCategoria.dataset.inicializado) {
    formCategoria.dataset.inicializado = 'true';
    formCategoria.addEventListener('submit', salvarCategoriaGraduacao);
  }

  const formTecnica = document.getElementById('formTecnicaGraduacao');
  if (formTecnica && !formTecnica.dataset.inicializado) {
    formTecnica.dataset.inicializado = 'true';
    formTecnica.addEventListener('submit', salvarTecnicaGraduacao);
  }

  const btnAtualizar = document.getElementById('btnAtualizarProgramaFight');
  if (btnAtualizar && !btnAtualizar.dataset.inicializado) {
    btnAtualizar.dataset.inicializado = 'true';
    btnAtualizar.addEventListener('click', carregarProgramaGraduacao);
  }

  const btnAbrirCategoria = document.getElementById('btnAbrirFormCategoria');
  if (btnAbrirCategoria && !btnAbrirCategoria.dataset.inicializado) {
    btnAbrirCategoria.dataset.inicializado = 'true';
    btnAbrirCategoria.addEventListener('click', () => abrirCriacaoProgramaFight('categoria'));
  }

  const btnAbrirTecnica = document.getElementById('btnAbrirFormTecnica');
  if (btnAbrirTecnica && !btnAbrirTecnica.dataset.inicializado) {
    btnAbrirTecnica.dataset.inicializado = 'true';
    btnAbrirTecnica.addEventListener('click', () => abrirCriacaoProgramaFight('tecnica'));
  }

  const btnFecharCriacao = document.getElementById('btnFecharCriacaoProgramaFight');
  if (btnFecharCriacao && !btnFecharCriacao.dataset.inicializado) {
    btnFecharCriacao.dataset.inicializado = 'true';
    btnFecharCriacao.addEventListener('click', fecharCriacaoProgramaFight);
  }

  const filtro = document.getElementById('programaFightFiltroFaixa');
  if (filtro && !filtro.dataset.inicializado) {
    filtro.dataset.inicializado = 'true';
    filtro.addEventListener('change', renderizarProgramaGraduacao);
  }

  const btnNav = document.getElementById('btnNavProgramaFight');
  if (btnNav && !btnNav.dataset.programaFightInicializado) {
    btnNav.dataset.programaFightInicializado = 'true';
    btnNav.addEventListener('click', () => setTimeout(carregarProgramaGraduacao, 0));
  }

  document.querySelectorAll('[data-view-target="programaFight"]').forEach(botao => {
    if (botao.dataset.programaFightInicializado) return;
    botao.dataset.programaFightInicializado = 'true';
    botao.addEventListener('click', () => setTimeout(carregarProgramaGraduacao, 0));
  });
}
