import { Scene3D } from './components/scene3d.js';
import { Tachometer } from './components/tachometer.js';
import { SoundSynth } from './components/soundSynth.js';
import { VoiceDiagnostic } from './components/voiceDiagnostic.js';
import { CarSelector } from './components/carSelector.js';
import { MotionSensor } from './components/motionSensor.js';

// ─── Multi-Page Router ────────────────────────────────────────────────────────
const PAGES = ['home', 'studio-3d', 'voice-triage', 'kinematics', 'atelier', 'booking'];
let activePageId = 'home';
let scene3D = null;

function showPage(pageId) {
  if (!PAGES.includes(pageId)) return;
  activePageId = pageId;

  // 1. Show only the targeted page section
  PAGES.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.toggle('active-page', id === pageId);
    }
  });

  // 2. Update active link in top navbar
  document.querySelectorAll('.nav-link').forEach(link => {
    const target = link.getAttribute('href')?.replace('#', '');
    link.classList.toggle('active', target === pageId);
  });

  // 3. Close mobile hamburger menu
  const navLinks = document.getElementById('navLinks');
  const hamburger = document.getElementById('hamburgerBtn');
  if (navLinks && hamburger) {
    navLinks.classList.remove('mobile-open');
    hamburger.classList.remove('open');
  }

  // 4. If navigating to 3D Studio, ensure Three.js canvas resizes to the container immediately
  if (pageId === 'studio-3d' && scene3D) {
    requestAnimationFrame(() => {
      scene3D.handleResize();
    });
    setTimeout(() => {
      if (scene3D) scene3D.handleResize();
    }, 100);
  }

  // 5. Update browser history/hash without jumping scroll
  if (window.location.hash !== `#${pageId}`) {
    history.pushState(null, '', `#${pageId}`);
  }
}

function handleHashChange() {
  const hash = window.location.hash.replace('#', '') || 'home';
  if (PAGES.includes(hash)) {
    showPage(hash);
  }
}

document.addEventListener('DOMContentLoaded', () => {

  // ─── 1. Hamburger Navigation for Mobile ────────────────────────────────────
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const navLinks = document.getElementById('navLinks');
  if (hamburgerBtn && navLinks) {
    hamburgerBtn.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('mobile-open');
      hamburgerBtn.classList.toggle('open', isOpen);
    });
  }

  // Nav link click events
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const pageId = link.getAttribute('href')?.replace('#', '');
      if (pageId) showPage(pageId);
    });
  });

  // Cross-page CTA links
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    if (!link.classList.contains('nav-link')) {
      link.addEventListener('click', (e) => {
        const pageId = link.getAttribute('href')?.replace('#', '');
        if (pageId && PAGES.includes(pageId)) {
          e.preventDefault();
          showPage(pageId);
        }
      });
    }
  });

  // ─── 2. Initialize V8 Exhaust Sound Synthesizer ────────────────────────────
  const soundSynth = new SoundSynth();

  // ─── 3. Initialize Tachometer ──────────────────────────────────────────────
  const tachoContainer = document.getElementById('tachometerContainer');
  const tachometer = new Tachometer(tachoContainer, soundSynth);

  // ─── 4. Initialize 3D WebGL Canvas in Dedicated Studio ─────────────────────
  const canvasContainer = document.getElementById('canvas-container');
  if (canvasContainer) {
    scene3D = new Scene3D(canvasContainer);
    canvasContainer.style.pointerEvents = 'auto';
  }

  // ─── 5. Initialize Vehicle Selector (24+ Models across 5 Brands) ───────────
  const updateSpecCards = (vehicle) => {
    if (!vehicle || !vehicle.model) return;
    const model = vehicle.model;
    const spec = model.spec || '';
    const parts = spec.split('•').map(s => s.trim());
    const powerPart = parts.find(p => p.includes('bhp') || p.includes('hp')) || '612 bhp';
    const speedPart = parts.find(p => p.includes('km/h') || p.includes('mph')) || '320 km/h';
    const accelPart = parts.find(p => p.includes('s') && (p.includes('.') || p.includes('0–'))) || '3.45s';

    const setEl = (id, text) => {
      const el = document.getElementById(id);
      if (el && text) el.textContent = text;
    };

    setEl('homeSpecEngine', model.engine?.split('(')[0]?.trim() || model.engine);
    setEl('homeSpecPower', powerPart);
    setEl('homeSpecSpeed', speedPart);
    setEl('homeSpecAccel', accelPart);

    // Update Studio Car Label in bottom bar
    const studioLabel = document.getElementById('studioCarLabel');
    if (studioLabel) {
      studioLabel.textContent = `${vehicle.brandName || ''} ${model.name || ''}`.trim();
    }
  };

  const selectorContainer = document.getElementById('vehicleSelectorContainer');
  const carSelector = new CarSelector(selectorContainer, (selectedVehicle) => {
    console.log("Selected vehicle changed:", selectedVehicle);
    updateSpecCards(selectedVehicle);

    if (scene3D && selectedVehicle.model) {
      scene3D.setVehicleModel(
        selectedVehicle.brand,
        selectedVehicle.model.id,
        selectedVehicle.model.oemHex,
        selectedVehicle.model
      );
    }
  });

  // Apply default selected vehicle on load (Ferrari Portofino GT Sports Car)
  const initialVehicle = carSelector.getSelectedVehicle();
  updateSpecCards(initialVehicle);
  if (scene3D && initialVehicle?.model) {
    scene3D.setVehicleModel(
      initialVehicle.brand,
      initialVehicle.model.id,
      initialVehicle.model.oemHex,
      initialVehicle.model
    );
  }

  // ─── 6. 3D Studio Controls ────────────────────────────────────────────────
  const btnBonnet = document.getElementById('btnToggleBonnet');
  const bonnetText = document.getElementById('bonnetBtnText');

  const updateBonnetButtons = (isOpen) => {
    if (btnBonnet) btnBonnet.classList.toggle('active', isOpen);
    if (bonnetText) bonnetText.textContent = isOpen ? 'CLOSE BONNET' : 'OPEN BONNET (HOOD)';
  };

  if (btnBonnet) {
    btnBonnet.addEventListener('click', () => {
      if (scene3D) {
        const isOpen = scene3D.toggleBonnet();
        updateBonnetButtons(isOpen);
      }
    });
  }

  // Camera viewpoints in studio
  const studioViewButtons = document.querySelectorAll('.btn-studio-action[data-view]');
  const handleStudioCameraChange = (view) => {
    studioViewButtons.forEach(b => b.classList.toggle('active', b.dataset.view === view));

    if (!scene3D) return;

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

  studioViewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.view) handleStudioCameraChange(btn.dataset.view);
    });
  });

  // Reset Assembly Button (SolidWorks CAD Reseat)
  const btnReset = document.getElementById('btnStageReset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (scene3D) {
        scene3D.resetAllSeparations();
        updateBonnetButtons(false);
        handleStudioCameraChange('exterior');
      }
    });
  }

  // 360 Spin Toggle
  const btnSpin = document.getElementById('btnToggleRotate');
  if (btnSpin) {
    btnSpin.addEventListener('click', () => {
      if (scene3D) {
        const active = scene3D.toggleAutoRotate();
        btnSpin.classList.toggle('active', active);
      }
    });
  }

  // Studio compact paint swatches in bottom bar
  const studioSwatches = document.querySelectorAll('.studio-swatch');
  studioSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      studioSwatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      const hex = parseInt(swatch.dataset.color, 16);
      if (scene3D) scene3D.setCarPaint(hex);
    });
  });

  // Full Atelier paint swatches
  const atelierSwatches = document.querySelectorAll('.paint-swatch');
  atelierSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      atelierSwatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      const hex = parseInt(swatch.dataset.color, 16);
      if (scene3D) scene3D.setCarPaint(hex);

      // Sync studio swatch
      studioSwatches.forEach(s => {
        const c = parseInt(s.dataset.color, 16);
        s.classList.toggle('active', c === hex);
      });
    });
  });

  // ─── 7. Kinematics & Speedometer Sensation ─────────────────────────────────
  const motionContainer = document.getElementById('motionSensorContainer');
  const motionSensor = new MotionSensor(motionContainer, (mode, speed, distance, gForce = 1.0) => {
    if (scene3D) scene3D.setVehicleSpeed(speed, gForce);
    if (tachometer) tachometer.setSpeed(speed);
    if (soundSynth) soundSynth.setSpeedAudio(speed);
  }, () => carSelector.getSelectedVehicle());

  // ─── 8. Voice Diagnostic & First Aid Responder ────────────────────────────
  const voiceContainer = document.getElementById('voiceDiagnosticContainer');
  let voiceDiagnostic = null;
  if (voiceContainer) {
    voiceDiagnostic = new VoiceDiagnostic(
      voiceContainer,
      () => carSelector.getSelectedVehicle(),
      () => scene3D,
      () => null
    );
  }

  // Direct 3D Raycast First-Aid Click listener
  window.addEventListener('firstAidTriageTriggered', (e) => {
    updateBonnetButtons(true);
    if (voiceDiagnostic && voiceDiagnostic.focusComponent) {
      voiceDiagnostic.focusComponent(e.detail.componentId);
    }
  });

  // ─── 9. Handle Browser Popstate & Hash Navigation ─────────────────────────
  window.addEventListener('popstate', handleHashChange);
  handleHashChange();

  console.log("AutoContentment Multi-Page 3D Experience Initialized Successfully.");
});
