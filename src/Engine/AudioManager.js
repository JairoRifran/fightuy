class AudioManager {
  constructor() {
    this.ctx = null;
    this.volume = 0.8;
    this.loadedBuffers = {};
    this.remoteBuffers = {};
    this.remoteAudioPending = new Set();
    this.isUnlocked = false;

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
}

export default new AudioManager();
