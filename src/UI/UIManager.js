/* ==========================================================================
   FIGHTUY - UI MANAGER
   Maneja la navegación de pantallas y la sincronización del HUD e interfaz
   ========================================================================== */

import AudioManager from '../Engine/AudioManager.js';

class UIManager {
  constructor() {
    this.activeScreen = 'screen-main-menu';
    this.selectedChar = null; // 'orsi' o 'lacalle'
    this.authMode = 'login';
    
    // Referencias a los elementos del DOM (Caché)
    this.screens = {
      auth: document.getElementById('screen-auth'),
      menu: document.getElementById('screen-main-menu'),
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
  }

  updateAccount(userName, isSupabaseEnabled) {
    const accountName = document.getElementById('account-name');
    const devNote = document.getElementById('auth-dev-note');

    if (accountName) {
      accountName.textContent = isSupabaseEnabled ? `Usuario: ${userName}` : `Modo local: ${userName}`;
    }

    if (devNote) {
      devNote.style.display = isSupabaseEnabled ? 'none' : 'block';
    }
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
    AudioManager.play('click');

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

  // Resalta visualmente el candidato seleccionado
  selectCharacter(charId) {
    AudioManager.play('select');
    this.selectedChar = charId;
    
    const cardOrsi = document.getElementById('card-orsi');
    const cardLacalle = document.getElementById('card-lacalle');
    const startBtn = document.getElementById('btn-char-start');

    if (charId === 'orsi') {
      cardOrsi.classList.add('selected');
      cardLacalle.classList.remove('selected');
    } else {
      cardLacalle.classList.add('selected');
      cardOrsi.classList.remove('selected');
    }

    // Activar botón de Pelea una vez elegido
    startBtn.disabled = false;
  }

  // Lógica de diálogos del Modo Historia
  updateStoryDialogue(dialogueLine, onCompleteTypeCallback) {
    const textContainer = document.getElementById('dialogue-text');
    const speakerName = document.getElementById('dialogue-speaker-name');
    const speakerLeft = document.getElementById('story-speaker-left');
    const speakerRight = document.getElementById('story-speaker-right');

    speakerName.textContent = dialogueLine.name;

    // Actualizar quién habla (Iluminar retrato y apagar el otro)
    if (dialogueLine.portrait === 'left') {
      speakerLeft.classList.add('active');
      speakerRight.classList.remove('active');
      speakerName.className = 'font-orsi-text'; // Clase opcional de color
    } else {
      speakerRight.classList.add('active');
      speakerLeft.classList.remove('active');
      speakerName.className = 'font-lacalle-text';
    }

    // Efecto de máquina de escribir profesional
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

  // Salta el tipeo y muestra la línea completa de golpe
  completeStoryDialogue(lineText) {
    if (this.dialogueInterval) {
      clearInterval(this.dialogueInterval);
      this.dialogueInterval = null;
    }
    document.getElementById('dialogue-text').textContent = lineText;
  }

  // Actualización de barras del HUD en tiempo real
  updateHUD(p1, p2, timerSeconds, roundNumber, p1WinsCount = 0, p2WinsCount = 0) {
    // Actualizar nombres y fotos en el HUD si no coinciden
    const p1NameElem = document.getElementById('hud-p1-name');
    const p1BaseName = p1.characterType === 'orsi' ? 'Yamandú Orsi' : 'Luis Lacalle Pou';
    const p1WinsText = p1WinsCount > 0 ? ' ' + '⭐'.repeat(p1WinsCount) : '';
    const p1NameText = p1BaseName + p1WinsText;
    if (p1NameElem && p1NameElem.textContent !== p1NameText) {
      p1NameElem.textContent = p1NameText;
      const p1PortraitElem = document.querySelector('#hud-p1-portrait img');
      if (p1PortraitElem) {
        p1PortraitElem.src = p1.characterType === 'orsi' ? '/assets/images/orsi.png' : '/assets/images/lacalle.png';
      }
    }

    if (p2) {
      const p2NameElem = document.getElementById('hud-p2-name');
      const p2BaseName = p2.characterType === 'orsi' ? 'Yamandú Orsi' : 'Luis Lacalle Pou';
      const p2WinsText = p2WinsCount > 0 ? ' ' + '⭐'.repeat(p2WinsCount) : '';
      const p2NameText = p2BaseName + p2WinsText;
      if (p2NameElem && p2NameElem.textContent !== p2NameText) {
        p2NameElem.textContent = p2NameText;
        const p2PortraitElem = document.querySelector('#hud-p2-portrait img');
        if (p2PortraitElem) {
          p2PortraitElem.src = p2.characterType === 'orsi' ? '/assets/images/orsi.png' : '/assets/images/lacalle.png';
        }
      }
    }

    // 1. Vida del Jugador 1
    const p1HealthBar = document.getElementById('hud-p1-health');
    const p1HealthDamageBar = document.getElementById('hud-p1-health-damage');
    const p1Pct = (p1.health / p1.maxHealth) * 100;
    p1HealthBar.style.width = `${p1Pct}%`;
    // Retrasar levemente la barra de fondo roja para el efecto daño
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
      p1Combo.textContent = `¡${p1.comboCount} GOLPES!`;
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
      p2Combo.textContent = `¡${p2.comboCount} GOLPES!`;
    } else {
      p2Combo.textContent = '';
    }
  }

  // Activa el flash de pantalla blanco arcade
  triggerFlash() {
    if (!this.flash) return;
    this.flash.classList.remove('flash-active');
    void this.flash.offsetWidth; // Forzar reflow para reiniciar la animación
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
        window.gameApp.triggerCameraShake(0.45); // Sacudida épica al K.O.
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

  // Lógica del Panel de Opciones
  setupOpcionesUI() {
    // 1. Selector de Dificultad
    const diffButtons = document.querySelectorAll('.btn-diff');
    diffButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        diffButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const selectedDiff = e.target.getAttribute('data-diff');
        
        // Guardar en la configuración local
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

  // Obtiene la dificultad configurada
  getDifficulty() {
    return localStorage.getItem('fightuy_difficulty') || 'medium';
  }
}

export default new UIManager();
