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
  const ativo = programaFightAtivo();
  document.querySelectorAll('.modulo-fight').forEach(el => {
    const ehItemMenu = el.classList.contains('menu-item');

    if (ehItemMenu) {
      el.classList.remove('escondido');
      el.classList.toggle('modulo-bloqueado', !ativo);
      return;
    }

    el.classList.toggle('escondido', !ativo);
    el.classList.remove('modulo-bloqueado');
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

function programaFightUrlSegura(valor) {
  const urlInformada = String(valor || '').trim();
  if (!urlInformada) return '';

  try {
    const url = new URL(urlInformada);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch (_) {
    return '';
  }
}

function programaFightFaixaPorId(id) {
  return programaFightFaixas.find(f => String(f.id) === String(id)) || null;
}

function programaFightCategoriaPorId(id) {
  return programaFightCategorias.find(c => String(c.id) === String(id)) || null;
}

function programaFightTecnicaPorId(id) {
  return programaFightTecnicas.find(t => String(t.id) === String(id)) || null;
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
        <button type="button" class="acao-secundaria" data-programa-fight-action="abrir-todas">Abrir todas</button>
        <button type="button" class="acao-secundaria" data-programa-fight-action="fechar-todas">Fechar todas</button>
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
          <button type="button" class="programa-fight-toggle" data-programa-fight-action="alternar-categoria" data-categoria-id="${programaFightEscape(categoria.id)}" aria-expanded="${categoriaAberta ? 'true' : 'false'}">
            <span class="programa-fight-toggle-icon" aria-hidden="true">›</span>
            <span class="programa-fight-toggle-text">
              <span class="programa-fight-faixa">${transicao}</span>
              <strong>${programaFightEscape(categoria.nome)}</strong>
              <small>${tecnicas.length} técnica${tecnicas.length === 1 ? '' : 's'}${categoria.ativo === false ? ' • categoria inativa' : ''}</small>
            </span>
          </button>
          <div class="programa-fight-actions">
            <button type="button" class="acao-secundaria" data-programa-fight-action="editar-categoria" data-categoria-id="${programaFightEscape(categoria.id)}">Editar</button>
            <button type="button" class="acao-secundaria" data-programa-fight-action="alternar-status-categoria" data-categoria-id="${programaFightEscape(categoria.id)}">${categoria.ativo === false ? 'Ativar' : 'Desativar'}</button>
          </div>
        </div>

        <div class="programa-fight-tecnicas ${categoriaAberta ? '' : 'escondido'}">
          ${tecnicas.length ? tecnicas.map(t => {
            const videoSeguro = programaFightUrlSegura(t.video_url);
            return `
            <div class="programa-fight-tecnica ${t.ativo === false ? 'inativa' : ''}">
              <div class="programa-fight-tecnica-copy">
                <strong>${programaFightEscape(t.titulo)}</strong>
                ${t.descricao ? `<p>${programaFightEscape(t.descricao)}</p>` : ''}
                ${t.ativo === false ? '<span class="programa-fight-status">Técnica inativa</span>' : ''}
              </div>
              <div class="programa-fight-tecnica-actions">
                ${videoSeguro ? `<a href="${programaFightEscape(videoSeguro)}" target="_blank" rel="noopener noreferrer" class="programa-fight-video">Ver vídeo</a>` : ''}
                <button type="button" class="acao-secundaria" data-programa-fight-action="editar-tecnica" data-tecnica-id="${programaFightEscape(t.id)}">Editar</button>
                <button type="button" class="acao-secundaria" data-programa-fight-action="alternar-status-tecnica" data-tecnica-id="${programaFightEscape(t.id)}">${t.ativo === false ? 'Ativar' : 'Desativar'}</button>
              </div>
            </div>
          `;
          }).join('') : `<div class="empty-state-mini">Esta categoria ainda não possui técnicas.</div>`}
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

  if (videoUrl && !programaFightUrlSegura(videoUrl)) {
    if (msg) msg.textContent = 'Informe um link de vídeo válido, começando com http:// ou https://.';
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

    <div class="programa-fight-edit-card" role="dialog" aria-modal="true" aria-labelledby="tituloEditarCategoriaFight">
      <div class="programa-fight-edit-topo">
        <div>
          <span class="page-eyebrow">Editar categoria</span>
          <h3 id="tituloEditarCategoriaFight">Ajustar categoria do programa</h3>
          <p>Ajuste o nome, a faixa e a posição da categoria no programa.</p>
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

async function alternarTecnicaGraduacao(tecnicaId) {
  const tecnica = programaFightTecnicaPorId(tecnicaId);
  if (!tecnica || !usuarioAtual) return;

  const { error } = await supabaseClient
    .from('tecnicas_graduacao')
    .update({ ativo: tecnica.ativo === false })
    .eq('id', tecnicaId)
    .eq('user_id', usuarioAtual.id);

  if (error) {
    console.log(error);
    mostrarToast('Erro ao alterar a técnica.', 'erro');
    return;
  }

  await carregarProgramaGraduacao();
}

function garantirModalEdicaoTecnicaProgramaFight() {
  let modal = document.getElementById('modalEditarTecnicaProgramaFight');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'modalEditarTecnicaProgramaFight';
  modal.className = 'programa-fight-edit-modal escondido';
  modal.innerHTML = `
    <div class="programa-fight-edit-backdrop" data-fechar-modal-tecnica="true"></div>

    <div class="programa-fight-edit-card" role="dialog" aria-modal="true" aria-labelledby="tituloEditarTecnicaFight">
      <div class="programa-fight-edit-topo">
        <div>
          <span class="page-eyebrow">Editar técnica</span>
          <h3 id="tituloEditarTecnicaFight">Ajustar conteúdo do programa</h3>
          <p>Atualize a categoria, o conteúdo e o vídeo apresentado ao aluno.</p>
        </div>

        <button type="button" class="btn-fechar" id="btnFecharModalTecnicaFight" aria-label="Fechar edição">×</button>
      </div>

      <form id="formEditarTecnicaProgramaFight" class="programa-fight-edit-form">
        <label class="campo-perfil campo-cheio">
          <span>Categoria</span>
          <select id="editarTecnicaCategoria">
            <option value="">Selecione uma categoria</option>
          </select>
        </label>

        <label class="campo-perfil">
          <span>Título</span>
          <input type="text" id="editarTecnicaTitulo" placeholder="Ex: Raspagem tesoura">
        </label>

        <label class="campo-perfil">
          <span>Ordem</span>
          <input type="number" id="editarTecnicaOrdem" min="0" value="0">
        </label>

        <label class="campo-perfil campo-cheio">
          <span>Descrição</span>
          <textarea id="editarTecnicaDescricao" rows="3" placeholder="Resumo simples para o aluno."></textarea>
        </label>

        <label class="campo-perfil campo-cheio">
          <span>Link do vídeo</span>
          <input type="url" id="editarTecnicaVideo" placeholder="https://youtube.com/...">
        </label>

        <div class="programa-fight-edit-actions">
          <button type="button" class="acao-secundaria" id="btnCancelarEdicaoTecnicaFight">Cancelar</button>
          <button type="submit" class="acao-principal">Salvar alterações</button>
        </div>

        <p id="msgEditarTecnicaFight" class="msg-perfil"></p>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const fechar = () => fecharModalEdicaoTecnicaProgramaFight();
  modal.querySelector('#btnFecharModalTecnicaFight')?.addEventListener('click', fechar);
  modal.querySelector('#btnCancelarEdicaoTecnicaFight')?.addEventListener('click', fechar);
  modal.querySelector('[data-fechar-modal-tecnica="true"]')?.addEventListener('click', fechar);
  modal.querySelector('#formEditarTecnicaProgramaFight')?.addEventListener('submit', salvarEdicaoTecnicaProgramaFight);

  return modal;
}

function fecharModalEdicaoTecnicaProgramaFight() {
  const modal = document.getElementById('modalEditarTecnicaProgramaFight');
  if (!modal) return;

  modal.classList.add('escondido');
  modal.dataset.tecnicaId = '';

  const msg = document.getElementById('msgEditarTecnicaFight');
  if (msg) msg.textContent = '';
}

function preencherSelectEdicaoTecnicaProgramaFight(tecnica) {
  const select = document.getElementById('editarTecnicaCategoria');
  if (!select) return;

  const categorias = [...programaFightCategorias].sort((a, b) => {
    const fa = programaFightFaixaPorId(a.faixa_origem_id);
    const fb = programaFightFaixaPorId(b.faixa_origem_id);
    return Number(fa?.ordem || 0) - Number(fb?.ordem || 0)
      || Number(a.ordem || 0) - Number(b.ordem || 0)
      || String(a.nome).localeCompare(String(b.nome), 'pt-BR');
  });

  select.innerHTML = `<option value="">Selecione uma categoria</option>${categorias.map(categoria => `
    <option value="${programaFightEscape(categoria.id)}">
      ${programaFightEscape(programaFightLabelCategoria(categoria))}${categoria.ativo === false ? ' • inativa' : ''}
    </option>
  `).join('')}`;
  select.value = tecnica.categoria_id || '';
}

function editarTecnicaGraduacao(tecnicaId) {
  const tecnica = programaFightTecnicaPorId(tecnicaId);
  if (!tecnica) return;

  const modal = garantirModalEdicaoTecnicaProgramaFight();
  modal.dataset.tecnicaId = String(tecnica.id);
  modal.classList.remove('escondido');

  preencherSelectEdicaoTecnicaProgramaFight(tecnica);

  const titulo = document.getElementById('editarTecnicaTitulo');
  const descricao = document.getElementById('editarTecnicaDescricao');
  const video = document.getElementById('editarTecnicaVideo');
  const ordem = document.getElementById('editarTecnicaOrdem');
  const msg = document.getElementById('msgEditarTecnicaFight');

  if (titulo) titulo.value = tecnica.titulo || '';
  if (descricao) descricao.value = tecnica.descricao || '';
  if (video) video.value = tecnica.video_url || '';
  if (ordem) ordem.value = Number(tecnica.ordem || 0);
  if (msg) msg.textContent = '';

  setTimeout(() => titulo?.focus(), 80);
}

async function salvarEdicaoTecnicaProgramaFight(event) {
  event.preventDefault();
  if (!usuarioAtual) return;

  const modal = document.getElementById('modalEditarTecnicaProgramaFight');
  const tecnicaId = modal?.dataset.tecnicaId || '';
  const tecnica = programaFightTecnicaPorId(tecnicaId);
  if (!modal || !tecnica) return;

  const msg = document.getElementById('msgEditarTecnicaFight');
  const categoriaId = document.getElementById('editarTecnicaCategoria')?.value || '';
  const titulo = document.getElementById('editarTecnicaTitulo')?.value.trim() || '';
  const descricao = document.getElementById('editarTecnicaDescricao')?.value.trim() || null;
  const videoUrl = document.getElementById('editarTecnicaVideo')?.value.trim() || null;
  const ordem = Number(document.getElementById('editarTecnicaOrdem')?.value || 0);

  if (!categoriaId || !titulo) {
    if (msg) msg.textContent = 'Escolha a categoria e informe o título da técnica.';
    return;
  }

  if (videoUrl && !programaFightUrlSegura(videoUrl)) {
    if (msg) msg.textContent = 'Informe um link de vídeo válido, começando com http:// ou https://.';
    return;
  }

  if (msg) msg.textContent = 'Salvando alterações...';

  const { error } = await supabaseClient
    .from('tecnicas_graduacao')
    .update({
      categoria_id: categoriaId,
      titulo,
      descricao,
      video_url: videoUrl,
      ordem: Number.isFinite(ordem) ? ordem : 0
    })
    .eq('id', tecnicaId)
    .eq('user_id', usuarioAtual.id);

  if (error) {
    console.log(error);
    if (msg) msg.textContent = 'Erro ao editar a técnica.';
    mostrarToast('Erro ao editar a técnica.', 'erro');
    return;
  }

  fecharModalEdicaoTecnicaProgramaFight();
  mostrarToast('Técnica atualizada.');
  await carregarProgramaGraduacao();
}

function executarAcaoProgramaFight(event) {
  const botao = event.target.closest('[data-programa-fight-action]');
  if (!botao) return;

  const acao = botao.dataset.programaFightAction;
  const categoriaId = botao.dataset.categoriaId || '';
  const tecnicaId = botao.dataset.tecnicaId || '';

  if (acao === 'abrir-todas') abrirTodasCategoriasProgramaFight();
  if (acao === 'fechar-todas') fecharTodasCategoriasProgramaFight();
  if (acao === 'alternar-categoria') alternarProgramaFightCategoria(categoriaId);
  if (acao === 'editar-categoria') editarCategoriaGraduacao(categoriaId);
  if (acao === 'alternar-status-categoria') alternarCategoriaGraduacao(categoriaId);
  if (acao === 'editar-tecnica') editarTecnicaGraduacao(tecnicaId);
  if (acao === 'alternar-status-tecnica') alternarTecnicaGraduacao(tecnicaId);
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

  const lista = document.getElementById('listaProgramaGraduacao');
  if (lista && !lista.dataset.inicializado) {
    lista.dataset.inicializado = 'true';
    lista.addEventListener('click', executarAcaoProgramaFight);
  }

  if (!document.documentElement.dataset.programaFightTecladoInicializado) {
    document.documentElement.dataset.programaFightTecladoInicializado = 'true';
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      fecharModalEdicaoCategoriaProgramaFight();
      fecharModalEdicaoTecnicaProgramaFight();
    });
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
