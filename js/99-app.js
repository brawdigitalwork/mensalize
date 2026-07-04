// ===============================
// 99. APP — BOOTSTRAP FINAL
// ===============================
if (typeof inicializarNavegacaoPrincipal === 'function') {
  inicializarNavegacaoPrincipal();
}

if (typeof inicializarProgramaFight === 'function') {
  inicializarProgramaFight();
}

if (typeof inicializarOnboardingProfessor === 'function') {
  inicializarOnboardingProfessor();
}

if (typeof iniciarSistema === 'function') {
  iniciarSistema().then(() => {
    if (typeof iniciarRealtimeMensalize === 'function') {
      iniciarRealtimeMensalize();
    }
  });
}

if (typeof inicializarConfigAbas === 'function') {
  inicializarConfigAbas();
}
