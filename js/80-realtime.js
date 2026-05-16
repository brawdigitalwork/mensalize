// ===============================
// 80. REALTIME — ATUALIZAÇÃO AUTOMÁTICA
// ===============================
let canalRealtimeMensalize = null;

function iniciarRealtimeMensalize() {
  if (!usuarioAtual || !supabaseClient || canalRealtimeMensalize) return;

  canalRealtimeMensalize = supabaseClient
    .channel(`mensalize-${usuarioAtual.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'alunos' }, () => {
      if (typeof carregarAlunos === 'function') carregarAlunos();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pagamentos' }, () => {
      if (typeof carregarAlunos === 'function') carregarAlunos();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes_alteracao' }, () => {
      if (typeof carregarSolicitacoesAlteracao === 'function') carregarSolicitacoesAlteracao();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'turmas' }, async () => {
      if (typeof carregarTurmasSistema === 'function') await carregarTurmasSistema();
      if (typeof carregarAlunos === 'function') carregarAlunos();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'aulas_canceladas' }, async () => {
      if (typeof carregarTurmasSistema === 'function') await carregarTurmasSistema();
      if (typeof carregarDadosFrequencia === 'function') await carregarDadosFrequencia();
      if (typeof renderizarEvolucao === 'function') renderizarEvolucao();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'presencas' }, async () => {
      if (typeof carregarDadosFrequencia === 'function') await carregarDadosFrequencia();
      if (typeof renderizarEvolucao === 'function') renderizarEvolucao();
    })
    .subscribe(status => console.info('[Mensalize realtime]', status));
}

function pararRealtimeMensalize() {
  if (canalRealtimeMensalize && supabaseClient) {
    supabaseClient.removeChannel(canalRealtimeMensalize);
    canalRealtimeMensalize = null;
  }
}
