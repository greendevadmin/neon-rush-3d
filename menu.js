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
      const currentTrack = params.get('track') || 'coast';
      const nextUrl = new URL(location.href);
      nextUrl.searchParams.set('track', chosen);
      nextUrl.searchParams.set('start', '1');
      nextUrl.searchParams.delete('mode');

      // Always start through a clean page load. The game module reads
      // ?track=...&start=1 before building the 3D scene, so this avoids a
      // race between menu.js and game.js event handlers on the same track.
      location.href = nextUrl.href;
    });
  });


  // Gamepad navigation for the menus (USB/Bluetooth controllers).
  // D-pad or left stick moves focus; A / Cross confirms; B / Circle goes back.
  const focusStyle = document.createElement('style');
  focusStyle.textContent = `
     .menu-screen button:focus-visible, .menu-screen button.gamepad-focused,
    #finish-overlay button:focus-visible, #finish-overlay button.gamepad-focused {
      outline: 3px solid #19d9ff !important;
      outline-offset: 4px;
      box-shadow: 0 0 22px rgba(25,217,255,.65) !important;
      filter: brightness(1.18);
    }`;
  document.head.appendChild(focusStyle);

  let previousPadButtons = [];
  let navCooldown = 0;
  let gamepadWasConnected = false;

  function visibleMenuButtons() {
    const finish = byId('finish-overlay');
    const screen = finish?.classList.contains('visible')
      ? finish
      : document.querySelector('.menu-screen:not(.hidden)');
    if (!screen) return [];
    return [...screen.querySelectorAll('button:not(:disabled), input:not(:disabled)')]
      .filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      });
  }

  function focusMenuItem(direction) {
    const items = visibleMenuButtons();
    if (!items.length) return;
    let current = items.indexOf(document.activeElement);
    if (current < 0) current = 0;
    else current = (current + direction + items.length) % items.length;
    document.querySelectorAll('.gamepad-focused').forEach(el => el.classList.remove('gamepad-focused'));
    items[current].focus({ preventScroll: false });
    items[current].classList.add('gamepad-focused');
    items[current].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function backFromMenu() {
    const screen = document.querySelector('.menu-screen:not(.hidden)');
    if (!screen) return;
    const back = screen.querySelector('#close-settings, #back-to-modes, #classic-back-to-menu, #back-to-menu, #finish-menu-button');
    if (back) back.click();
  }

  function gamepadLoop() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = [...pads].find(p => p && p.connected);
    if (pad) {
      if (!gamepadWasConnected) {
        gamepadWasConnected = true;
        const status = byId('controller-status');
        if (status) status.textContent = 'Controle conectado · menu: direcional + A para confirmar · B para voltar';
        if (document.querySelector('.menu-screen:not(.hidden)') || byId('finish-overlay')?.classList.contains('visible')) {
          const first = visibleMenuButtons()[0];
          if (first) first.focus();
        }
      }

      const pressed = i => !!pad.buttons[i]?.pressed;
      const left = pressed(14) || (pad.axes[0] ?? 0) < -0.55;
      const right = pressed(15) || (pad.axes[0] ?? 0) > 0.55;
      const up = pressed(12) || (pad.axes[1] ?? 0) < -0.55;
      const down = pressed(13) || (pad.axes[1] ?? 0) > 0.55;
      if (navCooldown > 0) navCooldown--;
      if (navCooldown === 0 && (up || left || down || right)) {
        focusMenuItem((up || left) ? -1 : 1);
        navCooldown = 12;
      }

      const aPressed = pressed(0) || pressed(9);
      const bPressed = pressed(1) || pressed(8);
      if (aPressed && !previousPadButtons[0]) {
        const active = document.activeElement;
        if (active && typeof active.click === 'function') active.click();
        else visibleMenuButtons()[0]?.click();
      }
      if (bPressed && !previousPadButtons[1]) backFromMenu();
      previousPadButtons[0] = aPressed;
      previousPadButtons[1] = bPressed;
    } else {
      if (gamepadWasConnected) {
        gamepadWasConnected = false;
        const status = byId('controller-status');
        if (status) status.textContent = 'Controle desconectado · conecte e pressione um botão';
      }
      previousPadButtons = [];
    }
    requestAnimationFrame(gamepadLoop);
  }
  window.addEventListener('gamepadconnected', () => { gamepadWasConnected = false; });
  window.addEventListener('gamepaddisconnected', () => { gamepadWasConnected = false; });
  requestAnimationFrame(gamepadLoop);

})();
