class AudioManager {
  constructor() {
    this.ctx = null;
    this.volume = 0.8;
    this.loadedBuffers = {};
    this.remoteBuffers = {};
    this.remoteAudioPending = new Set();
    this.isUnlocked = false;
    this.activeDialogueSource = null;
    this.bgmActive = false;
    this.bgmInterval = null;

    this.soundPaths = {
      click: '/assets/audio/click.mp3',
      select: '/assets/audio/select.mp3',
      fight: '/assets/audio/fight.mp3',
      ko: '/assets/audio/ko.mp3',
      punch: '/assets/audio/punch.mp3',
      punch_swing: '/assets/audio/punch_swing.mp3',
      kick: '/assets/audio/kick.mp3',
      kick_swing: '/assets/audio/kick_swing.mp3',
      hit: '/assets/audio/hit.mp3',
      block: '/assets/audio/block.mp3',
      special_charge: '/assets/audio/special_charge.mp3',
      special_orsi: '/assets/audio/special_orsi.mp3',
      special_lacalle: '/assets/audio/special_lacalle.mp3',
      special_humano: '/assets/audio/special_humano.mp3',
      voice_orsi_hit: '/assets/audio/orsi_hit.mp3',
      voice_lacalle_hit: '/assets/audio/lacalle_hit.mp3',
      voice_humano_hit: '/assets/audio/humano_hit.mp3',
      victory: '/assets/audio/victory.mp3'
    };

    this.remoteVoiceTypes = new Set([
      'fight',
      'ko',
      'special_orsi',
      'special_lacalle',
      'special_humano',
      'voice_orsi_hit',
      'voice_lacalle_hit',
      'voice_humano_hit'
    ]);

    ['pointerdown', 'touchstart', 'mousedown', 'keydown', 'click'].forEach((eventName) => {
      window.addEventListener(eventName, () => this.unlockAudio(), { capture: true, passive: true });
    });
  }

  initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.preloadSounds();
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  unlockAudio() {
    this.initContext();
    if (!this.ctx || this.isUnlocked) return;

    const source = this.ctx.createBufferSource();
    const gainNode = this.ctx.createGain();
    source.buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
    gainNode.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    source.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    source.start(0);
    this.isUnlocked = true;

    // Arrancar la musica del menu automaticamente al primer click interactivo
    this.startBGM('menu');
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  async preloadSounds() {
    for (const [key, path] of Object.entries(this.soundPaths)) {
      try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        this.loadedBuffers[key] = await this.ctx.decodeAudioData(arrayBuffer);
      } catch {
        // Missing local files are expected while we use generated audio fallbacks.
      }
    }
  }

  play(soundName) {
    this.initContext();

    if (this.loadedBuffers[soundName]) {
      this.playBuffer(this.loadedBuffers[soundName]);
      return;
    }

    if (this.remoteVoiceTypes.has(soundName)) {
      this.playSyntheticFallback(soundName);
      void this.playRemoteVoice(soundName);
      return;
    }

    this.playSyntheticFallback(soundName);
  }

  async playRemoteVoice(soundName) {
    if (!this.ctx) return;

    if (this.remoteBuffers[soundName]) {
      this.playBuffer(this.remoteBuffers[soundName], 0.92);
      return;
    }

    if (this.remoteAudioPending.has(soundName)) return;

    this.remoteAudioPending.add(soundName);
    try {
      const response = await fetch('/api/elevenlabs-sound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: soundName })
      });

      if (!response.ok) throw new Error(`ElevenLabs status ${response.status}`);

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
      this.remoteBuffers[soundName] = audioBuffer;
      this.playBuffer(audioBuffer, 0.92);
    } catch (err) {
      console.warn(`No se pudo generar audio ElevenLabs "${soundName}".`, err);
    } finally {
      this.remoteAudioPending.delete(soundName);
    }
  }

  playBuffer(buffer, volumeScale = 1) {
    if (!this.ctx) return;

    const source = this.ctx.createBufferSource();
    const gainNode = this.ctx.createGain();
    source.buffer = buffer;
    gainNode.gain.setValueAtTime(this.volume * volumeScale, this.ctx.currentTime);
    source.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    source.start(0);
  }

  playSyntheticFallback(type) {
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    switch (type) {
      case 'click':
        this.playTone(620, 170, 0.08, 0.2, 'sine', now);
        break;

      case 'hover':
        this.playTone(1200, 1000, 0.04, 0.08, 'sine', now);
        break;

      case 'whoosh':
        this.playNoiseBurst(0.25, 0.15, 800, 'bandpass', now);
        this.playTone(320, 80, 0.25, 0.2, 'triangle', now);
        break;

      case 'select':
        this.playTone(360, 760, 0.13, 0.28, 'triangle', now);
        this.playTone(760, 1120, 0.09, 0.16, 'sine', now + 0.07);
        break;

      case 'punch_swing':
        this.playNoiseBurst(0.1, 0.24, 1050, 'bandpass', now);
        this.playTone(430, 210, 0.1, 0.14, 'triangle', now);
        break;

      case 'kick_swing':
        this.playNoiseBurst(0.16, 0.3, 720, 'bandpass', now);
        this.playTone(260, 120, 0.15, 0.18, 'triangle', now);
        break;

      case 'punch':
        this.playImpact({ thump: 105, snap: 1450, noise: 0.55, duration: 0.16, volume: 1.1 });
        break;

      case 'kick':
        this.playImpact({ thump: 72, snap: 900, noise: 0.42, duration: 0.24, volume: 1.22 });
        break;

      case 'hit':
      case 'voice_orsi_hit':
      case 'voice_lacalle_hit':
      case 'voice_humano_hit':
        this.playImpact({ thump: 135, snap: 1250, noise: 0.7, duration: 0.18, volume: 0.96 });
        break;

      case 'block':
        this.playNoiseBurst(0.08, 0.38, 1900, 'highpass', now);
        this.playTone(260, 90, 0.1, 0.5, 'square', now);
        break;

      case 'special_charge':
        this.playCharge(0.9);
        break;

      case 'special_orsi':
      case 'special_lacalle':
      case 'special_humano':
        this.playCharge(0.72);
        this.playNoiseBurst(0.26, 0.24, 1200, 'bandpass', now + 0.08);
        break;

      case 'fight':
        this.playTone(880, 880, 0.22, 0.36, 'sine', now);
        this.playTone(880, 660, 0.26, 0.34, 'sine', now + 0.16);
        this.playNoiseBurst(0.18, 0.1, 2600, 'highpass', now);
        break;

      case 'ko':
        this.playTone(140, 46, 1.15, 0.75, 'sawtooth', now);
        this.playNoiseBurst(0.45, 0.14, 450, 'lowpass', now + 0.05);
        break;

      case 'victory':
        [261.63, 329.63, 392.0, 523.25].forEach((freq, index) => {
          this.playTone(freq, freq * 1.02, 0.34, 0.34, 'triangle', now + index * 0.14);
        });
        this.playNoiseBurst(0.5, 0.08, 3200, 'highpass', now + 0.12);
        break;

      default:
        break;
    }
  }

  playTone(startFreq, endFreq, duration, volumeScale = 1, type = 'sine', startTime = this.ctx.currentTime) {
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, startFreq), startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), startTime + duration);
    gainNode.gain.setValueAtTime(this.volume * volumeScale, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  playNoiseBurst(duration, volumeScale = 0.5, frequency = 900, filterType = 'bandpass', startTime = this.ctx.currentTime) {
    const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const envelope = 1 - i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gainNode = this.ctx.createGain();

    source.buffer = buffer;
    filter.type = filterType;
    filter.frequency.setValueAtTime(frequency, startTime);
    filter.Q.setValueAtTime(1.4, startTime);
    gainNode.gain.setValueAtTime(this.volume * volumeScale, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    source.start(startTime);
    source.stop(startTime + duration);
  }

  playImpact({ thump, snap, noise, duration, volume }) {
    const now = this.ctx.currentTime;
    this.playTone(thump, 24, duration, volume, 'triangle', now);
    this.playTone(snap, 120, Math.min(0.055, duration), 0.32, 'sawtooth', now);
    this.playNoiseBurst(Math.min(0.12, duration), noise, snap, 'bandpass', now);
  }

  playCharge(duration) {
    const now = this.ctx.currentTime;
    this.playTone(150, 760, duration, 0.48, 'sawtooth', now);
    this.playTone(220, 1120, duration * 0.75, 0.22, 'triangle', now + 0.08);
    this.playNoiseBurst(duration * 0.5, 0.18, 720, 'bandpass', now + 0.05);
  }

  // Reproduce una linea de dialogo de historia
  playDialogue(text, speaker) {
    this.initContext();
    this.stopDialogue(); // Detener cualquier dialogo anterior activo
    void this.playDialogueVoice(text, speaker);
  }

  // Detiene la voz del dialogo activo (SpeechSynthesis o Web Audio)
  stopDialogue() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (this.activeDialogueSource) {
      try {
        this.activeDialogueSource.stop();
      } catch (e) {}
      this.activeDialogueSource = null;
    }
  }

  // Intenta generar el audio via ElevenLabs, y si falla pasa al sintetizador del navegador
  async playDialogueVoice(text, speaker) {
    if (!this.ctx) return;

    // Crear una clave de cache basada en locutor y texto
    const cacheKey = `dialogue_${speaker}_${text.slice(0, 32).replace(/[^a-zA-Z0-9]/g, '_')}`;

    if (this.remoteBuffers[cacheKey]) {
      this.activeDialogueSource = this.playBufferGetSource(this.remoteBuffers[cacheKey], 1.05);
      return;
    }

    try {
      const response = await fetch('/api/elevenlabs-sound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speaker })
      });

      if (!response.ok) throw new Error(`Status ${response.status}`);

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.remoteBuffers[cacheKey] = audioBuffer;

      // Reproducir solo si no se ha detenido en el medio
      this.activeDialogueSource = this.playBufferGetSource(audioBuffer, 1.05);
    } catch (err) {
      console.warn(`[AudioManager] Fallback a SpeechSynthesis por error de ElevenLabs para: "${text.slice(0, 30)}..."`, err);
      this.speakText(text, speaker);
    }
  }

  // Fallback con la API SpeechSynthesis de HTML5 en Español
  speakText(text, speaker) {
    if (!window.speechSynthesis) return;

    // Cancelar cualquier discurso previo
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Obtener voces en español del navegador
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith('es-UY')) ||
                  voices.find(v => v.lang.startsWith('es-AR')) ||
                  voices.find(v => v.lang.startsWith('es-ES')) ||
                  voices.find(v => v.lang.startsWith('es'));

    if (voice) {
      utterance.voice = voice;
    }
    utterance.lang = 'es-UY';

    // Ajustar caracteristicas segun el locutor para mayor realismo y comedia
    if (speaker === 'orsi') {
      utterance.pitch = 0.82; // Tono mas bajo
      utterance.rate = 0.88;   // Habla pausada de campo/Canelones
    } else if (speaker === 'lacalle') {
      utterance.pitch = 1.08;  // Tono mas alto/energetico
      utterance.rate = 1.02;   // Habla mas rapida y cheta
    } else if (speaker === 'announcer') {
      utterance.pitch = 0.7;   // Tono muy grave estilo arcade
      utterance.rate = 0.95;
    } else {
      utterance.pitch = 1.0;
      utterance.rate = 1.0;
    }

    utterance.volume = this.volume;
    window.speechSynthesis.speak(utterance);
  }

  // Reproduce un bufer de audio y retorna el source node para poder detenerlo
  playBufferGetSource(buffer, volumeScale = 1) {
    if (!this.ctx) return null;

    const source = this.ctx.createBufferSource();
    const gainNode = this.ctx.createGain();
    source.buffer = buffer;
    gainNode.gain.setValueAtTime(this.volume * volumeScale, this.ctx.currentTime);
    source.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    source.start(0);
    return source;
  }

  // Inicia la musica sintetizada de combate o menu estilo Synthwave
  startBGM(themeType = 'combat') {
    this.initContext();
    
    // Si ya esta reproduciendo este mismo tema, no hacer nada para evitar reinicios bruscos
    if (this.bgmInterval) {
      if (this.currentBGMType === themeType) return;
      this.stopBGM(); // Si es un tema diferente, detener el anterior primero
    }

    this.currentBGMType = themeType;
    this.bgmActive = true;

    let tempo = themeType === 'combat' ? 120 : 112; // 120 BPM para pelea, 112 BPM para menu
    let stepTime = 60 / tempo / 2; // Corcheas (1/8 notes)
    let step = 0;

    // Lineas de bajo rítmico (Notas en Hz)
    const combatBass = [
      55, 55, 65.4, 73.4, 55, 55, 73.4, 82.4,
      55, 55, 65.4, 73.4, 82.4, 82.4, 73.4, 65.4
    ];
    
    const menuBass = [
      58.27, 58.27, 58.27, 58.27, 65.4, 65.4, 65.4, 65.4,
      73.4, 73.4, 73.4, 73.4, 87.3, 87.3, 87.3, 87.3
    ]; // A#1, C2, D2, F2 en Hz

    const bassline = themeType === 'combat' ? combatBass : menuBass;

    const playSynthStep = () => {
      if (!this.bgmActive || !this.ctx) return;

      const now = this.ctx.currentTime;

      if (themeType === 'combat') {
        // --- Ritmo energetico de pelea ---
        // 1. Sintetizador de Bajo (sawtooth + sub sine) en cada negra (steps pares)
        if (step % 2 === 0) {
          const noteIdx = Math.floor(step / 2) % bassline.length;
          const freq = bassline[noteIdx];
          
          this.playTone(freq, freq * 0.99, stepTime * 1.6, 0.12, 'sawtooth', now);
          this.playTone(freq / 2, freq / 2, stepTime * 1.4, 0.2, 'sine', now);
        }

        // 2. Hi-Hat Retro (ruido blanco rapido en off-beats)
        if (step % 2 === 1) {
          this.playNoiseBurst(0.04, 0.04, 3800, 'highpass', now);
        }

        // 3. Bombo Analogico (Kick) en pulsos 0, 4, 6 de un patron de 8 corcheas
        const beat = step % 8;
        if (beat === 0 || beat === 4 || beat === 6) {
          this.playTone(130, 48, 0.14, 0.28, 'sine', now);
          this.playTone(190, 60, 0.035, 0.15, 'triangle', now); // Golpe de mazo
        }

        // 4. Caja Retro (Snare) en pasos 4 del patron
        if (beat === 4) {
          this.playNoiseBurst(0.12, 0.12, 1100, 'bandpass', now);
          this.playTone(180, 90, 0.09, 0.08, 'triangle', now);
        }
      } else {
        // --- Ritmo Épico y con Suspenso/Acción para el menú (112 BPM) ---
        // 1. Sintetizador de Bajo Sawtooth + Sub Sine rítmico en pasos pares
        if (step % 2 === 0) {
          const noteIdx = Math.floor(step / 2) % bassline.length;
          const freq = bassline[noteIdx];
          
          this.playTone(freq, freq * 0.99, stepTime * 1.6, 0.14, 'sawtooth', now);
          this.playTone(freq / 2, freq / 2, stepTime * 1.4, 0.22, 'sine', now);
        }

        // 2. Hi-Hat Rápido (contratiempos)
        if (step % 2 === 1) {
          this.playNoiseBurst(0.035, 0.025, 4000, 'highpass', now);
        }

        // 3. Bombo Épico (Kick)
        const beat = step % 8;
        if (beat === 0 || beat === 4) {
          this.playTone(110, 40, 0.15, 0.3, 'sine', now);
        }

        // 4. Caja Metálica Tensa (Snare)
        if (beat === 4) {
          this.playNoiseBurst(0.1, 0.08, 1200, 'bandpass', now);
          this.playTone(150, 80, 0.08, 0.06, 'triangle', now);
        }

        // 5. Arpegiador Dramático de Suspenso (Pluck Triangle)
        const chordNotes = step % 16;
        let melodyFreq = 0;
        const root = bassline[Math.floor(step / 8) % bassline.length] * 4; // 2 octavas arriba

        // Patrón melódico en escala menor y sexta menor (suspenso)
        if (chordNotes === 0) melodyFreq = root;
        else if (chordNotes === 2) melodyFreq = root * 1.2;  // 3ra menor
        else if (chordNotes === 4) melodyFreq = root * 1.5;  // 5ta
        else if (chordNotes === 6) melodyFreq = root * 1.6;  // 6ta menor (tensión)
        else if (chordNotes === 8) melodyFreq = root * 1.88; // 7ma menor
        else if (chordNotes === 10) melodyFreq = root * 1.6;
        else if (chordNotes === 12) melodyFreq = root * 1.5;
        else if (chordNotes === 14) melodyFreq = root * 1.2;

        if (melodyFreq > 0) {
          this.playTone(melodyFreq, melodyFreq * 0.98, 0.28, 0.06, 'triangle', now);
        }
      }

      step++;
    };

    // Usar un bucle estable
    this.bgmInterval = setInterval(playSynthStep, stepTime * 1000);
  }

  // Detiene la musica de combate de inmediato
  stopBGM() {
    this.bgmActive = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

export default new AudioManager();
