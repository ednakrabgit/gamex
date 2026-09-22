/**
 * QuizQuest - Web Audio Sound Engine
 * Procedural synthesizer for instant, zero-dependency, low-latency gaming sound effects.
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.bgmPlaying = false;
        this.bgmOscs = [];
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleSound() {
        this.enabled = !this.enabled;
        if (!this.enabled && this.bgmPlaying) {
            this.stopBGM();
        }
        return this.enabled;
    }

    playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.15, startTime = 0) {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

        gain.gain.setValueAtTime(gainVal, this.ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime + startTime);
        osc.stop(this.ctx.currentTime + startTime + duration);
    }

    playCorrect() {
        if (!this.enabled) return;
        // Major arpeggio chime (C5, E5, G5, C6)
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            this.playTone(freq, 'triangle', 0.25, 0.2, idx * 0.07);
        });
    }

    playWrong() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        // Low discord
        this.playTone(180, 'sawtooth', 0.25, 0.18, 0);
        this.playTone(140, 'sawtooth', 0.35, 0.2, 0.08);
    }

    playCombo(streak = 1) {
        if (!this.enabled) return;
        const baseFreq = 440 + Math.min(streak * 60, 600);
        this.playTone(baseFreq, 'sine', 0.18, 0.25, 0);
        this.playTone(baseFreq * 1.25, 'triangle', 0.22, 0.25, 0.06);
        this.playTone(baseFreq * 1.5, 'sine', 0.3, 0.3, 0.12);
    }

    playClick() {
        if (!this.enabled) return;
        this.playTone(600, 'sine', 0.05, 0.08);
    }

    playLifeline() {
        if (!this.enabled) return;
        // Magic shimmer
        [600, 800, 1000, 1200, 1500].forEach((freq, i) => {
            this.playTone(freq, 'sine', 0.15, 0.15, i * 0.04);
        });
    }

    playBossHit() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        // Punch / zap
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    playVictory() {
        if (!this.enabled) return;
        // Trumpet victory melody
        const melody = [
            { f: 523.25, d: 0.12, t: 0.0 },
            { f: 659.25, d: 0.12, t: 0.14 },
            { f: 783.99, d: 0.12, t: 0.28 },
            { f: 1046.50, d: 0.4, t: 0.42 },
            { f: 783.99, d: 0.15, t: 0.70 },
            { f: 1046.50, d: 0.6, t: 0.85 }
        ];
        melody.forEach(note => {
            this.playTone(note.f, 'triangle', note.d, 0.25, note.t);
        });
    }

    playGameOver() {
        if (!this.enabled) return;
        const notes = [440, 415, 392, 349];
        notes.forEach((freq, idx) => {
            this.playTone(freq, 'sawtooth', 0.3, 0.15, idx * 0.18);
        });
    }

    playTick() {
        if (!this.enabled) return;
        this.playTone(880, 'sine', 0.03, 0.05);
    }
}

window.soundEngine = new SoundEngine();
