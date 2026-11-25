// Audio Synthesizer utilizing Web Audio API (No external MP3 files needed!)
class SoundController {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.isInitialized = false;
        this.bgmPlaying = false;
        this.bgmTimer = null;
        this.bgmStep = 0;
    }

    init() {
        if (this.isInitialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.isInitialized = true;
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        } catch (e) {
            console.warn('Web Audio API not supported on this browser', e);
        }
    }

    ensureContext() {
        if (!this.isInitialized) {
            this.init();
        } else if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopBgm();
        } else {
            this.startBgm();
        }
        return this.isMuted;
    }

    // Player shooting sound (classic 80s arcade laser)
    playLaser() {
        if (this.isMuted || !this.ctx) return;
        this.ensureContext();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.12);
    }

    // Enemy bullet sound
    playEnemyLaser() {
        if (this.isMuted || !this.ctx) return;
        this.ensureContext();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    // Explosion sound with noise buffer and resonant filter
    playExplosion(isLarge = false) {
        if (this.isMuted || !this.ctx) return;
        this.ensureContext();

        const duration = isLarge ? 0.6 : 0.25;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // Fill white noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        // Filter for deep rumble
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        const now = this.ctx.currentTime;
        filter.frequency.setValueAtTime(isLarge ? 400 : 800, now);
        filter.frequency.exponentialRampToValueAtTime(30, now + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(isLarge ? 0.35 : 0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(now);
        noise.stop(now + duration);
    }

    // Powerup pickup sound (Chime arpeggio)
    playPowerup() {
        if (this.isMuted || !this.ctx) return;
        this.ensureContext();

        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        const now = this.ctx.currentTime;

        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.05);

            gain.gain.setValueAtTime(0.18, now + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.05 + 0.15);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + idx * 0.05);
            osc.stop(now + idx * 0.05 + 0.15);
        });
    }

    // Shield deflect sound
    playShieldHit() {
        if (this.isMuted || !this.ctx) return;
        this.ensureContext();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    // Smart Bomb shockwave boom
    playBomb() {
        if (this.isMuted || !this.ctx) return;
        this.playExplosion(true);

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.8);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.8);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.8);
    }

    // Game Over sad minor sequence
    playGameOver() {
        if (this.isMuted || !this.ctx) return;
        this.ensureContext();

        const notes = [392.00, 369.99, 349.23, 293.66]; // G4, F#4, F4, D4
        const now = this.ctx.currentTime;

        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + idx * 0.18);

            gain.gain.setValueAtTime(0.18, now + idx * 0.18);
            gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.18 + 0.22);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + idx * 0.18);
            osc.stop(now + idx * 0.18 + 0.22);
        });
    }

    // Procedural Synthwave BGM Loop
    startBgm() {
        if (this.isMuted || this.bgmPlaying || !this.ctx) return;
        this.ensureContext();
        this.bgmPlaying = true;
        this.bgmStep = 0;

        const bassScale = [110, 110, 130.81, 146.83, 110, 110, 98, 87.31]; // A2, C3, D3, A2, G2, F2
        const tempoMs = 150;

        this.bgmTimer = setInterval(() => {
            if (!this.bgmPlaying || this.isMuted) return;

            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            const freq = bassScale[this.bgmStep % bassScale.length];
            this.bgmStep++;

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(450, now);
            filter.frequency.exponentialRampToValueAtTime(100, now + 0.12);

            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.14);
        }, tempoMs);
    }

    stopBgm() {
        this.bgmPlaying = false;
        if (this.bgmTimer) {
            clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
    }
}

window.soundController = new SoundController();
