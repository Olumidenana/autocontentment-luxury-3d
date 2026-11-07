import { Scene3D } from './components/scene3d.js';
import { Tachometer } from './components/tachometer.js';
import { SoundSynth } from './components/soundSynth.js';
import { ScrollController } from './components/scrollController.js';
import { VoiceDiagnostic } from './components/voiceDiagnostic.js';
import { CarSelector } from './components/carSelector.js';
import { MotionSensor } from './components/motionSensor.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize 3D WebGL Canvas
  const canvasContainer = document.getElementById('canvas-container');
  const scene3D = new Scene3D(canvasContainer);

  // 2. Initialize V8 Exhaust Note Synthesizer
  const soundSynth = new SoundSynth();

  // 3. Initialize Sweeping Valmora Tachometer Gauge
  const tachoContainer = document.getElementById('tachometerContainer');
  const tachometer = new Tachometer(tachoContainer, soundSynth);

  // 4. Initialize Car Model Selector HUD
  const selectorContainer = document.getElementById('vehicleSelectorContainer');
  const carSelector = new CarSelector(selectorContainer, (selectedVehicle) => {
    console.log("Selected vehicle changed:", selectedVehicle);
  });

  // 5. Initialize Smooth Inertia Scroll & GSAP ScrollTrigger
  const scrollController = new ScrollController(scene3D, tachometer);

  // 6. Initialize Motion Sensor (Human Walk/Run vs. Car In-Motion)
  const motionContainer = document.getElementById('motionSensorContainer');
  const motionSensor = new MotionSensor(motionContainer, (mode, speed, distance) => {
    console.log(`Motion Mode: ${mode}, Speed: ${speed.toFixed(1)} km/h, Distance: ${(distance/1000).toFixed(2)} km`);
  });

  // 7. Initialize Real-Time Voice Perception & Dynamic Scam Shield
  const voiceContainer = document.getElementById('voiceDiagnosticContainer');
  const voiceDiagnostic = new VoiceDiagnostic(voiceContainer, () => carSelector.getSelectedVehicle());

  // 7. 3D Camera Inspection Toolbar Controls
  const camButtons = document.querySelectorAll('.btn-cam-view');
  camButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view) {
        camButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        scene3D.setCameraView(view);
      }
    });
  });

  const btnRotate = document.getElementById('btnToggleRotate');
  if (btnRotate) {
    btnRotate.addEventListener('click', () => {
      const active = scene3D.toggleAutoRotate();
      btnRotate.classList.toggle('active', active);
    });
  }

  // 8. Atelier Paint Swatches (Real-Time 3D Color Change)
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
