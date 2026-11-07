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
  if (canvasContainer) {
    canvasContainer.style.pointerEvents = 'auto';
  }

  // 2. Initialize Floating Real-Life Studio HUD (Specs & Anti-Scam Shield)
  const studioContainer = document.getElementById('realStudioContainer');
  const realStudioViewer = new RealStudioViewer(studioContainer, () => {
    scene3D.toggleBonnet();
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
      scene3D.setVehicleModel(
        selectedVehicle.brand, 
        selectedVehicle.model.id, 
        selectedVehicle.model.oemHex, 
        selectedVehicle.model
      );
    }
  });

  // Initial vehicle setup (Mercedes-Benz E350 W212 default)
  const initialVehicle = carSelector.getSelectedVehicle();
  if (realStudioViewer) {
    realStudioViewer.setVehicle(initialVehicle);
  }
  if (scene3D && initialVehicle.model) {
    scene3D.setVehicleModel(
      initialVehicle.brand, 
      initialVehicle.model.id, 
      initialVehicle.model.oemHex, 
      initialVehicle.model
    );
  }

  // 6. Initialize Smooth Inertia Scroll & GSAP ScrollTrigger
  const scrollController = new ScrollController(scene3D, tachometer);

  // 7. Initialize Motion Sensor & Wire Speedometer Sensation to 3D Scene
  const motionContainer = document.getElementById('motionSensorContainer');
  const motionSensor = new MotionSensor(motionContainer, (mode, speed, distance, gForce = 1.0) => {
    // 1. Live Speedometer Kinematics in 3D (wheel rotation, road stream, suspension heave, pothole shock)
    if (scene3D) {
      scene3D.setVehicleSpeed(speed, gForce);
    }
    // 2. Live Tachometer & Gearbox update
    if (tachometer) {
      tachometer.setSpeed(speed);
    }
    // 3. Audio acceleration & throttle drone
    if (soundSynth) {
      soundSynth.setSpeedAudio(speed);
    }
  });

  // 8. Initialize Real-Time Voice Perception & First Aid 3D Teleport
  const voiceContainer = document.getElementById('voiceDiagnosticContainer');
  const voiceDiagnostic = new VoiceDiagnostic(
    voiceContainer, 
    () => carSelector.getSelectedVehicle(),
    () => scene3D,
    () => realStudioViewer
  );

  // 9. Interactive 3D Bonnet & Camera Toolbar (Both floating toolbar and dedicated 3D section)
  const btnBonnet = document.getElementById('btnToggleBonnet');
  const bonnetText = document.getElementById('bonnetBtnText');
  const btnStageBonnet = document.getElementById('btnStageBonnet');
  const stageBonnetText = document.getElementById('stageBonnetText');

  const updateBonnetButtons = (isOpen) => {
    if (btnBonnet) btnBonnet.classList.toggle('active', isOpen);
    if (bonnetText) bonnetText.textContent = isOpen ? 'CLOSE BONNET' : 'OPEN BONNET (HOOD)';
    if (btnStageBonnet) btnStageBonnet.classList.toggle('active', isOpen);
    if (stageBonnetText) stageBonnetText.textContent = isOpen ? 'CLOSE BONNET (HOOD)' : 'OPEN BONNET (HOOD)';
  };

  if (btnBonnet) {
    btnBonnet.addEventListener('click', () => {
      const isOpen = scene3D.toggleBonnet();
      updateBonnetButtons(isOpen);
    });
  }

  if (btnStageBonnet) {
    btnStageBonnet.addEventListener('click', () => {
      const isOpen = scene3D.toggleBonnet();
      updateBonnetButtons(isOpen);
    });
  }

  const camButtons = document.querySelectorAll('.btn-cam-view:not(.btn-bonnet-action)');
  const stageButtons = document.querySelectorAll('.btn-stage-action[data-stage-view]');

  const handleCameraChange = (view) => {
    camButtons.forEach(b => b.classList.toggle('active', b.dataset.view === view));
    stageButtons.forEach(b => b.classList.toggle('active', b.dataset.stageView === view));

    if (view === 'engine') {
      scene3D.openBonnet(true);
      updateBonnetButtons(true);
      scene3D.setCameraView('engine');
    } else {
      scene3D.setCameraView(view);
      if (!scene3D.isBonnetOpen) {
        updateBonnetButtons(false);
      }
    }
  };

  camButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.view) handleCameraChange(btn.dataset.view);
    });
  });

  stageButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.stageView) handleCameraChange(btn.dataset.stageView);
    });
  });

  const btnRotate = document.getElementById('btnToggleRotate');
  const btnStageSpin = document.getElementById('btnStageSpin');

  const toggleSpin = () => {
    const active = scene3D.toggleAutoRotate();
    if (btnRotate) btnRotate.classList.toggle('active', active);
    if (btnStageSpin) btnStageSpin.classList.toggle('active', active);
  };

  if (btnRotate) btnRotate.addEventListener('click', toggleSpin);
  if (btnStageSpin) btnStageSpin.addEventListener('click', toggleSpin);

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

  console.log("AutoContentment 3D Real-Life Engine & Chassis Experience Ready.");
});
