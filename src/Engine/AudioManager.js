/* ==========================================================================
   FIGHTUY - AUDIO MANAGER
   Carga audios locales (MP3/WAV) y provee fallback sintetizado con Web Audio API
   ========================================================================== */

class AudioManager {
  constructor() {
    this.ctx = null;
    this.volume = 0.8; // Rango: 0.0 a 1.0
    this.loadedBuffers = {};
    
    // Mapeo de sonidos a nombres de archivo en /public/assets/audio/
    this.soundPaths = {
      click: '/assets/audio/click.mp3',
      select: '/assets/audio/select.mp3',
      fight: '/assets/audio/fight.mp3',
      ko: '/assets/audio/ko.mp3',
      punch: '/assets/audio/punch.mp3',
      kick: '/assets/audio/kick.mp3',
      hit: '/assets/audio/hit.mp3',
      block: '/assets/audio/block.mp3',
      special_orsi: '/assets/audio/special_orsi.mp3', // ElevenLabs Orsi
      special_lacalle: '/assets/audio/special_lacalle.mp3', // ElevenLabs Lacalle
      voice_orsi_hit: '/assets/audio/orsi_hit.mp3',
      voice_lacalle_hit: '/assets/audio/lacalle_hit.mp3',
      victory: '/assets/audio/victory.mp3'
    };

    // Registrar inicio de interacción del usuario para desbloquear Web Audio Context
    window.addEventListener('click', () => this.initContext(), { once: true });
    window.addEventListener('keydown', () => this.initContext(), { once: true });
  }

  initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      console.log('AudioContext inicializado correctamente.');
      this.preloadSounds();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  // Pre-carga asíncrona de archivos
  async preloadSounds() {
    for (const [key, path] of Object.entries(this.soundPaths)) {
      try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        this.loadedBuffers[key] = await this.ctx.decodeAudioData(arrayBuffer);
        console.log(`Audio cargado: ${key}`);
      } catch (err) {
        // Ignoramos silenciosamente para usar el fallback sintético si no existen aún
        console.warn(`Sonido "${key}" no encontrado en "${path}". Usando sintetizador fallback.`);
      }
    }
  }

  // Método de reproducción principal
  play(soundName) {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Si el archivo está cargado, reproducirlo
    if (this.loadedBuffers[soundName]) {
      this.playBuffer(this.loadedBuffers[soundName]);
      return;
    }

    // Fallback Sintetizado por Software (Web Audio API)
    this.playSyntheticFallback(soundName);
  }

  playBuffer(buffer) {
    if (!this.ctx) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    
    source.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    source.start(0);
  }

  // Generador de Sonidos Sintéticos (Modo Arcade Retro)
  playSyntheticFallback(type) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    switch (type) {
      case 'click':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gainNode.gain.setValueAtTime(this.volume * 0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;

      case 'select':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(800, now + 0.08);
        gainNode.gain.setValueAtTime(this.volume * 0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;

      case 'punch':
        // Ruido blanco/marrón sintetizado + onda senoidal de impacto
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(10, now + 0.15);
        gainNode.gain.setValueAtTime(this.volume * 1.0, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        
        // Añadir chasquido de impacto de alta frecuencia
        const snapOsc = this.ctx.createOscillator();
        const snapGain = this.ctx.createGain();
        snapOsc.type = 'sawtooth';
        snapOsc.frequency.setValueAtTime(1000, now);
        snapOsc.frequency.exponentialRampToValueAtTime(100, now + 0.04);
        snapGain.gain.setValueAtTime(this.volume * 0.3, now);
        snapGain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
        snapOsc.connect(snapGain);
        snapGain.connect(this.ctx.destination);
        snapOsc.start(now);
        snapOsc.stop(now + 0.04);
        break;

      case 'kick':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.exponentialRampToValueAtTime(5, now + 0.25);
        gainNode.gain.setValueAtTime(this.volume * 1.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
        
        // Thud
        const thudOsc = this.ctx.createOscillator();
        const thudGain = this.ctx.createGain();
        thudOsc.type = 'triangle';
        thudOsc.frequency.setValueAtTime(200, now);
        thudOsc.frequency.exponentialRampToValueAtTime(50, now + 0.08);
        thudGain.gain.setValueAtTime(this.volume * 0.5, now);
        thudGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        thudOsc.connect(thudGain);
        thudGain.connect(this.ctx.destination);
        thudOsc.start(now);
        thudOsc.stop(now + 0.08);
        break;

      case 'hit':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.2);
        gainNode.gain.setValueAtTime(this.volume * 0.8, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;

      case 'block':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
        gainNode.gain.setValueAtTime(this.volume * 0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;

      case 'special_orsi':
      case 'special_lacalle':
        // Crecimiento de tono de súper habilidad
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.8);
        gainNode.gain.setValueAtTime(0.01, now);
        gainNode.gain.linearRampToValueAtTime(this.volume * 0.7, now + 0.2);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
        break;

      case 'fight':
        // Dos pitidos agudos estilo campana de pelea
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gainNode.gain.setValueAtTime(this.volume * 0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        
        const bell2 = this.ctx.createOscillator();
        const bell2Gain = this.ctx.createGain();
        bell2.type = 'sine';
        bell2.frequency.setValueAtTime(880, now + 0.15);
        bell2Gain.gain.setValueAtTime(this.volume * 0.4, now + 0.15);
        bell2Gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        bell2.connect(bell2Gain);
        bell2Gain.connect(this.ctx.destination);
        bell2.start(now + 0.15);
        bell2.stop(now + 0.45);
        break;

      case 'ko':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(40, now + 1.2);
        gainNode.gain.setValueAtTime(this.volume * 0.8, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
        osc.start(now);
        osc.stop(now + 1.2);
        break;

      case 'victory':
        // Fanfarria victoriosa simple
        const notes = [261.63, 329.63, 392.00, 523.25]; // Do, Mi, Sol, Do octava
        notes.forEach((freq, index) => {
          const noteOsc = this.ctx.createOscillator();
          const noteGain = this.ctx.createGain();
          noteOsc.type = 'triangle';
          noteOsc.frequency.setValueAtTime(freq, now + index * 0.15);
          noteGain.gain.setValueAtTime(this.volume * 0.5, now + index * 0.15);
          noteGain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.15 + 0.4);
          noteOsc.connect(noteGain);
          noteGain.connect(this.ctx.destination);
          noteOsc.start(now + index * 0.15);
          noteOsc.stop(now + index * 0.15 + 0.4);
        });
        break;

      default:
        break;
    }
  }
}

export default new AudioManager();
