// Menu controls are loaded independently so they remain responsive even
// while the 3D scene is downloading or initializing.
(() => {
  const byId = id => document.getElementById(id);
  const hide = id => byId(id)?.classList.add('hidden');
  const show = id => byId(id)?.classList.remove('hidden');

  byId('play-button')?.addEventListener('click', () => {
    hide('main-menu');
    hide('settings-screen');
    show('mode-screen');
  });
  byId('open-settings')?.addEventListener('click', () => {
    hide('main-menu');
    show('settings-screen');
  });
  byId('close-settings')?.addEventListener('click', () => {
    hide('settings-screen');
    show('main-menu');
  });
  byId('back-to-menu')?.addEventListener('click', () => {
    hide('mode-screen');
    show('main-menu');
  });
  byId('classic-mode-button')?.addEventListener('click', () => {
    hide('mode-screen');
    show('classic-screen');
  });
  byId('back-to-modes')?.addEventListener('click', () => {
    hide('classic-screen');
    show('mode-screen');
  });
  byId('classic-back-to-menu')?.addEventListener('click', () => {
    hide('classic-screen');
    show('main-menu');
  });
  byId('escape-mode-button')?.addEventListener('click', () => {
    location.search = '?mode=escape';
  });
  byId('exit-button')?.addEventListener('click', () => {
    const subtitle = document.querySelector('#main-menu .menu-subtitle');
    if (subtitle) subtitle.textContent = 'Você pode fechar esta aba para sair do jogo.';
  });
  document.querySelectorAll('[data-track]').forEach(button => {
    button.addEventListener('click', () => {
      const chosen = button.dataset.track;
      const params = new URLSearchParams(location.search);
      if (params.get('track') === chosen && params.get('mode') !== 'escape') {
        location.search = '?track=' + encodeURIComponent(chosen) + '&start=1';
      } else {
        location.search = '?track=' + encodeURIComponent(chosen);
      }
    });
  });
})();
