export class Tachometer {
  constructor(containerEl, soundSynth) {
    this.container = containerEl;
    this.soundSynth = soundSynth;
    this.currentRpm = 950; // Idle RPM
    this.targetRpm = 950;
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="tacho-wrapper">
        <div class="tacho-dial">
          <svg viewBox="0 0 200 200" class="tacho-svg">
            <defs>
              <linearGradient id="rpmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#0C813D" />
                <stop offset="70%" stop-color="#ffd700" />
                <stop offset="100%" stop-color="#ff3344" />
              </linearGradient>
              <filter id="needleGlow">
                <feGaussianBlur stdDeviation="3" result="glow"/>
                <feMerge>
                  <feMergeNode in="glow"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            <!-- Outer Dial Track -->
            <circle cx="100" cy="100" r="82" class="tacho-track" />
            <!-- Active RPM Arc -->
            <path id="tachoProgress" class="tacho-arc" d="M 42 158 A 82 82 0 1 1 158 158" />
            
            <!-- Dial Marks -->
            ${this.renderTickMarks()}

            <!-- Center Cap -->
            <circle cx="100" cy="100" r="16" class="tacho-cap" />
            <circle cx="100" cy="100" r="8" fill="#0C813D" />

            <!-- Sweeping Needle -->
            <g id="tachoNeedleGroup" transform="rotate(-130, 100, 100)" filter="url(#needleGlow)">
              <line x1="100" y1="100" x2="100" y2="28" class="tacho-needle" />
            </g>
          </svg>

          <!-- Digital Readout Inside Gauge -->
          <div class="tacho-center-data">
            <div class="rpm-number" id="rpmDisplay">950</div>
            <div class="rpm-label">RPM × 1000</div>
            <div class="gear-tag" id="gearDisplay">GEAR 1</div>
          </div>
        </div>

        <!-- Specifications Counter Grid (from Valmora showcase) -->
        <div class="specs-ribbon">
          <div class="spec-card">
            <span class="spec-label">0 – 100 KM/H</span>
            <span class="spec-value" id="specAcc">3.6s</span>
          </div>
          <div class="spec-card">
            <span class="spec-label">TOP SPEED</span>
            <span class="spec-value" id="specSpeed">324 km/h</span>
          </div>
          <div class="spec-card">
            <span class="spec-label">DRY WEIGHT</span>
            <span class="spec-value" id="specWeight">1,180 kg</span>
          </div>
          <div class="spec-card">
            <span class="spec-label">PEAK POWER</span>
            <span class="spec-value" id="specPower">610 bhp</span>
          </div>
        </div>

        <!-- Interactive Throttle Pedal Trigger -->
        <div class="rev-control">
          <button id="revButton" class="btn-rev" title="Press and hold to rev the V8 engine">
            <span class="rev-icon">⚡</span>
            <span>HOLD TO REV V8 ENGINE</span>
          </button>
        </div>
      </div>
    `;

    this.needleGroup = this.container.querySelector('#tachoNeedleGroup');
    this.rpmDisplay = this.container.querySelector('#rpmDisplay');
    this.gearDisplay = this.container.querySelector('#gearDisplay');
    this.revBtn = this.container.querySelector('#revButton');

    this.bindEvents();
    this.animateLoop();
  }

  renderTickMarks() {
    let ticks = '';
    // 0 to 8 (each 1000 RPM) across an arc from -130 deg to +130 deg (260 deg range)
    for (let i = 0; i <= 8; i++) {
      const angle = -130 + (i / 8) * 260;
      const rad = (angle - 90) * (Math.PI / 180);
      const x1 = 100 + Math.cos(rad) * 78;
      const y1 = 100 + Math.sin(rad) * 78;
      const x2 = 100 + Math.cos(rad) * 68;
      const y2 = 100 + Math.sin(rad) * 68;
      
      const isRedline = i >= 6.5;
      const color = isRedline ? '#ff3344' : (i === 0 ? '#0C813D' : '#ffffff');
      
      const textX = 100 + Math.cos(rad) * 56;
      const textY = 100 + Math.sin(rad) * 56 + 4;
      ticks += `
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${i % 2 === 0 ? 2.5 : 1.5}" />
        <text x="${textX}" y="${textY}" class="dial-num ${isRedline ? 'redline' : ''}">${i}</text>
      `;
    }
    return ticks;
  }

  bindEvents() {
    let revving = false;
    let revInterval = null;

    const startRev = (e) => {
      e.preventDefault();
      revving = true;
      this.targetRpm = 7800;
      this.gearDisplay.textContent = 'SPORT MODE';
      this.gearDisplay.style.color = '#ff3344';
      if (this.soundSynth) this.soundSynth.startRev();
    };

    const stopRev = () => {
      if (!revving) return;
      revving = false;
      this.targetRpm = 950 + Math.random() * 80;
      this.gearDisplay.textContent = 'GEAR 1';
      this.gearDisplay.style.color = '#0C813D';
      if (this.soundSynth) this.soundSynth.stopRev();
    };

    this.revBtn.addEventListener('mousedown', startRev);
    window.addEventListener('mouseup', stopRev);
    this.revBtn.addEventListener('touchstart', startRev, { passive: false });
    window.addEventListener('touchend', stopRev);
  }

  updateFromScroll(scrollProgress) {
    // Tachometer stays at steady idle RPM and is NOT distorted by scroll or mouse
  }

  animateLoop() {
    requestAnimationFrame(() => this.animateLoop());

    // Smooth RPM interpolation
    this.currentRpm += (this.targetRpm - this.currentRpm) * 0.12;
    
    // Map RPM (0 to 8000) to needle angle (-130 to +130)
    const angle = -130 + (this.currentRpm / 8000) * 260;
    if (this.needleGroup) {
      this.needleGroup.setAttribute('transform', `rotate(${angle}, 100, 100)`);
    }

    if (this.rpmDisplay) {
      this.rpmDisplay.textContent = Math.round(this.currentRpm).toLocaleString();
    }
  }
}
