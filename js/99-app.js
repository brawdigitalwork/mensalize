// ===============================
// 99. APP — BOOTSTRAP FINAL
// ===============================
if (typeof inicializarNavegacaoPrincipal === 'function') {
  inicializarNavegacaoPrincipal();
}

if (typeof iniciarSistema === 'function') {
  iniciarSistema().then(() => {
    if (typeof iniciarRealtimeMensalize === 'function') {
      iniciarRealtimeMensalize();
    }
  });
}
