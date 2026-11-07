/**
 * RealStudioViewer
 * Photorealistic Automotive Studio & Engine Bay Inspector
 * Renders authentic real-life photography, OEM factory paint finishes,
 * and interactive 2D/3D engine bay pins for Nigerian vehicle owners.
 */

export class RealStudioViewer {
  constructor(containerEl, onModeChanged) {
    this.container = containerEl;
    this.onModeChanged = onModeChanged;
    this.currentMode = 'studio'; // 'studio' | 'engine' | 'webgl'
    this.currentVehicle = null;
    this.activePin = null;

    this.pinDetails = {
      radiator: {
        id: 'radiator',
        name: 'Coolant Expansion Tank & Pressure Cap',
        category: 'Cooling System Triage',
        icon: '🟡',
        x: '48%',
        y: '22%',
        diyFeasible: 'CAUTION — REQUIRES 20-MIN COOL DOWN',
        diyBadgeClass: 'diy-caution',
        warning: 'CRITICAL PRECAUTION: Never unscrew the radiator cap or coolant tank while engine is at operating temperature. Boiling steam and antifreeze under 1.4 bar pressure will erupt and cause severe third-degree burns.',
        pidginWarning: 'KAPUT WARNING: No ever touch this radiator cover when motor hot! Wait 20 minutes make e cool down, else boiling water go spray your face.',
        steps: [
          'Wait 20 minutes until the top radiator hose feels soft and warm, not scalding hot.',
          'Wrap a thick towel around the cap and slowly rotate 1/4 turn to relieve residual vapor pressure.',
          'Fill transparent reservoir tank up to the MAX cold line with 50/50 coolant or clean distilled water.',
          'Start engine with cap OFF and heater on max to bleed trapped air bubbles.'
        ]
      },
      battery: {
        id: 'battery',
        name: '12V Heavy-Duty Starter Battery',
        category: 'Electrical & Ignition Triage',
        icon: '🔴',
        x: '78%',
        y: '38%',
        diyFeasible: 'YES — 100% ROADSIDE DIY FEASIBLE',
        diyBadgeClass: 'diy-yes',
        warning: 'PRECAUTION: Turn off key ignition completely. Never allow metal spanners or jump lead clamps to touch both the Positive (+) red post and car body metal simultaneously.',
        pidginWarning: 'PRECAUTION: Off key comot. When you dey tight wire, no let iron touch the Red head and the car body together, otherwise fire go spark heavy.',
        steps: [
          'Inspect the two lead terminals for white/blue powder (acid crust).',
          'Pour warm clean water over the terminals to instantly dissolve crust.',
          'Wiggle terminal clamps by hand; if loose, tighten with a 10mm spanner.',
          'If jump starting: RED lead to (+), BLACK lead to bare engine metal bracket.'
        ]
      },
      oil: {
        id: 'oil',
        name: 'Engine Oil Dipstick & Level Probe',
        category: 'Lubrication System Triage',
        icon: '🟡',
        x: '36%',
        y: '58%',
        diyFeasible: 'YES — 100% ROADSIDE DIY FEASIBLE',
        diyBadgeClass: 'diy-yes',
        warning: 'PRECAUTION: Park on flat, level ground. Wait at least 5 minutes after switching off engine so oil drains down into the oil pan for an accurate reading.',
        pidginWarning: 'PRECAUTION: Park motor for level ground. Off engine wait 5 minutes make oil gather for bottom before you pull the ring.',
        steps: [
          'Locate the brightly colored loop ring (yellow/orange) in the engine bay.',
          'Pull dipstick all the way out and wipe dry with a clean cloth or tissue.',
          'Re-insert dipstick fully into the tube, wait 3 seconds, and pull out again.',
          'Verify oil level sits between the MIN and MAX dimples. If below MIN, add 1 quart 5W-30 synthetic oil.'
        ]
      },
      brake: {
        id: 'brake',
        name: 'Brake Master Cylinder Fluid Reservoir',
        category: 'Hydraulic Braking Safety',
        icon: '🔵',
        x: '20%',
        y: '32%',
        diyFeasible: 'YES — TOP-UP ONLY (DO NOT DRIVE IF EMPTY)',
        diyBadgeClass: 'diy-caution',
        warning: 'CRITICAL PRECAUTION: If brake fluid is completely empty, air has entered hydraulic brake lines. DO NOT DRIVE the vehicle. Call a flatbed tow truck immediately.',
        pidginWarning: 'DANGER: If brake oil finish clean-clean for this plastic, brake no go hold at all! No drive am, call tow truck make dem carry am.',
        steps: [
          'Look through translucent side of reservoir without opening cap.',
          'Ensure amber fluid level is between MIN and MAX marks.',
          'Wipe cap clean of dirt before opening to avoid contaminating brake hydraulic seals.',
          'Only use factory-sealed DOT 4 synthetic brake fluid.'
        ]
      }
    };

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="real-studio-shell" id="studioShell">
        <!-- Floating View Switcher Bar -->
        <div class="studio-top-controls">
          <div class="studio-mode-pill">
            <button class="btn-studio-tab active" data-mode="studio" id="tabStudio">
              <span class="tab-icon">📸</span>
              <span>REAL-LIFE STUDIO</span>
            </button>
            <button class="btn-studio-tab" data-mode="engine" id="tabEngine">
              <span class="tab-icon">⚙️</span>
              <span>REAL ENGINE BAY</span>
            </button>
            <button class="btn-studio-tab" data-mode="webgl" id="tabWebGL">
              <span class="tab-icon">🌐</span>
              <span>3D WEBGL ORBIT</span>
            </button>
          </div>

          <div class="studio-oem-pill" id="studioOemPill">
            <span class="oem-dot" id="oemColorDot"></span>
            <span class="oem-text" id="oemColorText">OEM FACTORY FINISH</span>
          </div>
        </div>

        <!-- 1. REAL-LIFE CAR SHOWROOM VIEW -->
        <div class="studio-viewport-car" id="studioCarView">
          <div class="car-photo-wrapper">
            <div class="studio-spotlight"></div>
            <img class="real-car-img" id="realCarImg" src="" alt="Real Car Model" />
            <div class="studio-floor-reflection"></div>
          </div>

          <!-- Floating Automotive Spec & Anti-Scam Badges -->
          <div class="studio-badges-left">
            <div class="spec-card">
              <div class="spec-label">CHASSIS & POWERTRAIN</div>
              <div class="spec-value" id="realCarSpecText">Loading...</div>
            </div>
            <div class="scam-shield-card">
              <div class="shield-header">
                <span class="shield-icon">🛡️</span>
                <span>AUTOCONTENTMENT SCAM SHIELD</span>
              </div>
              <div class="shield-body" id="realCarScamText">Loading...</div>
            </div>
          </div>

          <div class="studio-actions-right">
            <button class="btn-action-primary" id="btnOpenEngineFromStudio">
              <span>⚙️ INSPECT ENGINE BAY & PINS</span>
            </button>
            <button class="btn-action-secondary" id="btnOrbit3DFromStudio">
              <span>🌐 SWITCH TO 3D WEBGL</span>
            </button>
          </div>
        </div>

        <!-- 2. REAL ENGINE BAY INSPECTOR VIEW -->
        <div class="studio-viewport-engine" id="studioEngineView" style="display: none;">
          <div class="engine-photo-wrapper">
            <img class="real-engine-img" id="realEngineImg" src="" alt="Real Engine Bay" />
            
            <!-- Interactive Diagnostic Beacon Pins -->
            <div class="engine-pin-hotspot" id="pinRadiator" style="left: 48%; top: 22%;" data-pin="radiator">
              <div class="pin-radar-ring"></div>
              <div class="pin-core pin-yellow">🟡</div>
              <div class="pin-label">RADIATOR / COOLANT</div>
            </div>

            <div class="engine-pin-hotspot" id="pinBattery" style="left: 78%; top: 38%;" data-pin="battery">
              <div class="pin-radar-ring"></div>
              <div class="pin-core pin-red">🔴</div>
              <div class="pin-label">12V BATTERY</div>
            </div>

            <div class="engine-pin-hotspot" id="pinOil" style="left: 36%; top: 58%;" data-pin="oil">
              <div class="pin-radar-ring"></div>
              <div class="pin-core pin-yellow">🟡</div>
              <div class="pin-label">OIL DIPSTICK</div>
            </div>

            <div class="engine-pin-hotspot" id="pinBrake" style="left: 20%; top: 32%;" data-pin="brake">
              <div class="pin-radar-ring"></div>
              <div class="pin-core pin-blue">🔵</div>
              <div class="pin-label">BRAKE FLUID</div>
            </div>
          </div>

          <!-- Interactive Modal / Card for Active Pin -->
          <div class="engine-pin-modal" id="pinModal" style="display: none;">
            <div class="pin-modal-header">
              <div class="pin-modal-title" id="pinModalTitle">Component</div>
              <button class="btn-pin-close" id="btnClosePinModal">✕</button>
            </div>
            <div class="pin-modal-badge" id="pinModalBadge">FEASIBILITY</div>
            <div class="pin-modal-warning" id="pinModalWarning">Warning</div>
            <div class="pin-modal-steps" id="pinModalSteps">Steps</div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Mode switcher buttons
    const tabs = this.container.querySelectorAll('.btn-studio-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        this.setMode(mode);
      });
    });

    // Shortcuts from studio view
    const btnOpenEngine = this.container.querySelector('#btnOpenEngineFromStudio');
    if (btnOpenEngine) {
      btnOpenEngine.addEventListener('click', () => this.setMode('engine'));
    }

    const btnOrbit3D = this.container.querySelector('#btnOrbit3DFromStudio');
    if (btnOrbit3D) {
      btnOrbit3D.addEventListener('click', () => this.setMode('webgl'));
    }

    // Interactive Engine Pins
    const pins = this.container.querySelectorAll('.engine-pin-hotspot');
    pins.forEach(pin => {
      pin.addEventListener('click', (e) => {
        e.stopPropagation();
        const pinId = pin.dataset.pin;
        this.showPinDetail(pinId);
      });
    });

    const btnCloseModal = this.container.querySelector('#btnClosePinModal');
    if (btnCloseModal) {
      btnCloseModal.addEventListener('click', () => {
        const modal = this.container.querySelector('#pinModal');
        if (modal) modal.style.display = 'none';
      });
    }
  }

  setVehicle(vehicle) {
    this.currentVehicle = vehicle;
    const model = vehicle.model;
    if (!model) return;

    // Update Real Car Image
    const carImg = this.container.querySelector('#realCarImg');
    if (carImg) {
      carImg.src = model.image || '/images/cars/mercedes_e350.jpg';
      carImg.alt = `${vehicle.year} ${model.name}`;
    }

    // Update Real Engine Image
    const engineImg = this.container.querySelector('#realEngineImg');
    if (engineImg) {
      engineImg.src = model.engineImage || '/images/engines/engine_mercedes_v6.jpg';
      engineImg.alt = `${model.engine} Engine Bay`;
    }

    // Update OEM Factory Color Pill
    const oemDot = this.container.querySelector('#oemColorDot');
    const oemText = this.container.querySelector('#oemColorText');
    if (oemDot && oemText) {
      const hexStr = model.oemHex !== undefined ? '#' + model.oemHex.toString(16).padStart(6, '0') : '#BAC0C6';
      oemDot.style.backgroundColor = hexStr;
      oemDot.style.boxShadow = `0 0 10px ${hexStr}`;
      oemText.innerHTML = `<strong>FACTORY FINISH:</strong> ${model.oemColor || 'Iridium Silver Metallic'}`;
    }

    // Update Specification HUD
    const specText = this.container.querySelector('#realCarSpecText');
    if (specText) {
      specText.innerHTML = `<strong>${vehicle.year} ${model.name}</strong><br><span style="color:#BAC0C6">${model.engine}</span><br><span style="color:var(--color-primary); font-size:11px;">${model.spec || ''}</span>`;
    }

    // Update Scam Shield Warning
    const scamText = this.container.querySelector('#realCarScamText');
    if (scamText) {
      scamText.innerText = model.knownScams || "Verify all electronics and sensors before payment.";
    }

    // Hide pin modal if changing car
    const modal = this.container.querySelector('#pinModal');
    if (modal) modal.style.display = 'none';
  }

  setMode(mode) {
    this.currentMode = mode;

    // Update active tab button
    const tabs = this.container.querySelectorAll('.btn-studio-tab');
    tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));

    const shell = this.container.querySelector('#studioShell');
    const carView = this.container.querySelector('#studioCarView');
    const engineView = this.container.querySelector('#studioEngineView');

    if (mode === 'studio') {
      shell.classList.remove('mode-webgl-transparent');
      carView.style.display = 'flex';
      engineView.style.display = 'none';
    } else if (mode === 'engine') {
      shell.classList.remove('mode-webgl-transparent');
      carView.style.display = 'none';
      engineView.style.display = 'flex';
    } else if (mode === 'webgl') {
      // Allow 3D WebGL Three.js canvas in background to be fully seen and interacted with
      shell.classList.add('mode-webgl-transparent');
      carView.style.display = 'none';
      engineView.style.display = 'none';
    }

    if (this.onModeChanged) {
      this.onModeChanged(mode);
    }
  }

  showPinDetail(pinId) {
    const detail = this.pinDetails[pinId];
    if (!detail) return;

    this.activePin = pinId;

    // Highlight the active pin hotspot
    this.container.querySelectorAll('.engine-pin-hotspot').forEach(p => {
      p.classList.toggle('active-pin', p.dataset.pin === pinId);
    });

    const modal = this.container.querySelector('#pinModal');
    const title = this.container.querySelector('#pinModalTitle');
    const badge = this.container.querySelector('#pinModalBadge');
    const warning = this.container.querySelector('#pinModalWarning');
    const steps = this.container.querySelector('#pinModalSteps');

    if (modal && title && badge && warning && steps) {
      title.innerHTML = `${detail.icon} ${detail.name}`;
      badge.className = `pin-modal-badge ${detail.diyBadgeClass}`;
      badge.innerText = detail.diyFeasible;
      warning.innerHTML = `<strong>⚠️ ${detail.warning}</strong><br><span style="color: #94a3b8; font-size: 11px;">🇳🇬 Pidgin: ${detail.pidginWarning}</span>`;
      steps.innerHTML = `
        <div style="font-weight: 700; color: #f8fafc; margin-bottom: 6px;">ROADSIDE FIRST-AID ACTION:</div>
        <ol style="margin-left: 18px; line-height: 1.6; color: #e2e8f0; font-size: 12px;">
          ${detail.steps.map(s => `<li>${s}</li>`).join('')}
        </ol>
      `;
      modal.style.display = 'block';
    }
  }

  triggerFirstAidHighlight(componentId) {
    // Switch to engine view and display the specific pin
    this.setMode('engine');
    let targetPin = 'radiator';
    if (componentId.includes('battery')) targetPin = 'battery';
    else if (componentId.includes('oil')) targetPin = 'oil';
    else if (componentId.includes('brake')) targetPin = 'brake';
    else if (componentId.includes('radiator') || componentId.includes('coolant')) targetPin = 'radiator';

    setTimeout(() => {
      this.showPinDetail(targetPin);
    }, 200);
  }
}
