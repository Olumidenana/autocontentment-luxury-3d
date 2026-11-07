export class SoundSynth {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.isRevving = false;
    this.osc1 = null;
    this.osc2 = null;
    this.filter = null;
    this.gainNode = null;
  }

  initAudio() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(0.001, this.ctx.currentTime);

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(280, this.ctx.currentTime);
    this.filter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    // Primary V8 cylinder firing harmonic
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc1.frequency.setValueAtTime(42, this.ctx.currentTime);

    // Sub-harmonic throat rumble
    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'triangle';
    this.osc2.frequency.setValueAtTime(21, this.ctx.currentTime);

    this.osc1.connect(this.filter);
    this.osc2.connect(this.filter);
    this.filter.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);

    this.osc1.start();
    this.osc2.start();
    this.isPlaying = true;
  }

  startRev() {
    this.initAudio();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isRevving = true;
    const now = this.ctx.currentTime;

    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.linearRampToValueAtTime(0.28, now + 0.15);

    this.osc1.frequency.cancelScheduledValues(now);
    this.osc1.frequency.exponentialRampToValueAtTime(320, now + 0.7);

    this.osc2.frequency.cancelScheduledValues(now);
    this.osc2.frequency.exponentialRampToValueAtTime(160, now + 0.7);

    this.filter.frequency.cancelScheduledValues(now);
    this.filter.frequency.exponentialRampToValueAtTime(1800, now + 0.6);
  }

  stopRev() {
    if (!this.ctx || !this.isRevving) return;
    this.isRevving = false;
    const now = this.ctx.currentTime;

    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.linearRampToValueAtTime(0.015, now + 0.6);

    this.osc1.frequency.cancelScheduledValues(now);
    this.osc1.frequency.exponentialRampToValueAtTime(42, now + 0.8);

    this.osc2.frequency.cancelScheduledValues(now);
    this.osc2.frequency.exponentialRampToValueAtTime(21, now + 0.8);

    this.filter.frequency.cancelScheduledValues(now);
    this.filter.frequency.exponentialRampToValueAtTime(280, now + 0.7);
  }

  setSpeedAudio(speedKmh) {
    if (speedKmh <= 0.5) {
      if (this.ctx && this.isPlaying && !this.isRevving) {
        const now = this.ctx.currentTime;
        this.gainNode.gain.cancelScheduledValues(now);
        this.gainNode.gain.linearRampToValueAtTime(0.001, now + 0.5);
      }
      return;
    }

    this.initAudio();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.isRevving) return;

    const now = this.ctx.currentTime;
    const norm = Math.min(1.0, speedKmh / 140);
    const targetGain = 0.04 + norm * 0.16;
    const targetFreq1 = 45 + norm * 180;
    const targetFreq2 = 22 + norm * 90;
    const targetFilter = 320 + norm * 1200;

    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.linearRampToValueAtTime(targetGain, now + 0.1);

    this.osc1.frequency.cancelScheduledValues(now);
    this.osc1.frequency.linearRampToValueAtTime(targetFreq1, now + 0.1);

    this.osc2.frequency.cancelScheduledValues(now);
    this.osc2.frequency.linearRampToValueAtTime(targetFreq2, now + 0.1);

    this.filter.frequency.cancelScheduledValues(now);
    this.filter.frequency.linearRampToValueAtTime(targetFilter, now + 0.1);
  }
}
