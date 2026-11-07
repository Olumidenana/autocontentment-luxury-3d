import { Scene3D } from './components/scene3d.js';
import { Tachometer } from './components/tachometer.js';
import { SoundSynth } from './components/soundSynth.js';
import { ScrollController } from './components/scrollController.js';
import { VoiceDiagnostic } from './components/voiceDiagnostic.js';
import { CarSelector } from './components/carSelector.js';
import { MotionSensor } from './components/motionSensor.js';
import { RealStudioViewer } from './components/realStudioViewer.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize 3D WebGL Canvas
  const canvasContainer = document.getElementById('canvas-container');
  const scene3D = new Scene3D(canvasContainer);

  // 2. Initialize Photorealistic Real-Life Studio & Engine Inspector Overlay
  const studioContainer = document.getElementById('realStudioContainer');
  const webglOnlyTools = document.getElementById('webglOnlyTools');

  const realStudioViewer = new RealStudioViewer(studioContainer, (mode) => {
    console.log("Viewport mode changed to:", mode);
    // Sync all tab buttons across the UI
    document.querySelectorAll('.btn-studio-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });

    if (mode === 'webgl') {
      if (webglOnlyTools) webglOnlyTools.style.display = 'flex';
      canvasContainer.style.pointerEvents = 'auto';
    } else {
      if (webglOnlyTools) webglOnlyTools.style.display = 'none';
      canvasContainer.style.pointerEvents = 'none';
    }
  });

  // Sync toolbar buttons on bottom floating bar
  document.querySelectorAll('.camera-inspection-toolbar .btn-studio-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      realStudioViewer.setMode(mode);
    });
  });

  // 3. Initialize V8 Exhaust Note Synthesizer
  const soundSynth = new SoundSynth();

  // 4. Initialize Sweeping Tachometer Gauge
  const tachoContainer = document.getElementById('tachometerContainer');
  const tachometer = new Tachometer(tachoContainer, soundSynth);

  // 5. Initialize Car Model Selector HUD
  const selectorContainer = document.getElementById('vehicleSelectorContainer');
  const carSelector = new CarSelector(selectorContainer, (selectedVehicle) => {
    console.log("Selected vehicle changed:", selectedVehicle);
    if (realStudioViewer) {
      realStudioViewer.setVehicle(selectedVehicle);
    }
    if (scene3D && selectedVehicle.model) {
      scene3D.setVehicleModel(selectedVehicle.brand, selectedVehicle.model.id, selectedVehicle.model.oemHex);
    }
  });

  // Initial vehicle setup
  const initialVehicle = carSelector.getSelectedVehicle();
  if (realStudioViewer) {
    realStudioViewer.setVehicle(initialVehicle);
  }
  if (scene3D && initialVehicle.model) {
    scene3D.setVehicleModel(initialVehicle.brand, initialVehicle.model.id, initialVehicle.model.oemHex);
  }

  // 6. Initialize Smooth Inertia Scroll & GSAP ScrollTrigger
  const scrollController = new ScrollController(scene3D, tachometer);

  // 7. Initialize Motion Sensor (Human Walk/Run vs. Car In-Motion)
  const motionContainer = document.getElementById('motionSensorContainer');
  const motionSensor = new MotionSensor(motionContainer, (mode, speed, distance) => {
    console.log(`Motion Mode: ${mode}, Speed: ${speed.toFixed(1)} km/h, Distance: ${(distance/1000).toFixed(2)} km`);
  });

  // 8. Initialize Real-Time Voice Perception & First Aid 3D Teleport
  const voiceContainer = document.getElementById('voiceDiagnosticContainer');
  const voiceDiagnostic = new VoiceDiagnostic(
    voiceContainer, 
    () => carSelector.getSelectedVehicle(),
    () => scene3D,
    () => realStudioViewer
  );

  // 9. 3D Camera Inspection Toolbar Controls
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

  // 10. Atelier Paint Swatches (Real-Time 3D Color Change)
  const swatches = document.querySelectorAll('.paint-swatch');
  swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      swatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      const hex = parseInt(swatch.dataset.color, 16);
      scene3D.setCarPaint(hex);
    });
  });

  console.log("AutoContentment × Valmora Real-Life Studio & 3D Experience Initialized.");
});
