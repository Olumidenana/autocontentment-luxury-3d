/**
 * RealStudioViewer
 * Lightweight Floating Automotive HUD for Real OEM Specifications & Scam Defense.
 * Integrates directly with Scene3D WebGL viewport so the 3D car, opening bonnet,
 * and 3D textured engine bay remain front and center.
 */

export class RealStudioViewer {
  constructor(containerEl, onBonnetToggleRequested) {
    this.container = containerEl;
    this.onBonnetToggleRequested = onBonnetToggleRequested;
    this.currentVehicle = null;
    this.activePin = null;

    this.pinDetails = {
      radiator: {
        id: 'radiator',
        name: 'Coolant Expansion Tank & Pressure Cap',
        icon: '🟡',
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
        icon: '🔴',
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
        icon: '🟡',
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
        icon: '🔵',
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
      <div class="real-studio-shell">
        <!-- Floating Top OEM Factory Finish Badge -->
        <div class="studio-top-controls">
          <div class="studio-oem-pill" id="studioOemPill">
            <span class="oem-dot" id="oemColorDot"></span>
            <span class="oem-text" id="oemColorText">OEM FACTORY FINISH</span>
          </div>
        </div>

        <!-- Floating Left Automotive Spec & Nigerian Anti-Scam Shield -->
        <div class="studio-badges-left">
          <div class="spec-card">
            <div class="spec-label">3D VEHICLE PROFILE</div>
            <div class="spec-value" id="realCarSpecText">Mercedes-Benz E350 (W212)</div>
          </div>
          <div class="scam-shield-card">
            <div class="shield-header">
              <span class="shield-icon">🛡️</span>
              <span>AUTOCONTENTMENT SCAM SHIELD</span>
            </div>
            <div class="shield-body" id="realCarScamText">Airmatic rear suspension level sensor charged as ₦1.2M blown airbag suspension</div>
          </div>
        </div>

        <!-- Floating Interactive Pin Modal (When Component is Inspected in 3D) -->
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
    `;

    this.bindEvents();
  }

  bindEvents() {
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
      specText.innerHTML = `<strong>${vehicle.year} ${model.name}</strong><br><span style="color:#BAC0C6; font-size:12px;">${model.engine}</span><br><span style="color:var(--color-primary); font-size:11px;">${model.spec || ''}</span>`;
    }

    // Update Scam Shield Warning
    const scamText = this.container.querySelector('#realCarScamText');
    if (scamText) {
      scamText.innerText = model.knownScams || "Verify all electronics and sensors before payment.";
    }

    // Close any open pin modal
    const modal = this.container.querySelector('#pinModal');
    if (modal) modal.style.display = 'none';
  }

  showPinDetail(pinId) {
    const detail = this.pinDetails[pinId];
    if (!detail) return;

    this.activePin = pinId;

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
    let targetPin = 'radiator';
    if (componentId.includes('battery')) targetPin = 'battery';
    else if (componentId.includes('oil')) targetPin = 'oil';
    else if (componentId.includes('brake')) targetPin = 'brake';
    else if (componentId.includes('radiator') || componentId.includes('coolant')) targetPin = 'radiator';

    this.showPinDetail(targetPin);
  }
}
