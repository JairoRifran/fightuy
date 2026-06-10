/* ==========================================================================
   FIGHTUY - MAIN COORDINATOR (Punto de Entrada)
   Inicializa Three.js, vincula los botones de la interfaz y orquesta el combate
   ========================================================================== */

import './style.css';
import * as THREE from 'three';
import UIManager from './UI/UIManager.js';
import AudioManager from './Engine/AudioManager.js';
import GameLoop from './Engine/GameLoop.js';
import InputManager from './Engine/InputManager.js';
import CollisionSystem from './Engine/CollisionSystem.js';
import StageManager from './Engine/StageManager.js';
import Fighter from './Engine/Fighter.js';
import AIController from './Engine/AIController.js';
import StoryDialogs from './UI/StoryDialogs.js';
import AuthManager from './Engine/AuthManager.js';
import { getCharacterData } from './Engine/CharacterData.js';

class GameApp {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // Entidades del juego
    this.player1 = null;
    this.player2 = null;
    this.gameMode = 'story'; // 'story', 'vs-cpu', 'vs-p2'
    this.activeStage = 'torre';

    // Estado de la pelea
    this.roundNumber = 1;
    this.roundTime = 99; // Segundos por round
    this.gameState = 'MENU'; // 'MENU', 'CHAR_SELECT', 'STORY', 'FIGHT', 'FINISHED'
    
    // EstadÃ­sticas para Game Over
    this.stats = {
      damage: 0,
      time: 0,
      maxCombo: 0
    };

    // DiÃ¡logos de Historia
    this.currentDialogueIndex = 0;
    this.dialogueLines = [];
    this.isDialogueTyping = false;

    // CÃ¡mara de la intro
    this.cameraNeedsSnap = false;
    this.transitionStartPos = new THREE.Vector3();
    this.transitionStartLook = new THREE.Vector3();

    // Efectos de cÃ¡mara
    this.cameraShakeIntensity = 0.0;
    window.gameApp = this; // Guardar referencia global

    // Contadores de rounds ganados
    this.p1RoundWins = 0;
    this.p2RoundWins = 0;

    // Animaciones y duraciones de intros
    this.p1Anim1Key = 'idle';
    this.p1Anim2Key = 'idle';
    this.p1Anim1Duration = 1.8;
    this.p1Anim2Duration = 1.8;
    this.p2Anim1Key = 'idle';
    this.p2Anim2Key = 'idle';
    this.p2Anim1Duration = 2.0;
    this.p2Anim2Duration = 2.0;

    this.initEngine();
    this.bindUIEvents();
    
    this.setupAuthGate();
  }

  // InicializaciÃ³n de Three.js (Render, CÃ¡mara, Escena, Sombras)
  initEngine() {
    const container = document.getElementById('game-container');
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Crear Escena
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0c10, 0.015);

    // 2. Configurar CÃ¡mara
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 2, 9); // Vista frontal inicial

    // 3. Configurar Renderizador
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    
    container.appendChild(this.renderer.domElement);

    // 4. Agregar grupo de partÃ­culas de colisiones
    CollisionSystem.addToScene(this.scene);

    // 5. Manejar Redimensionado de Ventana
    window.addEventListener('resize', () => this.onWindowResize());
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // Vincular eventos de botones HTML a la lÃ³gica
  async setupAuthGate() {
    UIManager.setAuthMode('login');
    UIManager.showScreen('auth');

    try {
      const user = await AuthManager.init();
      UIManager.updateAccount(AuthManager.getDisplayName(), AuthManager.enabled);
      UIManager.setOwnerControlsVisible(AuthManager.isOwner());

      if (user) {
        await AuthManager.trackEvent('session_restored');
        UIManager.showScreen('menu');
      }
    } catch (error) {
      UIManager.setAuthMessage(this.getAuthErrorMessage(error), 'error');
    }
  }

  bindAuthEvents() {
    const loginTab = document.getElementById('btn-auth-login-tab');
    const registerTab = document.getElementById('btn-auth-register-tab');
    const authForm = document.getElementById('auth-form');
    const logoutBtn = document.getElementById('btn-logout');

    loginTab?.addEventListener('click', () => {
      UIManager.setAuthMode('login');
    });

    registerTab?.addEventListener('click', () => {
      UIManager.setAuthMode('register');
    });

    authForm?.addEventListener('submit', async (event) => {
      event.preventDefault();

      const email = document.getElementById('auth-email')?.value.trim();
      const password = document.getElementById('auth-password')?.value;
      const username = document.getElementById('auth-username')?.value.trim();

      UIManager.setAuthBusy(true);
      UIManager.setAuthMessage('');

      try {
        if (UIManager.authMode === 'register') {
          const result = await AuthManager.signUp({ email, password, username });
          if (result?.needsEmailConfirmation) {
            UIManager.setAuthMode('login');
            UIManager.setAuthMessage('Usuario creado. RevisÃ¡ tu email para confirmar la cuenta y despuÃ©s entrÃ¡.', 'success');
            return;
          }
          UIManager.setAuthMessage('Usuario creado. Ya podÃ©s entrar al combate.', 'success');
        } else {
          await AuthManager.signIn({ email, password });
        }

        UIManager.updateAccount(AuthManager.getDisplayName(), AuthManager.enabled);
        UIManager.setOwnerControlsVisible(AuthManager.isOwner());
        await AuthManager.trackEvent(UIManager.authMode === 'register' ? 'signup' : 'login');
        UIManager.showScreen('menu');
      } catch (error) {
        UIManager.setAuthMessage(this.getAuthErrorMessage(error), 'error');
      } finally {
        UIManager.setAuthBusy(false);
      }
    });

    logoutBtn?.addEventListener('click', async () => {
      await AuthManager.signOut();
      UIManager.setOwnerControlsVisible(false);
      UIManager.showScreen('auth');
      UIManager.setAuthMode('login');
    });
  }

  getAuthErrorMessage(error) {
    const message = error?.message || String(error);

    if (message.includes('Invalid login credentials')) return 'Email o contraseÃ±a incorrectos.';
    if (message.includes('Password should be')) return 'La contraseÃ±a debe tener al menos 6 caracteres.';
    if (message.includes('User already registered')) return 'Ese email ya estÃ¡ registrado.';
    if (message.includes('Email not confirmed')) return 'RevisÃ¡ tu email para confirmar la cuenta.';

    return message;
  }

  async openOwnerPanel() {
    if (!AuthManager.isOwner()) {
      UIManager.setAuthMessage('Este panel es solo para el dueÃ±o del producto.', 'error');
      return;
    }

    UIManager.showScreen('ownerPanel');
    await this.loadOwnerDashboard();
  }

  async loadOwnerDashboard() {
    UIManager.setOwnerMessage('Cargando datos...');

    try {
      const dashboard = await AuthManager.getOwnerDashboard();
      UIManager.renderOwnerDashboard(dashboard);
      UIManager.setOwnerMessage('Datos actualizados.', 'success');
    } catch (error) {
      UIManager.setOwnerMessage(this.getAuthErrorMessage(error), 'error');
    }
  }

  async openPlayerProfile() {
    UIManager.showScreen('profile');
    await this.loadPlayerProfile();
  }

  async loadPlayerProfile() {
    UIManager.setProfileMessage('Cargando perfil...');

    try {
      const profile = await AuthManager.getPlayerProfile();
      UIManager.renderPlayerProfile(profile);
      UIManager.setProfileMessage('Perfil actualizado.', 'success');
      AuthManager.trackEvent('profile_opened');
    } catch (error) {
      UIManager.setProfileMessage(this.getAuthErrorMessage(error), 'error');
    }
  }

  openCharacterSelect(mode) {
    this.gameMode = mode;
    UIManager.resetCharacterSelection();
    AuthManager.trackEvent('mode_selected', { mode: this.gameMode });
    UIManager.showScreen('charSelect');
  }

  bindUIEvents() {
    this.bindAuthEvents();

    // Botones del menÃº principal
    document.getElementById('btn-story').addEventListener('click', () => {
      this.openCharacterSelect('story');
    });

    document.getElementById('btn-vs-cpu').addEventListener('click', () => {
      this.openCharacterSelect('vs-cpu');
    });

    document.getElementById('btn-vs-p2').addEventListener('click', () => {
      this.openCharacterSelect('vs-p2');
    });

    document.getElementById('btn-practice').addEventListener('click', () => {
      this.openCharacterSelect('practice');
    });

    document.getElementById('btn-profile').addEventListener('click', () => {
      this.openPlayerProfile();
    });

    document.getElementById('btn-profile-refresh').addEventListener('click', () => {
      this.loadPlayerProfile();
    });

    document.getElementById('btn-profile-back').addEventListener('click', () => {
      UIManager.showScreen('menu');
    });

    document.getElementById('btn-owner-panel').addEventListener('click', () => {
      this.openOwnerPanel();
    });

    document.getElementById('btn-owner-refresh').addEventListener('click', () => {
      this.loadOwnerDashboard();
    });

    document.getElementById('btn-owner-back').addEventListener('click', () => {
      UIManager.showScreen('menu');
    });

    document.getElementById('btn-options').addEventListener('click', () => {
      UIManager.showScreen('options');
    });

    document.getElementById('btn-credits').addEventListener('click', () => {
      UIManager.showScreen('credits');
    });

    // Botones de salida / cerrar pantallas secundarias
    document.getElementById('btn-options-close').addEventListener('click', () => {
      UIManager.showScreen('menu');
    });

    document.getElementById('btn-credits-close').addEventListener('click', () => {
      UIManager.showScreen('menu');
    });

    // Seleccion de personajes
    document.querySelectorAll('.char-card').forEach(card => {
      card.addEventListener('click', () => {
        this.selectCharacterIfAvailable(card.getAttribute('data-char'));
      });
    });

    document.getElementById('btn-char-back').addEventListener('click', () => {
      UIManager.showScreen('menu');
    });

    // Iniciar combate
    document.getElementById('btn-char-start').addEventListener('click', () => {
      this.activeStage = document.getElementById('select-stage').value;
      this.prepareMatch();
    });

    // Controles de Modo Historia
    document.getElementById('btn-next-dialogue').addEventListener('click', () => {
      this.advanceDialogue();
    });
    
    document.getElementById('btn-skip-story').addEventListener('click', () => {
      this.skipDialogue();
    });

    // Botones post-combate
    document.getElementById('btn-restart').addEventListener('click', () => {
      this.prepareMatch();
    });

    document.getElementById('btn-menu-back').addEventListener('click', () => {
      UIManager.showScreen('menu');
      this.gameState = 'MENU';
      // Cargar un escenario decorativo de fondo en el menÃº
      StageManager.loadStage('torre', this.scene, this.renderer);
    });

    // Eventos globales del teclado para la navegaciÃ³n de historia y menÃºs
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        if (this.gameState === 'STORY') {
          e.preventDefault();
          this.advanceDialogue();
        }
      }
    });

    // Cargar escenario decorativo inicial en el menÃº
    StageManager.loadStage('torre', this.scene, this.renderer);
    // Iniciar loop inactivo de renderizado para ver el fondo
    GameLoop.start(
      (dt) => this.idleUpdate(dt),
      () => this.render()
    );
  }

  selectCharacterIfAvailable(characterId) {
    if (!AuthManager.canUseCharacter(characterId)) {
      UIManager.setAuthMessage('Ese personaje requiere compra. Lo vamos a conectar al checkout cuando agreguemos pagos.', 'error');
      return;
    }

    UIManager.selectCharacter(characterId, this.gameMode);
    AuthManager.trackEvent('character_selected', { character_id: characterId });
  }

  // Prepara los peleadores y el escenario seleccionado
  prepareMatch() {
    // Limpiar anteriores
    if (this.player1) this.player1.destroy();
    if (this.player2) this.player2.destroy();
    CollisionSystem.clear();

    // Determinar personajes
    const char1 = UIManager.selectedChar; // Seleccionado por el usuario
    const char2 = this.gameMode === 'practice' ? null : UIManager.selectedOpponent;

    AuthManager.trackEvent('match_started', {
      mode: this.gameMode,
      stage: this.activeStage,
      player_character: char1,
      opponent_character: this.gameMode === 'practice' ? null : char2
    });

    // Mostrar pantalla de carga e iniciar fase de carga
    UIManager.showScreen('loading');
    this.gameState = 'LOADING';

    // Inicializar contadores de progreso de carga
    this.totalAssetsToLoad = 0;
    this.loadedAssetsCount = 0;

    // Calcular cuÃ¡ntos archivos asÃ­ncronos necesitamos cargar en total
    if (this.activeStage === 'torre') {
      this.totalAssetsToLoad += 1;
    }
    this.totalAssetsToLoad += Fighter.getAssetCount(char1);
    if (this.gameMode !== 'practice') {
      this.totalAssetsToLoad += Fighter.getAssetCount(char2);
    }

    // Callback para registrar la carga de cada asset
    const onAssetLoaded = (assetName) => {
      this.loadedAssetsCount++;
      UIManager.updateLoadingProgress(this.loadedAssetsCount, this.totalAssetsToLoad);
      console.log(`[Carga] Cargado con Ã©xito: ${assetName}. Progreso: ${this.loadedAssetsCount}/${this.totalAssetsToLoad}`);
    };

    // Si no hay assets asÃ­ncronos, forzar progreso 100% de inmediato
    if (this.totalAssetsToLoad === 0) {
      UIManager.updateLoadingProgress(0, 0);
    }

    // Cargar escenario en 3D
    StageManager.loadStage(this.activeStage, this.scene, this.renderer, onAssetLoaded);

    // Inicializar peleadores
    if (this.gameMode === 'practice') {
      // P1 en el centro, sin P2
      this.player1 = new Fighter(char1, 0.0, 1, this.scene, this.renderer, onAssetLoaded);
      this.player1.canReceiveDamage = false;
      this.player2 = null;
    } else {
      // PosiciÃ³n P1 en -4, P2 en +4
      this.player1 = new Fighter(char1, -4.0, 1, this.scene, this.renderer, onAssetLoaded);
      this.player2 = new Fighter(char2, 4.0, -1, this.scene, this.renderer, onAssetLoaded);
      this.player1.canReceiveDamage = true;
      this.player2.canReceiveDamage = true;
    }

    // Configurar Dificultad de la IA
    const currentDiff = UIManager.getDifficulty();
    AIController.setDifficulty(currentDiff);

    // Reiniciar estadÃ­sticas y contadores de rounds ganados
    this.roundNumber = 1;
    this.roundTime = this.gameMode === 'practice' ? 99999.0 : 99.0;
    this.stats = { damage: 0, time: 0, maxCombo: 0 };
    this.p1RoundWins = 0;
    this.p2RoundWins = 0;
  }

  // MODO HISTORIA: Inicializar diÃ¡logo del escenario
  startStoryMode() {
    this.gameState = 'STORY';
    this.currentDialogueIndex = 0;
    this.dialogueLines = this.getStoryDialogues();

    UIManager.showScreen('story');
    this.showNextDialogueLine();
  }

  getStoryDialogues() {
    const playerChar = this.player1?.characterType || UIManager.selectedChar;
    const opponentChar = this.player2?.characterType || UIManager.selectedOpponent;

    if (playerChar === 'humano' || opponentChar === 'humano') {
      const playerName = getCharacterData(playerChar).name;
      const opponentName = getCharacterData(opponentChar).name;
      const humanoIsPlayer = playerChar === 'humano';

      return [
        {
          speaker: playerChar,
          name: playerName,
          portrait: 'left',
          text: humanoIsPlayer
            ? 'Yo soy El Humano. No vine a explicar nada, vine a que Uruguay mire.'
            : `${playerName} mira raro al rival. Hay algo en esa entrada que no encaja con ninguna campaña.`
        },
        {
          speaker: opponentChar,
          name: opponentName,
          portrait: 'right',
          text: humanoIsPlayer
            ? `${opponentName} intenta mantener la guardia, pero el gateo de entrada rompió todo el protocolo.`
            : 'El Humano aparece gateando como si el escenario fuera suyo. Nadie sabe si es amenaza, protesta o performance.'
        },
        {
          speaker: 'humano',
          name: 'El Humano',
          portrait: humanoIsPlayer ? 'left' : 'right',
          text: 'La política pidió orden. El Humano trajo otra cosa.'
        }
      ];
    }

    return StoryDialogs[this.activeStage] || StoryDialogs.rambla;
  }

  showNextDialogueLine() {
    const line = this.dialogueLines[this.currentDialogueIndex];
    this.isDialogueTyping = true;
    
    UIManager.updateStoryDialogue(line, () => {
      this.isDialogueTyping = false;
    });
  }

  advanceDialogue() {
    if (this.isDialogueTyping) {
      // Si estÃ¡ escribiÃ©ndose, completarlo inmediatamente
      const line = this.dialogueLines[this.currentDialogueIndex];
      UIManager.completeStoryDialogue(line.text);
      this.isDialogueTyping = false;
    } else {
      // Avanzar a la siguiente lÃ­nea
      this.currentDialogueIndex++;
      if (this.currentDialogueIndex < this.dialogueLines.length) {
        this.showNextDialogueLine();
      } else {
        // Fin del diÃ¡logo, comenzar combate
        this.startCombatLoop();
      }
    }
  }

  skipDialogue() {
    if (UIManager.dialogueInterval) {
      clearInterval(UIManager.dialogueInterval);
      UIManager.dialogueInterval = null;
    }
    this.startCombatLoop();
  }

  // Inicia la pelea activa con intros secuenciales cinematogrÃ¡ficas
  startCombatLoop() {
    UIManager.showScreen('gameplay');
    UIManager.toggleHUD(true);
    UIManager.updateHUD(this.player1, this.player2, this.roundTime, this.roundNumber, this.p1RoundWins, this.p2RoundWins);

    if (this.gameMode === 'practice') {
      this.gameState = 'FIGHT';
      UIManager.triggerAnnouncer('ENTRENAMIENTO', 1500);
      setTimeout(() => {
        UIManager.triggerAnnouncer('Â¡A PRACTICAR!', 1000);
      }, 1500);
      return;
    }

    // Modo Combate: iniciar intro secuencial cinematogrÃ¡fica o carga rÃ¡pida
    this.gameState = 'ROUND_INTRO';
    this.introTimer = 0.0;
    this.introLookTarget = null; // Reiniciar mira de cÃ¡mara

    if (this.roundNumber === 1) {
      // Round 1: Hacer presentaciÃ³n cinematogrÃ¡fica completa
      this.introPhase = 'P1_INTRO';
      this.cameraNeedsSnap = true;
      
      // Obtener las claves de animaciÃ³n cargadas y disponibles para P1
      const p1Keys = this.player1?.config?.introKeys || [];
      const p1Available = this.player1 && this.player1.characterModels ? p1Keys.filter(k => this.player1.characterModels[k]) : [];
      this.p1Anim1Key = p1Available[0] || 'idle';
      this.p1Anim2Key = p1Available[1] || this.p1Anim1Key;

      this.p1Anim1Duration = this.player1 && this.player1.playIntroAnimation ?
        this.player1.getGLBClipDuration(this.p1Anim1Key, 1.8) : 1.8;
      this.p1Anim2Duration = this.player1 && this.player1.playIntroAnimation ?
        this.player1.getGLBClipDuration(this.p1Anim2Key, 1.8) : 1.8;

      // Obtener las claves de animaciÃ³n cargadas y disponibles para P2
      const p2Keys = this.player2?.config?.introKeys || [];
      const p2Available = this.player2 && this.player2.characterModels ? p2Keys.filter(k => this.player2.characterModels[k]) : [];
      this.p2Anim1Key = p2Available[0] || 'idle';
      this.p2Anim2Key = p2Available[1] || this.p2Anim1Key;

      this.p2Anim1Duration = this.player2 && this.player2.playIntroAnimation ?
        this.player2.getGLBClipDuration(this.p2Anim1Key, 2.0) : 2.0;
      this.p2Anim2Duration = this.player2 && this.player2.playIntroAnimation ?
        this.player2.getGLBClipDuration(this.p2Anim2Key, 2.0) : 2.0;

      // La duraciÃ³n total de la intro es la suma de ambas animaciones mÃ¡s el tiempo de pose hold, restando el solapamiento (overlap)
      const POSE_HOLD_TIME = 1.2; // 1.2 segundos para mantener la pose brevemente antes del combate o transiciÃ³n
      const overlapTime = 0.4; // Solapamiento de 400ms para mezcla activa
      this.p1IntroDuration = this.p1Anim1Duration + this.p1Anim2Duration + POSE_HOLD_TIME - (this.p1Anim2Key !== this.p1Anim1Key ? overlapTime : 0);
      this.p2IntroDuration = this.p2Anim1Duration + this.p2Anim2Duration + POSE_HOLD_TIME - (this.p2Anim2Key !== this.p2Anim1Key ? overlapTime : 0);

      // Ejecutar presentaciÃ³n de P1 (primera animaciÃ³n)
      if (this.player1 && this.player1.playIntroAnimation) {
        this.player1.playIntroAnimation(this.p1Anim1Key);
      }
      // Asegurar que P2 empiece en IDLE / Guardia quieta
      if (this.player2) {
        this.player2.changeState('IDLE');
      }

      // Forzar snap inmediato de la cÃ¡mara antes del primer renderizado
      this.updateIntroCamera(0.0);
    } else {
      // Round 2 o 3: Inicio rÃ¡pido sin intros repetitivas
      this.introPhase = 'ROUND_START_DIRECT';
      if (this.player1) this.player1.changeState('IDLE');
      if (this.player2) this.player2.changeState('IDLE');
    }

    UIManager.triggerAnnouncer(`ROUND ${this.roundNumber}`, 1500);
  }

  // Bucle inactivo para cuando estamos en menÃºs (para que la cÃ¡mara rote o se renderice el escenario)
  idleUpdate(dt) {
    // Rotar la luz o balancear la cÃ¡mara muy suavemente para dar dinamismo 3D premium
    const time = performance.now() * 0.0005;
    this.camera.position.x = Math.sin(time) * 1.5;
    this.camera.position.z = 9 + Math.cos(time) * 0.5;
    this.camera.lookAt(new THREE.Vector3(0, 1, 0));
    
    CollisionSystem.updateParticles();
  }

  // BUCLE DE ACTUALIZACIÃ“N DEL COMBATE (Llamado a 60 FPS fijos)
  updateCombat(dt) {
    // Decaer la sacudida de la cÃ¡mara (Camera Shake)
    if (this.cameraShakeIntensity > 0) {
      this.cameraShakeIntensity = Math.max(0, this.cameraShakeIntensity - dt * 2.2);
    }

    if (this.gameState === 'MENU' || this.gameState === 'STORY') {
      this.idleUpdate(dt);
      return;
    }

    if (this.gameState === 'LOADING') {
      const p1Loaded = !this.player1 || this.player1.hasLoadedGLB;
      const p2Loaded = !this.player2 || this.player2.hasLoadedGLB;
      const stageLoaded = StageManager.hasLoadedStage;

      if (p1Loaded && p2Loaded && stageLoaded) {
        if (this.player1) this.player1.mesh.visible = true;
        if (this.player2) this.player2.mesh.visible = true;
        if (this.gameMode === 'story') {
          this.startStoryMode();
        } else {
          this.startCombatLoop();
        }
      } else {
        this.idleUpdate(dt);
      }
      return;
    }

    if (this.gameState === 'ROUND_INTRO') {
      this.introTimer += dt;

      // Actualizar posiciones y animaciones de los personajes durante la intro
      if (this.player1) {
        this.player1.update(dt, this.player2 ? this.player2.position.x : null);
      }
      if (this.player2) {
        this.player2.update(dt, this.player1.position.x);
      }

      // Mantener efectos visuales activos
      CollisionSystem.updateParticles();

      // LÃ³gica de fases secuenciales de la intro
      if (this.introPhase === 'P1_INTRO') {
        // Transicionar de la primera a la segunda animaciÃ³n de P1 (solapada para fundido suave en movimiento)
        const overlapTime = 0.4;
        const triggerTime = Math.max(0.1, this.p1Anim1Duration - overlapTime);
        if (this.player1 && this.p1Anim2Key !== this.p1Anim1Key && this.player1.activeAnimationKey === this.p1Anim1Key && this.introTimer >= triggerTime) {
          if (this.player1.playIntroAnimation) {
            this.player1.playIntroAnimation(this.p1Anim2Key, overlapTime);
          }
        }

        if (this.introTimer >= this.p1IntroDuration) {
          if (this.player1 && this.player1.finishIntroAnimation) {
            this.player1.finishIntroAnimation();
          }
          if (this.player2 && this.player2.playIntroAnimation) {
            this.introPhase = 'P2_INTRO';
            this.introTimer = 0.0;
            this.cameraNeedsSnap = true;
            this.updateIntroCamera(0.0); // Snap a la posiciÃ³n de P2 de inmediato
            this.player2.playIntroAnimation(this.p2Anim1Key);
          } else {
            this.introPhase = 'INTRO_OUTRO';
            this.introTimer = 0.0;
            this.transitionStartPos.copy(this.camera.position);
            if (this.introLookTarget) {
              this.transitionStartLook.copy(this.introLookTarget);
            } else {
              this.transitionStartLook.set(0, 1, 0);
            }
          }
        }
      } else if (this.introPhase === 'P2_INTRO') {
        // Transicionar de la primera a la segunda animaciÃ³n de P2 (solapada para fundido suave en movimiento)
        const overlapTime = 0.4;
        const triggerTime = Math.max(0.1, this.p2Anim1Duration - overlapTime);
        if (this.player2 && this.p2Anim2Key !== this.p2Anim1Key && this.player2.activeAnimationKey === this.p2Anim1Key && this.introTimer >= triggerTime) {
          if (this.player2.playIntroAnimation) {
            this.player2.playIntroAnimation(this.p2Anim2Key, overlapTime);
          }
        }

        if (this.introTimer >= this.p2IntroDuration) {
          if (this.player2 && this.player2.finishIntroAnimation) {
            this.player2.finishIntroAnimation();
          }
          this.introPhase = 'INTRO_OUTRO';
          this.introTimer = 0.0;
          this.transitionStartPos.copy(this.camera.position);
          if (this.introLookTarget) {
            this.transitionStartLook.copy(this.introLookTarget);
          } else {
            this.transitionStartLook.set(0, 1, 0);
          }
        }
      } else if (this.introPhase === 'INTRO_OUTRO') {
        const outroDuration = 0.8;
        if (this.introTimer >= outroDuration) {
          this.introPhase = 'NONE';
          this.gameState = 'FIGHT';
          UIManager.triggerAnnouncer('FIGHT!', 1000);
        }
      } else if (this.introPhase === 'ROUND_START_DIRECT') {
        if (this.introTimer >= 1.5) {
          this.introPhase = 'NONE';
          this.gameState = 'FIGHT';
          UIManager.triggerAnnouncer('FIGHT!', 1000);
        }
      }

      // Actualizar la cÃ¡mara de forma dinÃ¡mica o intro segÃºn la fase
      if (this.introPhase === 'ROUND_START_DIRECT') {
        this.updateCameraDynamic();
      } else {
        this.updateIntroCamera(dt);
      }
      
      // Sincronizar HUD durante intro
      if (this.player1) {
        UIManager.updateHUD(this.player1, this.player2, this.roundTime, this.roundNumber, this.p1RoundWins, this.p2RoundWins);
      }
      return;
    }

    if (this.gameState === 'FIGHT') {
      // 1. Descontar tiempo (excepto en modo prÃ¡ctica)
      if (this.gameMode !== 'practice') {
        this.roundTime -= dt;
        this.stats.time += dt;
        
        if (this.roundTime <= 0) {
          this.roundTime = 0;
          this.resolveRoundTimeout();
        }
      } else if (this.player1) {
        this.player1.specialMeter = this.player1.maxSpecial;
      }

      // 2. Capturar Inputs P1
      const p1Input = InputManager.getPlayerInput('p1');
      this.applyPlayerInputs(this.player1, p1Input);

      // 3. Capturar Inputs P2 (CPU o Jugador 2) (si existe)
      if (this.player2) {
        if (this.gameMode === 'vs-p2') {
          const p2Input = InputManager.getPlayerInput('p2');
          this.applyPlayerInputs(this.player2, p2Input);
        } else {
          // LÃ³gica de Inteligencia Artificial para P2
          const aiInput = AIController.update(dt, this.player2, this.player1);
          this.applyPlayerInputs(this.player2, aiInput);
        }
      }
    }

    // 4. Actualizar posiciones, animaciones y fÃ­sicas de personajes
    if (this.player1) {
      const p2PosX = this.player2 ? this.player2.position.x : null;
      this.player1.update(dt, p2PosX);

      if (this.player2) {
        this.player2.update(dt, this.player1.position.x);

        // 5. Correr sistema de colisiones completo
        CollisionSystem.update(this.player1, this.player2, StageManager.limits);
        
        this.stats.maxCombo = Math.max(this.stats.maxCombo, this.player1.comboCount, this.player2.comboCount);

        // 6. Verificar si hay un K.O.
        if (this.gameState === 'FIGHT') {
          if (this.player1.isDead || this.player2.isDead) {
            this.resolveRoundKO();
          }
        }
      } else {
        // En entrenamiento, limitar a P1 dentro de los bordes del escenario
        const minX = StageManager.limits.minX;
        const maxX = StageManager.limits.maxX;
        if (this.player1.position.x < minX) this.player1.position.x = minX;
        if (this.player1.position.x > maxX) this.player1.position.x = maxX;
        this.player1.mesh.position.x = this.player1.position.x;
        
        // Actualizar efectos de partÃ­culas
        CollisionSystem.updateParticles();
        
        this.stats.maxCombo = Math.max(this.stats.maxCombo, this.player1.comboCount);
      }
    }

    // 7. Mover la cÃ¡mara dinÃ¡micamente
    this.updateCameraDynamic();

    // 8. Sincronizar UI del HUD
    if (this.player1) {
      UIManager.updateHUD(this.player1, this.player2, this.roundTime, this.roundNumber, this.p1RoundWins, this.p2RoundWins);
    }
  }

  // Aplica las acciones fÃ­sicas a los personajes de acuerdo a las teclas
  applyPlayerInputs(fighter, input) {
    if (fighter.isDead || fighter.currentState === 'HIT') return;

    const practiceDepthMode = this.gameMode === 'practice' && !this.player2;
    const practiceDepthUp = practiceDepthMode && InputManager.isPressed('KeyW');
    const practiceDepthDown = practiceDepthMode && InputManager.isPressed('KeyS');

    if (practiceDepthMode) {
      fighter.block(false);

      if (input.left) {
        fighter.move(-1);
      } else if (input.right) {
        fighter.move(1);
      }

      if (practiceDepthDown) {
        fighter.moveDepth(1);
      } else if (practiceDepthUp) {
        fighter.moveDepth(-1);
      }

      if (input.jump) {
        fighter.jump();
      }

      if (input.punch) {
        fighter.punch();
      } else if (input.kick) {
        fighter.kick();
      } else if (input.special) {
        fighter.special();
      }
      return;
    }

    // Bloqueo
    if (input.block) {
      fighter.block(true);
    } else {
      fighter.block(false);
      
      // Movimientos
      if (input.left) {
        fighter.move(-1);
      } else if (input.right) {
        fighter.move(1);
      }
    }

    // Salto
    if (input.jump) {
      fighter.jump();
    }

    // Ataques
    if (input.punch) {
      fighter.punch();
    } else if (input.kick) {
      fighter.kick();
    } else if (input.special) {
      fighter.special();
    }
  }

  // Obtiene la posiciÃ³n y objetivo de la cÃ¡mara estÃ¡ndar de combate
  getStandardCameraTarget() {
    let centerX, centerY, centerZ, dist;

    if (this.player2) {
      centerX = (this.player1.position.x + this.player2.position.x) / 2;
      centerY = (this.player1.position.y + this.player2.position.y) / 2 + 1.1;
      centerZ = 0;
      dist = Math.abs(this.player1.position.x - this.player2.position.x);
    } else {
      const leadX = THREE.MathUtils.clamp(this.player1.velocity.x * 0.12, -0.55, 0.55);
      centerX = this.player1.position.x + leadX;
      centerY = this.player1.position.y + 1.1;
      centerZ = this.player1.position.z * 0.32;
      dist = 3.0;
    }

    centerX = THREE.MathUtils.clamp(centerX, StageManager.limits.minX + 3.2, StageManager.limits.maxX - 3.2);

    const targetZ = THREE.MathUtils.clamp(6.3 + (dist * 0.38), 6.8, 11.8);
    const targetY = centerY + 0.8;

    return {
      posX: centerX,
      posY: targetY,
      posZ: targetZ,
      lookX: centerX,
      lookY: centerY - 0.2,
      lookZ: centerZ
    };
  }

  // MÃ©todo para disparar la sacudida de la cÃ¡mara
  triggerCameraShake(intensity) {
    this.cameraShakeIntensity = Math.max(this.cameraShakeIntensity, intensity);
  }

  // Manejo de la CÃ¡mara DinÃ¡mica 2.5D de Pelea (Estilo Street Fighter)
  updateCameraDynamic() {
    if (!this.player1) return;

    const target = this.getStandardCameraTarget();
    const cameraLerp = this.player2 ? 0.075 : 0.105;
    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, target.posX, cameraLerp);
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, target.posY, cameraLerp);
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, target.posZ, cameraLerp);

    // Aplicar sacudida de cÃ¡mara (Camera Shake) si estÃ¡ activa
    if (this.cameraShakeIntensity > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShakeIntensity;
      this.camera.position.z += (Math.random() - 0.5) * this.cameraShakeIntensity * 0.5;
    }

    const lookTarget = new THREE.Vector3(target.lookX, target.lookY, target.lookZ);
    this.camera.lookAt(lookTarget);
  }

  // Manejo de la CÃ¡mara CinematogrÃ¡fica de la Intro (Primeros planos y paneo de grÃºa)
  updateIntroCamera(dt) {
    if (!this.player1) return;

    let targetPosX, targetPosY, targetPosZ;
    let targetLookX, targetLookY, targetLookZ;

    if (this.introPhase === 'P1_INTRO') {
      const progress = Math.min(1, this.introTimer / this.p1IntroDuration);
      // Plano medio-largo proporcional al escenario (cÃ¡mara mÃ¡s alejada para evitar distorsiÃ³n de escala)
      targetPosX = THREE.MathUtils.lerp(-2.6, -2.2, progress);
      targetPosY = THREE.MathUtils.lerp(1.2, 1.4, progress);
      targetPosZ = THREE.MathUtils.lerp(5.0, 4.0, progress);

      targetLookX = -4.0;
      targetLookY = 0.9;
      targetLookZ = 0.0;
    } else if (this.introPhase === 'P2_INTRO') {
      const progress = Math.min(1, this.introTimer / this.p2IntroDuration);
      // Espejo de plano medio-largo proporcional para P2
      targetPosX = THREE.MathUtils.lerp(2.6, 2.2, progress);
      targetPosY = THREE.MathUtils.lerp(1.2, 1.4, progress);
      targetPosZ = THREE.MathUtils.lerp(5.0, 4.0, progress);

      targetLookX = 4.0;
      targetLookY = 0.9;
      targetLookZ = 0.0;
    } else {
      // INTRO_OUTRO: InterpolaciÃ³n fluida hacia la vista de combate estÃ¡ndar
      const progress = Math.min(1, this.introTimer / 0.8);
      const standard = this.getStandardCameraTarget();

      targetPosX = THREE.MathUtils.lerp(this.transitionStartPos.x, standard.posX, progress);
      targetPosY = THREE.MathUtils.lerp(this.transitionStartPos.y, standard.posY, progress);
      targetPosZ = THREE.MathUtils.lerp(this.transitionStartPos.z, standard.posZ, progress);

      targetLookX = THREE.MathUtils.lerp(this.transitionStartLook.x, standard.lookX, progress);
      targetLookY = THREE.MathUtils.lerp(this.transitionStartLook.y, standard.lookY, progress);
      targetLookZ = THREE.MathUtils.lerp(this.transitionStartLook.z, standard.lookZ, progress);
    }

    if (this.cameraNeedsSnap) {
      this.camera.position.set(targetPosX, targetPosY, targetPosZ);
      if (!this.introLookTarget) {
        this.introLookTarget = new THREE.Vector3(targetLookX, targetLookY, targetLookZ);
      } else {
        this.introLookTarget.set(targetLookX, targetLookY, targetLookZ);
      }
      this.camera.lookAt(this.introLookTarget);
      this.cameraNeedsSnap = false;
      return;
    }

    // Suavizar rotaciÃ³n y paneo de cÃ¡mara
    const cameraLerp = 0.12;
    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetPosX, cameraLerp);
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetPosY, cameraLerp);
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetPosZ, cameraLerp);

    // Aplicar sacudida de cÃ¡mara (Camera Shake) si estÃ¡ activa (ej: al decir FIGHT!)
    if (this.cameraShakeIntensity > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShakeIntensity;
      this.camera.position.z += (Math.random() - 0.5) * this.cameraShakeIntensity * 0.5;
    }

    if (!this.introLookTarget) {
      this.introLookTarget = new THREE.Vector3(targetLookX, targetLookY, targetLookZ);
    }
    this.introLookTarget.x = THREE.MathUtils.lerp(this.introLookTarget.x, targetLookX, cameraLerp);
    this.introLookTarget.y = THREE.MathUtils.lerp(this.introLookTarget.y, targetLookY, cameraLerp);
    this.introLookTarget.z = THREE.MathUtils.lerp(this.introLookTarget.z, targetLookZ, cameraLerp);

    this.camera.lookAt(this.introLookTarget);
  }

  // ResoluciÃ³n por muerte (K.O.)
  resolveRoundKO() {
    this.gameState = 'ROUND_OUTRO';
    UIManager.triggerAnnouncer('K.O.', 2000);

    // Detener a los personajes
    this.player1.velocity.set(0,0,0);
    this.player2.velocity.set(0,0,0);

    setTimeout(() => {
      this.evaluateMatchProgress();
    }, 2000);
  }

  // ResoluciÃ³n por fin de tiempo
  resolveRoundTimeout() {
    this.gameState = 'ROUND_OUTRO';
    UIManager.triggerAnnouncer('Â¡TIEMPO!', 2000);

    // El que tenga mÃ¡s vida gana
    if (this.player1.health > this.player2.health) {
      this.player2.die();
    } else if (this.player2.health > this.player1.health) {
      this.player1.die();
    } else {
      // Empate, mueren ambos para resolver
      this.player1.die();
      this.player2.die();
    }

    setTimeout(() => {
      this.evaluateMatchProgress();
    }, 2000);
  }

  // EvalÃºa si hay siguientes rounds o define al ganador final del juego (Best-of-3)
  evaluateMatchProgress() {
    if (this.gameMode === 'practice') return;
    const p1Wins = this.player2 && this.player2.isDead && !this.player1.isDead;
    const p2Wins = this.player1.isDead && !this.player2.isDead;

    // Calcular daÃ±o total infligido para estadÃ­sticas
    this.stats.damage += (this.player2.maxHealth - this.player2.health);

    // Determinar ganador de este round
    if (p1Wins) {
      this.p1RoundWins++;
      this.player1.changeState('VICTORY');
    } else if (p2Wins) {
      this.p2RoundWins++;
      this.player2.changeState('VICTORY');
    } else {
      // Doble KO / Empate
      this.p1RoundWins++;
      this.p2RoundWins++;
      if (this.player1) this.player1.changeState('VICTORY');
      if (this.player2) this.player2.changeState('VICTORY');
    }

    // Verificar si la pelea terminÃ³ (alguien con 2 o mÃ¡s rounds ganados)
    const matchFinished = this.p1RoundWins >= 2 || this.p2RoundWins >= 2;

    if (matchFinished) {
      this.gameState = 'FINISHED';

      let winnerFighter = null;
      let msg = '';

      if (this.p1RoundWins > this.p2RoundWins) {
        winnerFighter = this.player1;
      } else if (this.p2RoundWins > this.p1RoundWins) {
        winnerFighter = this.player2;
      } else {
        winnerFighter = null;
        msg = 'Balotaje trancado. Empate técnico definitivo en Uruguay.';
      }

      const winnerName = winnerFighter ? getCharacterData(winnerFighter.characterType).name : 'Ninguno';
      if (winnerFighter) {
        msg = `${winnerName} gana el combate y deja su marca en la política bizarra uruguaya.`;
      }

      AuthManager.trackEvent('match_finished', {
        mode: this.gameMode,
        stage: this.activeStage,
        winner: winnerFighter?.characterType || null,
        player_character: this.player1?.characterType || null,
        opponent_character: this.player2?.characterType || null,
        p1_rounds: this.p1RoundWins,
        p2_rounds: this.p2RoundWins,
        damage: Math.floor(this.stats.damage),
        max_combo: this.stats.maxCombo
      });

      setTimeout(() => {
        UIManager.showGameOver(winnerName, msg, this.stats);
      }, 1000);
    } else {
      // Continuar al siguiente round
      this.roundNumber++;
      this.roundTime = 99.0;

      setTimeout(() => {
        // Resetear posiciones y estados de luchadores
        if (this.player1) this.player1.reset(-4.0, 1);
        if (this.player2) this.player2.reset(4.0, -1);
        CollisionSystem.clear();

        // Iniciar el combate del siguiente round
        this.startCombatLoop();
      }, 2000);
    }
  }

  // LÃ³gica principal de ejecuciÃ³n de dibujo
  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

// Iniciar aplicaciÃ³n al cargar
window.addEventListener('DOMContentLoaded', () => {
  // Redirigir el loop del juego a la instancia de la app
  const app = new GameApp();
  
  // Re-enlazar el GameLoop para usar las lÃ³gicas fÃ­sicas especÃ­ficas del combate
  GameLoop.stop();
  GameLoop.start(
    (dt) => app.updateCombat(dt),
    () => app.render()
  );
});
