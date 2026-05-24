// ===============================
// 80. REALTIME — ATUALIZAÇÃO AUTOMÁTICA
// ===============================
let canalRealtimeMensalize = null;
let realtimeTimerMensalize = null;
let realtimeExecutandoMensalize = false;
let realtimeFilaMensalize = {
  alunos: false,
  solicitacoes: false,
  turmas: false,
  frequencia: false
};

function montarFiltroRealtimeUsuario() {
  if (!usuarioAtual || usuarioEhAdmin) return null;
  return `user_id=eq.${usuarioAtual.id}`;
}

function configRealtimeTabela(tabela) {
  const config = { event: '*', schema: 'public', table: tabela };
  const filtro = montarFiltroRealtimeUsuario();
  if (filtro) config.filter = filtro;
  return config;
}

function agendarAtualizacaoRealtime(tipo = 'alunos') {
  if (tipo === 'solicitacoes') {
    realtimeFilaMensalize.solicitacoes = true;
  } else if (tipo === 'turmas') {
    realtimeFilaMensalize.turmas = true;
    realtimeFilaMensalize.frequencia = true;
  } else if (tipo === 'frequencia') {
    realtimeFilaMensalize.frequencia = true;
  } else {
    realtimeFilaMensalize.alunos = true;
  }

  clearTimeout(realtimeTimerMensalize);
  realtimeTimerMensalize = setTimeout(processarFilaRealtimeMensalize, 900);
}

async function processarFilaRealtimeMensalize() {
  if (realtimeExecutandoMensalize) {
    clearTimeout(realtimeTimerMensalize);
    realtimeTimerMensalize = setTimeout(processarFilaRealtimeMensalize, 1200);
    return;
  }

  const fila = { ...realtimeFilaMensalize };
  realtimeFilaMensalize = {
    alunos: false,
    solicitacoes: false,
    turmas: false,
    frequencia: false
  };

  realtimeExecutandoMensalize = true;

  try {
    // Alunos/pagamentos são o fluxo mais completo: recarrega lista, painel, turmas,
    // frequência, aniversários, banners e rankings. Por isso ele substitui chamadas menores.
    if (fila.alunos) {
      if (typeof carregarAlunos === 'function') {
        await carregarAlunos();
      }
    } else {
      if (fila.turmas && typeof carregarTurmasSistema === 'function') {
        await carregarTurmasSistema();
      }

      if (fila.frequencia && typeof carregarDadosFrequencia === 'function') {
        await carregarDadosFrequencia();
      }

      if ((fila.turmas || fila.frequencia) && typeof renderizarEvolucao === 'function') {
        renderizarEvolucao();
      }

      if ((fila.turmas || fila.frequencia) && typeof carregarRankingDashboard === 'function') {
        await carregarRankingDashboard();
      }

      if ((fila.turmas || fila.frequencia) && typeof renderizarDesafioPresencaProfessor === 'function') {
        renderizarDesafioPresencaProfessor();
      }
    }

    if (fila.solicitacoes && typeof carregarSolicitacoesAlteracao === 'function') {
      await carregarSolicitacoesAlteracao();
    }
  } catch (erro) {
    console.error('[Mensalize realtime] Erro ao processar atualização:', erro);
  } finally {
    realtimeExecutandoMensalize = false;

    const aindaTemFila = Object.values(realtimeFilaMensalize).some(Boolean);
    if (aindaTemFila) {
      clearTimeout(realtimeTimerMensalize);
      realtimeTimerMensalize = setTimeout(processarFilaRealtimeMensalize, 900);
    }
  }
}

function iniciarRealtimeMensalize() {
  if (!usuarioAtual || !supabaseClient || canalRealtimeMensalize) return;

  canalRealtimeMensalize = supabaseClient
    .channel(`mensalize-${usuarioAtual.id}`)
    .on('postgres_changes', configRealtimeTabela('alunos'), () => {
      agendarAtualizacaoRealtime('alunos');
    })
    .on('postgres_changes', configRealtimeTabela('pagamentos'), () => {
      agendarAtualizacaoRealtime('alunos');
    })
    .on('postgres_changes', configRealtimeTabela('solicitacoes_alteracao'), () => {
      agendarAtualizacaoRealtime('solicitacoes');
    })
    .on('postgres_changes', configRealtimeTabela('turmas'), () => {
      agendarAtualizacaoRealtime('turmas');
    })
    .on('postgres_changes', configRealtimeTabela('aulas_canceladas'), () => {
      agendarAtualizacaoRealtime('frequencia');
    })
    .on('postgres_changes', configRealtimeTabela('presencas'), () => {
      agendarAtualizacaoRealtime('frequencia');
    })
    .subscribe(status => console.info('[Mensalize realtime]', status));
}

function pararRealtimeMensalize() {
  clearTimeout(realtimeTimerMensalize);
  realtimeTimerMensalize = null;
  realtimeExecutandoMensalize = false;
  realtimeFilaMensalize = {
    alunos: false,
    solicitacoes: false,
    turmas: false,
    frequencia: false
  };

  if (canalRealtimeMensalize && supabaseClient) {
    supabaseClient.removeChannel(canalRealtimeMensalize);
    canalRealtimeMensalize = null;
  }
}
