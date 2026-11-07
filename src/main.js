import { Scene3D } from './components/scene3d.js';
import { Tachometer } from './components/tachometer.js';
import { SoundSynth } from './components/soundSynth.js';
import { ScrollController } from './components/scrollController.js';
import { VoiceDiagnostic } from './components/voiceDiagnostic.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize 3D WebGL Canvas
  const canvasContainer = document.getElementById('canvas-container');
  const scene3D = new Scene3D(canvasContainer);

  // 2. Initialize V8 Exhaust Note Synthesizer
  const soundSynth = new SoundSynth();

  // 3. Initialize Sweeping Valmora Tachometer Gauge
  const tachoContainer = document.getElementById('tachometerContainer');
  const tachometer = new Tachometer(tachoContainer, soundSynth);

  // 4. Initialize Smooth Inertia Scroll & GSAP ScrollTrigger
  const scrollController = new ScrollController(scene3D, tachometer);

  // 5. Initialize Real-Time Voice Perception & Scam Shield
  const voiceContainer = document.getElementById('voiceDiagnosticContainer');
  const voiceDiagnostic = new VoiceDiagnostic(voiceContainer);

  // 6. Atelier Paint Swatches (Real-Time 3D Color Change)
  const swatches = document.querySelectorAll('.paint-swatch');
  swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      swatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      const hex = parseInt(swatch.dataset.color, 16);
      scene3D.setCarPaint(hex);
    });
  });

  console.log("AutoContentment × Valmora 3D Experience Initialized Successfully.");
});
