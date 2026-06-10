/* ==========================================================================
   FIGHTUY - UI MANAGER
   Maneja la navegaciÃ³n de pantallas y la sincronizaciÃ³n del HUD e interfaz
   ========================================================================== */

import AudioManager from '../Engine/AudioManager.js';
import { CHARACTER_IDS, getCharacterData } from '../Engine/CharacterData.js';

class UIManager {
  constructor() {
    this.activeScreen = 'screen-main-menu';
    this.selectedChar = null; // 'orsi' o 'lacalle'
    this.selectedOpponent = null;
    this.authMode = 'login';
    
    // Referencias a los elementos del DOM (CachÃ©)
    this.screens = {
      auth: document.getElementById('screen-auth'),
      menu: document.getElementById('screen-main-menu'),
      profile: document.getElementById('screen-profile'),
      ownerPanel: document.getElementById('screen-owner-panel'),
      charSelect: document.getElementById('screen-char-select'),
      story: document.getElementById('screen-story'),
      gameover: document.getElementById('screen-gameover'),
      options: document.getElementById('screen-options'),
      credits: document.getElementById('screen-credits'),
      loading: document.getElementById('screen-loading')
    };

    this.flash = document.getElementById('screen-flash');

    this.hud = document.getElementById('hud');
    this.announcer = document.getElementById('screen-announcer');
    this.announcerText = document.getElementById('announcer-text');

    // Inicializar listeners de las opciones
    this.setupOpcionesUI();
    this.setupHoverSounds();
  }

  updateAccount(userName, isSupabaseEnabled) {
    const accountName = document.getElementById('account-name');
    const devNote = document.getElementById('auth-dev-note');

    if (accountName) {
      accountName.textContent = `Usuario: ${userName}`;
    }

    if (devNote) {
      devNote.style.display = isSupabaseEnabled ? 'none' : 'block';
    }
  }

  setOwnerControlsVisible(isVisible) {
    const ownerBtn = document.getElementById('btn-owner-panel');
    if (ownerBtn) ownerBtn.style.display = isVisible ? 'block' : 'none';
  }

  setProfileMessage(message, type = 'info') {
    const messageEl = document.getElementById('profile-message');
    if (!messageEl) return;

    messageEl.textContent = message;
    messageEl.dataset.type = type;
  }

  renderPlayerProfile(data) {
    const profile = data?.profile || {};
    const freeCharacters = data?.free_characters || [];
    const entitlements = data?.entitlements || [];
    const payments = data?.payments || [];
    const events = data?.recent_events || [];
    const allCharacters = [
      ...freeCharacters.map(characterId => ({ character_id: characterId, source: 'gratis' })),
      ...entitlements
    ];

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    setText('profile-username', profile.username || profile.email || 'Jugador');
    setText('profile-email', profile.email || 'sin email');
    setText('profile-role', profile.role || 'player');
    setText('profile-character-count', allCharacters.length);
    setText('profile-payment-count', payments.length);

    this.renderProfileList('profile-characters-list', allCharacters, (item) => `
      <div class="profile-list-main">${this.escapeHtml(this.getCharacterName(item.character_id))}</div>
      <div class="profile-list-meta">${this.escapeHtml(item.source || 'desbloqueado')} ${item.created_at ? `- ${this.formatDate(item.created_at)}` : ''}</div>
    `);

    this.renderProfileList('profile-payments-list', payments, (payment) => `
      <div class="profile-list-main">${this.escapeHtml(payment.product_id || payment.product_type || 'compra')}</div>
      <div class="profile-list-meta">${this.formatMoney(payment.amount_cents || 0)} - ${this.escapeHtml(payment.status || 'estado')} - ${this.formatDate(payment.created_at)}</div>
    `);

    this.renderProfileList('profile-events-list', events, (event) => `
      <div class="profile-list-main">${this.escapeHtml(event.event_name || 'evento')}</div>
      <div class="profile-list-meta">${this.formatDate(event.created_at)}</div>
    `);
  }

  renderProfileList(containerId, items, renderItem) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!items.length) {
      container.innerHTML = '<div class="profile-empty">Sin datos todavia.</div>';
      return;
    }

    container.innerHTML = items.map(item => `<div class="profile-list-item">${renderItem(item)}</div>`).join('');
  }

  getCharacterName(characterId) {
    return getCharacterData(characterId).name || characterId || 'Personaje';
  }

  setOwnerMessage(message, type = 'info') {
    const messageEl = document.getElementById('owner-message');
    if (!messageEl) return;

    messageEl.textContent = message;
    messageEl.dataset.type = type;
  }

  renderOwnerDashboard(data) {
    const totals = data?.totals || {};
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    setText('owner-total-users', totals.users || 0);
    setText('owner-paying-users', totals.paying_users || 0);
    setText('owner-total-payments', totals.payments || 0);
    setText('owner-total-revenue', this.formatMoney(totals.revenue_cents || 0));
    setText('owner-events-24h', totals.events_24h || 0);

    this.renderOwnerList('owner-users-list', data?.recent_users || [], (user) => `
      <div class="owner-list-main">${this.escapeHtml(user.username || user.email || 'Usuario')}</div>
      <div class="owner-list-meta">${this.escapeHtml(user.email || 'sin email')} - ${this.formatDate(user.created_at)}</div>
    `);

    this.renderOwnerList('owner-events-list', data?.recent_events || [], (event) => `
      <div class="owner-list-main">${this.escapeHtml(event.event_name || 'evento')}</div>
      <div class="owner-list-meta">${this.escapeHtml(event.username || event.email || 'usuario')} - ${this.formatDate(event.created_at)}</div>
    `);

    this.renderOwnerList('owner-purchases-list', data?.purchases_by_character || [], (purchase) => `
      <div class="owner-list-main">${this.escapeHtml(purchase.character_id || 'personaje')}</div>
      <div class="owner-list-meta">${purchase.sales || 0} ventas - ${this.formatMoney(purchase.revenue_cents || 0)}</div>
    `);
  }

  renderOwnerList(containerId, items, renderItem) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!items.length) {
      container.innerHTML = '<div class="owner-empty">Sin datos todavia.</div>';
      return;
    }

    container.innerHTML = items.map(item => `<div class="owner-list-item">${renderItem(item)}</div>`).join('');
  }

  formatMoney(cents) {
    return new Intl.NumberFormat('es-UY', {
      style: 'currency',
      currency: 'USD'
    }).format((cents || 0) / 100);
  }

  formatDate(value) {
    if (!value) return 'sin fecha';

    return new Intl.DateTimeFormat('es-UY', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  }

  escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  setAuthMode(mode) {
    this.authMode = mode;
    const isRegister = mode === 'register';
    const usernameField = document.getElementById('auth-username-field');
    const submitBtn = document.getElementById('btn-auth-submit');
    const loginTab = document.getElementById('btn-auth-login-tab');
    const registerTab = document.getElementById('btn-auth-register-tab');
    const passwordInput = document.getElementById('auth-password');

    if (usernameField) usernameField.style.display = isRegister ? 'flex' : 'none';
    if (submitBtn) submitBtn.textContent = isRegister ? 'REGISTRARSE' : 'ENTRAR';
    if (passwordInput) passwordInput.autocomplete = isRegister ? 'new-password' : 'current-password';
    if (loginTab) loginTab.classList.toggle('active', !isRegister);
    if (registerTab) registerTab.classList.toggle('active', isRegister);
    this.setAuthMessage('');
  }

  setAuthMessage(message, type = 'info') {
    const messageEl = document.getElementById('auth-message');
    if (!messageEl) return;

    messageEl.textContent = message;
    messageEl.dataset.type = type;
  }

  setAuthBusy(isBusy) {
    const submitBtn = document.getElementById('btn-auth-submit');
    if (!submitBtn) return;

    submitBtn.disabled = isBusy;
    submitBtn.textContent = isBusy ? 'CONECTANDO...' : (this.authMode === 'register' ? 'REGISTRARSE' : 'ENTRAR');
  }

  // Cambia la pantalla activa del juego
  showScreen(screenId) {
    // Sonido al cambiar pantalla
    AudioManager.play('whoosh');

    // Desactivar todas las pantallas principales
    Object.values(this.screens).forEach(screen => {
      if (screen) screen.classList.remove('active');
    });

    // Activar la pantalla elegida
    if (this.screens[screenId]) {
      this.screens[screenId].classList.add('active');
      this.activeScreen = screenId;
    }

    // Ocultar HUD por defecto a menos que se juegue
    if (screenId !== 'gameplay') {
      this.toggleHUD(false);
    }

    // Restablecer estado visual del preloader al mostrar la pantalla de carga
    if (screenId === 'loading') {
      const progressFill = document.querySelector('.loading-progress-fill');
      const subtitle = document.querySelector('.loading-subtitle');
      if (progressFill) {
        progressFill.style.animation = 'progressLoad 1.6s ease-in-out infinite';
        progressFill.style.width = '40%';
      }
      if (subtitle) {
        subtitle.textContent = 'Cargando... 0%';
      }
    }

    this.setupHoverSounds();
  }

  // Actualiza el progreso real de la pantalla de carga
  updateLoadingProgress(loaded, total) {
    const pct = total > 0 ? (loaded / total) * 100 : 100;
    const progressFill = document.querySelector('.loading-progress-fill');
    const subtitle = document.querySelector('.loading-subtitle');
    
    if (progressFill) {
      progressFill.style.animation = 'none';
      progressFill.style.width = `${pct}%`;
    }
    
    if (subtitle) {
      if (total > 0) {
        subtitle.textContent = `Cargando... ${Math.round(pct)}%`;
      } else {
        subtitle.textContent = 'Inicializando combate...';
      }
    }
  }

  // Activa o desactiva la interfaz superior de pelea (HUD)
  toggleHUD(show) {
    if (show) {
      this.hud.classList.add('active');
    } else {
      this.hud.classList.remove('active');
    }
  }

  resetCharacterSelection() {
    this.selectedChar = null;
    this.selectedOpponent = null;
    document.querySelectorAll('.char-card').forEach(card => {
      card.classList.remove('selected', 'opponent-selected');
    });
    this.updateVSSelectionStatus();
    const startBtn = document.getElementById('btn-char-start');
    if (startBtn) startBtn.disabled = true;
  }

  // Resalta visualmente el candidato seleccionado y arma el versus.
  selectCharacter(charId, mode = 'story') {
    AudioManager.play('select');
    const needsOpponent = mode !== 'practice';
    const startBtn = document.getElementById('btn-char-start');

    if (!this.selectedChar || this.selectedChar === charId) {
      this.selectedChar = charId;
      if (this.selectedOpponent === charId) this.selectedOpponent = null;
    } else {
      this.selectedOpponent = charId;
    }

    document.querySelectorAll('.char-card').forEach(card => {
      const cardChar = card.getAttribute('data-char');
      card.classList.toggle('selected', cardChar === this.selectedChar);
      card.classList.toggle('opponent-selected', cardChar === this.selectedOpponent);
    });

    this.updateVSSelectionStatus();

    if (startBtn) {
      startBtn.disabled = needsOpponent ? !(this.selectedChar && this.selectedOpponent) : !this.selectedChar;
    }
  }

  updateVSSelectionStatus() {
    const playerChoice = document.getElementById('vs-player-choice');
    const opponentChoice = document.getElementById('vs-opponent-choice');

    if (playerChoice) playerChoice.textContent = this.selectedChar ? this.getCharacterName(this.selectedChar) : 'Elegir';
    if (opponentChoice) opponentChoice.textContent = this.selectedOpponent ? this.getCharacterName(this.selectedOpponent) : 'Elegir';
  }

  // LÃ³gica de diÃ¡logos del Modo Historia
  updateStoryDialogue(dialogueLine, onCompleteTypeCallback) {
    const textContainer = document.getElementById('dialogue-text');
    const speakerName = document.getElementById('dialogue-speaker-name');
    const speakerLeft = document.getElementById('story-speaker-left');
    const speakerRight = document.getElementById('story-speaker-right');
    const activeCharacter = getCharacterData(dialogueLine.speaker);
    const activePortrait = dialogueLine.portrait === 'left' ? speakerLeft : speakerRight;
    const activePortraitImg = activePortrait?.querySelector('img');
    const activeNameTag = activePortrait?.querySelector('.story-name-tag');

    speakerName.textContent = dialogueLine.name;
    if (activePortraitImg) activePortraitImg.src = activeCharacter.portrait || '/assets/images/orsi.png';
    if (activeNameTag) activeNameTag.textContent = activeCharacter.shortName || activeCharacter.name;

    // Actualizar quiÃ©n habla (Iluminar retrato y apagar el otro)
    if (dialogueLine.portrait === 'left') {
      speakerLeft.classList.add('active');
      speakerRight.classList.remove('active');
      speakerName.className = 'font-orsi-text'; // Clase opcional de color
    } else {
      speakerRight.classList.add('active');
      speakerLeft.classList.remove('active');
      speakerName.className = 'font-lacalle-text';
    }

    // Efecto de mÃ¡quina de escribir profesional
    let currentIdx = 0;
    textContainer.textContent = '';
    
    if (this.dialogueInterval) clearInterval(this.dialogueInterval);
    
    this.dialogueInterval = setInterval(() => {
      textContainer.textContent += dialogueLine.text[currentIdx];
      currentIdx++;
      if (currentIdx >= dialogueLine.text.length) {
        clearInterval(this.dialogueInterval);
        this.dialogueInterval = null;
        if (onCompleteTypeCallback) onCompleteTypeCallback();
      }
    }, 20); // Velocidad de tipeo: 20ms por letra
  }

  // Salta el tipeo y muestra la lÃ­nea completa de golpe
  completeStoryDialogue(lineText) {
    if (this.dialogueInterval) {
      clearInterval(this.dialogueInterval);
      this.dialogueInterval = null;
    }
    document.getElementById('dialogue-text').textContent = lineText;
  }

  // ActualizaciÃ³n de barras del HUD en tiempo real
  updateHUD(p1, p2, timerSeconds, roundNumber, p1WinsCount = 0, p2WinsCount = 0) {
    // Actualizar nombres y fotos en el HUD si no coinciden
    const p1NameElem = document.getElementById('hud-p1-name');
    const p1Data = getCharacterData(p1.characterType);
    const p1BaseName = p1Data.name;
    const p1WinsText = p1WinsCount > 0 ? ' ' + '*'.repeat(p1WinsCount) : '';
    const p1NameText = p1BaseName + p1WinsText;
    if (p1NameElem && p1NameElem.textContent !== p1NameText) {
      p1NameElem.textContent = p1NameText;
      const p1PortraitElem = document.querySelector('#hud-p1-portrait img');
      if (p1PortraitElem) {
        p1PortraitElem.src = p1Data.portrait || '/assets/images/orsi.png';
      }
    }

    if (p2) {
      const p2NameElem = document.getElementById('hud-p2-name');
      const p2Data = getCharacterData(p2.characterType);
      const p2BaseName = p2Data.name;
      const p2WinsText = p2WinsCount > 0 ? ' ' + '*'.repeat(p2WinsCount) : '';
      const p2NameText = p2BaseName + p2WinsText;
      if (p2NameElem && p2NameElem.textContent !== p2NameText) {
        p2NameElem.textContent = p2NameText;
        const p2PortraitElem = document.querySelector('#hud-p2-portrait img');
        if (p2PortraitElem) {
          p2PortraitElem.src = p2Data.portrait || '/assets/images/orsi.png';
        }
      }
    }

    // 1. Vida del Jugador 1
    const p1HealthBar = document.getElementById('hud-p1-health');
    const p1HealthDamageBar = document.getElementById('hud-p1-health-damage');
    const p1Pct = (p1.health / p1.maxHealth) * 100;
    p1HealthBar.style.width = `${p1Pct}%`;
    // Retrasar levemente la barra de fondo roja para el efecto daÃ±o
    setTimeout(() => {
      if (p1HealthDamageBar) p1HealthDamageBar.style.width = `${p1Pct}%`;
    }, 400);

    // Medidores Especiales J1
    const p1SpecialBar = document.getElementById('hud-p1-special');
    p1SpecialBar.style.width = `${p1.specialMeter}%`;
    if (p1.specialMeter >= 100) p1SpecialBar.classList.add('glow-special');
    else p1SpecialBar.classList.remove('glow-special');

    // Combos flotantes J1
    const p1Combo = document.getElementById('hud-p1-combo');
    if (p1.comboCount > 1) {
      p1Combo.textContent = `${p1.comboCount} GOLPES!`;
    } else {
      p1Combo.textContent = '';
    }

    // Gestionar visibilidad del HUD del Jugador 2 y Temporizador para Modo Entrenamiento
    const p2HudElement = document.querySelector('.hud-player.hud-p2');
    const timerElement = document.querySelector('.hud-timer');

    if (!p2) {
      if (p2HudElement) p2HudElement.style.display = 'none';
      if (timerElement) timerElement.style.display = 'none';
      return;
    }

    if (p2HudElement) p2HudElement.style.display = 'flex';
    if (timerElement) timerElement.style.display = 'flex';

    // 2. Vida del Jugador 2
    const p2HealthBar = document.getElementById('hud-p2-health');
    const p2HealthDamageBar = document.getElementById('hud-p2-health-damage');
    const p2Pct = (p2.health / p2.maxHealth) * 100;
    p2HealthBar.style.width = `${p2Pct}%`;
    setTimeout(() => {
      if (p2HealthDamageBar) p2HealthDamageBar.style.width = `${p2Pct}%`;
    }, 400);

    // Medidores Especiales J2
    const p2SpecialBar = document.getElementById('hud-p2-special');
    p2SpecialBar.style.width = `${p2.specialMeter}%`;
    if (p2.specialMeter >= 100) p2SpecialBar.classList.add('glow-special');
    else p2SpecialBar.classList.remove('glow-special');

    // 4. Timer y Rounds
    document.getElementById('hud-timer-value').textContent = Math.ceil(timerSeconds);
    document.getElementById('hud-round-number').textContent = roundNumber;

    // Combos flotantes J2
    const p2Combo = document.getElementById('hud-p2-combo');
    if (p2.comboCount > 1) {
      p2Combo.textContent = `${p2.comboCount} GOLPES!`;
    } else {
      p2Combo.textContent = '';
    }
  }

  // Activa el flash de pantalla blanco arcade
  triggerFlash() {
    if (!this.flash) return;
    this.flash.classList.remove('flash-active');
    void this.flash.offsetWidth; // Forzar reflow para reiniciar la animaciÃ³n
    this.flash.classList.add('flash-active');
  }

  // Activa el anunciador central ("ROUND 1", "FIGHT", "KO")
  triggerAnnouncer(text, duration = 1500) {
    this.announcerText.textContent = text;
    
    // Restablecer clases por defecto
    this.announcerText.className = 'announcer-text-anim';
    
    // Si dice fight o KO reproducir efectos de voz del presentador
    if (text === 'FIGHT!') {
      this.announcerText.classList.add('fight-text');
      AudioManager.play('fight');
      this.triggerFlash();
      if (window.gameApp) {
        window.gameApp.triggerCameraShake(0.35); // Sacudida fuerte al iniciar
      }
    } else if (text === 'K.O.') {
      this.announcerText.classList.add('ko-text');
      AudioManager.play('ko');
      this.triggerFlash();
      if (window.gameApp) {
        window.gameApp.triggerCameraShake(0.45); // Sacudida Ã©pica al K.O.
      }
    } else if (text.startsWith('ROUND')) {
      if (window.gameApp) {
        window.gameApp.triggerCameraShake(0.12); // Sacudida menor al anunciar round
      }
    }

    this.announcer.classList.add('active');

    setTimeout(() => {
      this.announcer.classList.remove('active');
    }, duration);
  }

  // Muestra la pantalla de Fin de Partida (Victoria / Derrota)
  showGameOver(winnerName, message, stats) {
    document.getElementById('gameover-title').textContent = 'VICTORIA';
    document.getElementById('gameover-message').textContent = message;
    
    document.getElementById('stat-damage').textContent = `${Math.floor(stats.damage)}`;
    document.getElementById('stat-time').textContent = `${Math.ceil(stats.time)}s`;
    document.getElementById('stat-combo').textContent = `${stats.maxCombo} Golpes`;

    this.showScreen('gameover');
    AudioManager.play('victory');
  }

  // LÃ³gica del Panel de Opciones
  setupOpcionesUI() {
    // 1. Selector de Dificultad
    const diffButtons = document.querySelectorAll('.btn-diff');
    diffButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        diffButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const selectedDiff = e.target.getAttribute('data-diff');
        
        // Guardar en la configuraciÃ³n local
        localStorage.setItem('fightuy_difficulty', selectedDiff);
        AudioManager.play('select');
      });
    });

    // Cargar dificultad guardada por defecto
    const savedDiff = localStorage.getItem('fightuy_difficulty') || 'medium';
    const activeBtn = document.querySelector(`.btn-diff[data-diff="${savedDiff}"]`);
    if (activeBtn) {
      diffButtons.forEach(b => b.classList.remove('active'));
      activeBtn.classList.add('active');
    }

    // 2. Control de Volumen
    const volSlider = document.getElementById('options-audio');
    if (volSlider) {
      volSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value) / 100;
        AudioManager.setVolume(val);
      });
      // Inicializar
      AudioManager.setVolume(parseInt(volSlider.value) / 100);
    }
  }

  setupHoverSounds() {
    const hoverables = document.querySelectorAll('button, input, select, textarea, .char-card, a, .btn-diff');
    hoverables.forEach(el => {
      if (el.dataset.hasHoverSound) return;
      el.dataset.hasHoverSound = 'true';
      el.addEventListener('mouseenter', () => {
        AudioManager.play('hover');
      });
    });
  }

  // Obtiene la dificultad configurada
  getDifficulty() {
    return localStorage.getItem('fightuy_difficulty') || 'medium';
  }
}

export default new UIManager();
