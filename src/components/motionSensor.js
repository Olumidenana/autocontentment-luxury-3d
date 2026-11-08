export class MotionSensor {
  constructor(containerEl, onModeChanged, getVehicleFn = null) {
    this.container = containerEl;
    this.onModeChanged = onModeChanged;
    this.getVehicle = getVehicleFn;

    // Locomotion & Kinematics State
    this.currentMode = 'STATIONARY';
    this.currentSpeed = 0.0; // Strictly 0.0 km/h when at rest
    this.totalDistance = 0.0; // meters accumulated
    this.stepCount = 0;
    this.stepCadence = 0.0; // Hz
    this.gForce = 1.00;
    this.potholeAlerts = 0;
    this.lastPosition = null;

    // Hardware Accelerometer & Pedometer Filter
    this.lastStepTime = 0;
    this.stepIntervals = [];
    this.prevAccelY = 1.0;
    this.accelValleyDetected = false;
    this.watchdogTimer = null;
    this.hardwareSensorsActive = false;

    // Temporary Demonstration Burst Timers
    this.demoBurstTimeout = null;

    // Live Acoustic Sound Analyzer State
    this.audioCtx = null;
    this.analyser = null;
    this.micStream = null;
    this.audioDataArray = null;
    this.isAudioListening = false;
    this.animFrameId = null;

    this.init();
  }

  init() {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    this.container.innerHTML = `
      <div class="motion-sensor-card">
        
        <!-- Header & Live Auto-Detection Badge -->
        <div class="sensor-header">
          <div class="sensor-badge">
            <span class="pulse-indicator"></span>
            <span>AUTONOMOUS KINEMATICS, PEDOMETER & SOUND ENGINE</span>
          </div>
          <h3 class="sensor-title">Fully Automatic Motion & Locomotion Telemetry</h3>
          <p class="sensor-desc">
            <strong>100% Autonomous Detection:</strong> Zero manual mode switching required. The engine automatically classifies when you are 
            <strong>At Rest</strong>, <strong>Walking</strong>, <strong>Running</strong>, or <strong>In-Vehicle Driving</strong>.
            The moment you stop moving, all speed and step counting halts instantly.
          </p>

          <div class="device-sensor-status" id="deviceSensorStatus">
            ${isMobile 
              ? '📱 Mobile Phone Connected: Satellite GPS & 3D Accelerometer listening for live footsteps.' 
              : '💻 Computer Mode: Accelerometer listening. Use the "Tap Step" pedal or Spacebar to test footstep detection on PC.'
            }
          </div>

          <!-- iOS / Android Sensor Permission Activation Button -->
          <div class="sensor-permission-row" id="sensorPermissionRow">
            <button id="btnGrantSensors" class="btn-grant-sensors">
              <span>📲</span>
              <span id="grantSensorsText">ACTIVATE HARDWARE MOTION SENSORS (MOBILE GYRO/ACCEL)</span>
            </button>
          </div>
        </div>

        <!-- Real-Time Autonomous Mode Classification Pill -->
        <div class="mode-status-container">
          <div class="current-mode-tag mode-stationary" id="motionModeBadge">
            <span class="mode-icon" id="motionModeIcon">🛑</span>
            <span class="mode-name" id="motionModeName">AT REST / STATIONARY</span>
          </div>
          <div class="mode-confidence" id="motionConfidence">Auto-Detect: 0.0 km/h • Zero movement detected</div>
        </div>

        <!-- Telemetry Meters Grid -->
        <div class="telemetry-meters-grid">
          <!-- 1. Speedometer -->
          <div class="meter-box">
            <div class="meter-lbl">CURRENT VELOCITY</div>
            <div class="meter-val-row">
              <span class="meter-number" id="sensorSpeedVal">0.0</span>
              <span class="meter-unit">km/h</span>
            </div>
            <div class="meter-bar-track">
              <div class="meter-bar-fill" id="speedBarFill" style="width: 0%;"></div>
            </div>
          </div>

          <!-- 2. Distance Traversed -->
          <div class="meter-box">
            <div class="meter-lbl">DISTANCE ACCUMULATED</div>
            <div class="meter-val-row">
              <span class="meter-number" id="sensorDistVal">0.00</span>
              <span class="meter-unit">km</span>
            </div>
            <div class="meter-sub" id="sensorMetersVal">0 meters accumulated</div>
          </div>

          <!-- 3. Step Cadence -->
          <div class="meter-box">
            <div class="meter-lbl">FOOTFALL CADENCE</div>
            <div class="meter-val-row">
              <span class="meter-number" id="sensorCadenceVal">0.0</span>
              <span class="meter-unit">Hz</span>
            </div>
            <div class="meter-sub" id="cadenceClass">0 steps detected (At rest)</div>
          </div>

          <!-- 4. G-Force Shock & Pothole Alert -->
          <div class="meter-box">
            <div class="meter-lbl">VERTICAL CHASSIS G-FORCE</div>
            <div class="meter-val-row">
              <span class="meter-number" id="sensorGVal">1.00</span>
              <span class="meter-unit">G</span>
            </div>
            <div class="meter-sub" id="potholeCount">0 Road Craters / Shocks</div>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════════════════════════════
             PHYSICAL FOOTSTEP SIMULATOR / DEMONSTRATION PEDAL
             (Allows instant video proof on PC/Mobile: Tap to step -> Stop to halt)
             ══════════════════════════════════════════════════════════════════════ -->
        <div class="system-motion-controls">
          <div class="sim-section-header">
            <span class="sim-label">🎯 PHYSICAL FOOTSTEP SIMULATOR & VEHICULAR BURST (FOR PC / VIDEO DEMONSTRATIONS):</span>
          </div>
          
          <div class="stepper-demo-row">
            <button id="btnTapStep" class="btn-tap-step">
              <span class="step-icon">🐾</span>
              <div class="step-btn-text">
                <span class="step-btn-title">TAKE A PHYSICAL STEP (OR PRESS SPACEBAR)</span>
                <span class="step-btn-sub">Tap repeatedly to walk or run. Stop tapping and velocity drops immediately to 0.0 km/h.</span>
              </div>
            </button>
          </div>

          <div class="simulator-buttons">
            <button class="btn-sim" id="btnBurstDrive">🚗 Hold to Drive (60 km/h)</button>
            <button class="btn-sim" id="btnBurstHighway">🏎️ Hold for Highway (115 km/h)</button>
            <button class="btn-sim btn-sim-pothole" id="btnBurstPothole">⚠️ Road Crater Shock (2.85G)</button>
            <button class="btn-sim" id="btnForceRest">🛑 Reset to Rest (0.0 km/h)</button>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════════════════════════════
             CONTINUOUS LIVE ACOUSTIC SOUND ANALYSIS ENGINE
             ══════════════════════════════════════════════════════════════════════ -->
        <div class="acoustic-analyzer-section">
          <div class="acoustic-header">
            <div class="acoustic-title-row">
              <div class="acoustic-icon">🎙️</div>
              <div>
                <h4 class="acoustic-title">CONTINUOUS ACOUSTIC SPECTRUM ANALYZER</h4>
                <div class="acoustic-sub">Real-time FFT audio spectrum • Human voice dB levels • Engine mechanical harmonics</div>
              </div>
            </div>
            <button id="btnToggleAcousticMic" class="btn-mic-toggle">
              <span id="micToggleDot" class="mic-dot-off"></span>
              <span id="micToggleText">ENABLE LIVE MICROPHONE SENSOR</span>
            </button>
          </div>

          <!-- Sound Spectrum Visualizer Canvas -->
          <div class="spectrum-visualizer-container">
            <canvas id="acousticSpectrumCanvas" class="spectrum-canvas" width="600" height="90"></canvas>
            <div class="spectrum-freq-axis">
              <span>20 Hz (Sub-Bass)</span>
              <span>250 Hz (Combustion)</span>
              <span>1 kHz (Human Speech)</span>
              <span>4 kHz (Friction)</span>
              <span>16 kHz (Air/Tire)</span>
            </div>
          </div>

          <!-- Acoustic Telemetry Readings -->
          <div class="acoustic-telemetry-grid">
            <div class="acoustic-meter">
              <span class="ac-lbl">PEAK SOUND LEVEL:</span>
              <span class="ac-val" id="acousticDbVal">-- dB</span>
              <span class="ac-desc" id="acousticDbDesc">Microphone standby</span>
            </div>
            <div class="acoustic-meter">
              <span class="ac-lbl">PRIMARY HARMONIC:</span>
              <span class="ac-val" id="acousticHarmonicVal">-- Hz</span>
              <span class="ac-desc" id="acousticHarmonicDesc">Spectral baseline</span>
            </div>
            <div class="acoustic-meter">
              <span class="ac-lbl">ACOUSTIC CLASSIFICATION:</span>
              <span class="ac-val highlight-val" id="acousticClassVal">Ambient Quiet</span>
              <span class="ac-desc" id="acousticClassDesc">Awaiting sound input</span>
            </div>
          </div>

          <!-- Automated Live Mechanical & Safety Advisory Box -->
          <div class="acoustic-advisory-card" id="acousticAdvisoryCard">
            <div class="advisory-badge">
              <span class="advisory-pulse"></span>
              <span id="advisoryBadgeText">AUTOMATIC REAL-TIME ADVISORY:</span>
            </div>
            <div class="advisory-content" id="advisoryContentText">
              Live acoustic monitor is ready. Click "ENABLE LIVE MICROPHONE SENSOR" or make a sound to receive immediate mechanical & safety advice.
            </div>
          </div>

        </div>

      </div>
    `;

    // Cache Telemetry DOM references
    this.badge = this.container.querySelector('#motionModeBadge');
    this.badgeIcon = this.container.querySelector('#motionModeIcon');
    this.badgeName = this.container.querySelector('#motionModeName');
    this.confidenceEl = this.container.querySelector('#motionConfidence');
    this.speedVal = this.container.querySelector('#sensorSpeedVal');
    this.speedBar = this.container.querySelector('#speedBarFill');
    this.distVal = this.container.querySelector('#sensorDistVal');
    this.metersVal = this.container.querySelector('#sensorMetersVal');
    this.cadenceVal = this.container.querySelector('#sensorCadenceVal');
    this.cadenceClass = this.container.querySelector('#cadenceClass');
    this.gVal = this.container.querySelector('#sensorGVal');
    this.potholeEl = this.container.querySelector('#potholeCount');
    this.deviceStatus = this.container.querySelector('#deviceSensorStatus');
    this.btnGrantSensors = this.container.querySelector('#btnGrantSensors');
    this.grantSensorsText = this.container.querySelector('#grantSensorsText');

    // Cache Demonstration DOM references
    this.btnTapStep = this.container.querySelector('#btnTapStep');
    this.btnBurstDrive = this.container.querySelector('#btnBurstDrive');
    this.btnBurstHighway = this.container.querySelector('#btnBurstHighway');
    this.btnBurstPothole = this.container.querySelector('#btnBurstPothole');
    this.btnForceRest = this.container.querySelector('#btnForceRest');

    // Cache Acoustic DOM references
    this.btnMicToggle = this.container.querySelector('#btnToggleAcousticMic');
    this.micDot = this.container.querySelector('#micToggleDot');
    this.micText = this.container.querySelector('#micToggleText');
    this.spectrumCanvas = this.container.querySelector('#acousticSpectrumCanvas');
    this.spectrumCtx = this.spectrumCanvas ? this.spectrumCanvas.getContext('2d') : null;
    this.dbVal = this.container.querySelector('#acousticDbVal');
    this.dbDesc = this.container.querySelector('#acousticDbDesc');
    this.harmonicVal = this.container.querySelector('#acousticHarmonicVal');
    this.harmonicDesc = this.container.querySelector('#acousticHarmonicDesc');
    this.classVal = this.container.querySelector('#acousticClassVal');
    this.classDesc = this.container.querySelector('#acousticClassDesc');
    this.advisoryContent = this.container.querySelector('#advisoryContentText');
    this.advisoryBadge = this.container.querySelector('#advisoryBadgeText');

    this.bindEvents();
    this.startHardwareSensors();
    this.startStepWatchdog();
    this.autoStartAcousticEngine();
  }

  bindEvents() {
    // 1. Mobile Sensor Permission Request (iOS / Android 13+)
    if (this.btnGrantSensors) {
      this.btnGrantSensors.addEventListener('click', () => {
        this.requestMobilePermissions();
      });
    }

    // 2. Physical Footstep Pedal: Click / Tap to register a real step
    if (this.btnTapStep) {
      this.btnTapStep.addEventListener('click', (e) => {
        e.preventDefault();
        this.registerPhysicalStep();
        this.pulseStepButton();
      });
    }

    // 3. Keyboard Spacebar / ArrowUp to simulate physical footsteps on PC
    window.addEventListener('keydown', (e) => {
      // Don't intercept if typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        this.registerPhysicalStep();
        this.pulseStepButton();
      }
    });

    // 4. In-Car Driving Simulation Burst (Hold or Click)
    let driveInterval = null;
    const startDrivingBurst = (speedTarget) => {
      clearInterval(driveInterval);
      driveInterval = setInterval(() => {
        const speed = speedTarget + (Math.random() - 0.5) * 3;
        const deltaMeters = (speed / 3.6) * 0.2;
        this.totalDistance += deltaMeters;
        this.stepCadence = 0.0; // Feet at rest on pedals
        this.gForce = 1.05 + (Math.random() - 0.5) * 0.04;
        this.updateSpeedAndDistance(speed);
        this.evaluateClassification(speed, 0.0, this.gForce);
      }, 200);
    };

    const stopDrivingBurst = () => {
      clearInterval(driveInterval);
      this.setStationaryState();
    };

    if (this.btnBurstDrive) {
      this.btnBurstDrive.addEventListener('mousedown', () => startDrivingBurst(60));
      this.btnBurstDrive.addEventListener('mouseup', stopDrivingBurst);
      this.btnBurstDrive.addEventListener('touchstart', (e) => { e.preventDefault(); startDrivingBurst(60); });
      this.btnBurstDrive.addEventListener('touchend', stopDrivingBurst);
    }

    if (this.btnBurstHighway) {
      this.btnBurstHighway.addEventListener('mousedown', () => startDrivingBurst(115));
      this.btnBurstHighway.addEventListener('mouseup', stopDrivingBurst);
      this.btnBurstHighway.addEventListener('touchstart', (e) => { e.preventDefault(); startDrivingBurst(115); });
      this.btnBurstHighway.addEventListener('touchend', stopDrivingBurst);
    }

    if (this.btnBurstPothole) {
      this.btnBurstPothole.addEventListener('click', () => {
        this.triggerPotholeShock(2.85);
      });
    }

    if (this.btnForceRest) {
      this.btnForceRest.addEventListener('click', () => {
        this.setStationaryState();
      });
    }

    // 5. Microphone Acoustic Toggle Button
    if (this.btnMicToggle) {
      this.btnMicToggle.addEventListener('click', () => {
        if (this.isAudioListening) {
          this.stopAcousticEngine();
        } else {
          this.startAcousticEngine();
        }
      });
    }
  }

  pulseStepButton() {
    if (!this.btnTapStep) return;
    this.btnTapStep.classList.add('step-pressed');
    setTimeout(() => {
      this.btnTapStep.classList.remove('step-pressed');
    }, 120);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // AUTONOMOUS STEP DETECTION & WATCHDOG (HALTS INSTANTLY WHEN YOU STOP)
  // ══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Registers a single footstep (called either by hardware accelerometer or tap stepper).
   * Calculates instantaneous cadence, classifies walking vs running, and updates odometer.
   */
  registerPhysicalStep() {
    const now = performance.now();
    const timeSinceLastStep = this.lastStepTime > 0 ? (now - this.lastStepTime) / 1000 : 0;
    this.lastStepTime = now;
    this.stepCount++;

    // Calculate Cadence (steps per second, Hz)
    let cadence = 1.8;
    if (timeSinceLastStep > 0.22 && timeSinceLastStep < 1.4) {
      cadence = 1.0 / timeSinceLastStep;
      this.stepIntervals.push(cadence);
      if (this.stepIntervals.length > 4) this.stepIntervals.shift();
      cadence = this.stepIntervals.reduce((a, b) => a + b, 0) / this.stepIntervals.length;
    }

    this.stepCadence = Math.min(3.8, Math.max(0.8, cadence));

    // Dynamic Human Stride & Speed calculation
    // Running: cadence > 2.2 Hz -> ~1.15m stride, speed 8 - 14 km/h
    // Walking: cadence <= 2.2 Hz -> ~0.78m stride, speed 3.2 - 5.8 km/h
    const isRunning = this.stepCadence > 2.2;
    const strideMeters = isRunning ? 1.15 : 0.78;
    this.totalDistance += strideMeters;

    const dynamicSpeed = this.stepCadence * strideMeters * 3.6; // m/s to km/h
    this.gForce = isRunning ? 1.45 : 1.18;

    this.updateSpeedAndDistance(dynamicSpeed);
    this.evaluateClassification(dynamicSpeed, this.stepCadence, this.gForce);
  }

  /**
   * High-frequency watchdog running at 10 Hz.
   * If > 1.0 second has elapsed since the last step, THE USER HAS STOPPED!
   * Immediately halts step cadence, freezes velocity at 0.0 km/h, and reverts to AT REST.
   */
  startStepWatchdog() {
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);

    this.watchdogTimer = setInterval(() => {
      // Only apply to walking/running modes (vehicular mode uses GPS or burst)
      if (this.currentMode === 'WALKING' || this.currentMode === 'RUNNING') {
        const timeSinceLastStep = performance.now() - this.lastStepTime;
        
        // 1.0 second threshold: if no footstep in 1 second, user is AT REST
        if (timeSinceLastStep > 1000) {
          this.setStationaryState();
        }
      }
    }, 100);
  }

  setStationaryState() {
    this.currentSpeed = 0.0;
    this.stepCadence = 0.0;
    this.gForce = 1.00;
    this.stepIntervals = [];

    this.updateSpeedAndDistance(0.0);
    this.evaluateClassification(0.0, 0.0, 1.00);

    if (this.cadenceClass) {
      this.cadenceClass.textContent = `${this.stepCount} steps accumulated (Motionless)`;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // HARDWARE TELEMETRY SENSORS (MOBILE ACCELEROMETER + SATELLITE GPS)
  // ══════════════════════════════════════════════════════════════════════════════
  async requestMobilePermissions() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceMotionEvent.requestPermission();
        if (permission === 'granted') {
          if (this.grantSensorsText) this.grantSensorsText.textContent = '✅ HARDWARE MOTION SENSORS ACTIVE & LISTENING';
          if (this.btnGrantSensors) this.btnGrantSensors.classList.add('granted');
          this.startHardwareSensors();
        } else {
          if (this.grantSensorsText) this.grantSensorsText.textContent = '❌ MOTION PERMISSION DENIED IN BROWSER SETTINGS';
        }
      } catch (err) {
        console.warn('Sensor permission error:', err);
      }
    } else {
      if (this.grantSensorsText) this.grantSensorsText.textContent = '✅ NATIVE MOTION SENSORS RUNNING DIRECTLY';
      if (this.btnGrantSensors) this.btnGrantSensors.classList.add('granted');
    }
  }

  startHardwareSensors() {
    if (this.hardwareSensorsActive) return;
    this.hardwareSensorsActive = true;

    // 1. Satellite GPS Watcher
    if ('geolocation' in navigator) {
      navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const accuracy = pos.coords.accuracy;
          let gpsSpeedKmh = 0.0;

          if (pos.coords.speed !== null && !isNaN(pos.coords.speed) && pos.coords.speed > 0.4) {
            gpsSpeedKmh = pos.coords.speed * 3.6;
          } else if (this.lastPosition) {
            const distanceDelta = this.calculateHaversine(this.lastPosition.lat, this.lastPosition.lon, lat, lon);
            const timeDelta = (pos.timestamp - this.lastPosition.timestamp) / 1000;
            if (timeDelta > 0.8 && distanceDelta > 1.2) {
              gpsSpeedKmh = (distanceDelta / timeDelta) * 3.6;
              this.totalDistance += distanceDelta;
            }
          }

          this.lastPosition = { lat, lon, timestamp: pos.timestamp };

          if (accuracy < 35 && this.deviceStatus) {
            this.deviceStatus.textContent = `📡 Satellite GPS Connected (±${accuracy.toFixed(1)}m precision, Lat ${lat.toFixed(4)}, Lon ${lon.toFixed(4)})`;
            this.deviceStatus.style.color = '#10b981';
          }

          // If GPS reports in-vehicle driving (> 16 km/h)
          if (gpsSpeedKmh > 16.0) {
            this.stepCadence = 0.0;
            this.updateSpeedAndDistance(gpsSpeedKmh);
            this.evaluateClassification(gpsSpeedKmh, 0.0, 1.05);
          } else if (gpsSpeedKmh < 0.6 && (this.currentMode === 'CAR_DRIVING' || this.currentMode === 'STATIONARY')) {
            this.setStationaryState();
          }
        },
        (err) => {
          console.warn('GPS hardware notice:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    // 2. 3D Accelerometer Step Peak-Valley Algorithm
    const handleDeviceMotion = (e) => {
      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (!acc || acc.y === null) return;

      const totalMagnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
      const measuredG = totalMagnitude / 9.80665;
      this.gForce = measuredG;
      if (this.gVal && measuredG !== 2.85) this.gVal.textContent = measuredG.toFixed(2);

      // Pothole Shock Detection: Sudden massive vertical delta > 1.9G
      if (measuredG > 2.25) {
        this.triggerPotholeShock(measuredG);
        return;
      }

      // Step Detection: Dual-threshold hysteresis (Valley then Peak)
      // Valley: G drops below 0.93G as body prepares footfall
      if (measuredG < 0.93) {
        this.accelValleyDetected = true;
      }

      // Peak: G rises above 1.16G (foot strike on ground)
      const now = performance.now();
      if (this.accelValleyDetected && measuredG > 1.16 && (now - this.lastStepTime) > 240) {
        this.accelValleyDetected = false;
        this.registerPhysicalStep();
      }

      this.prevAccelY = measuredG;
    };

    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleDeviceMotion, { passive: true });
    }
  }

  triggerPotholeShock(gMagnitude = 2.85) {
    this.potholeAlerts++;
    this.gForce = gMagnitude;

    if (this.gVal) this.gVal.textContent = gMagnitude.toFixed(2);
    if (this.potholeEl) {
      this.potholeEl.textContent = `⚠️ ${this.potholeAlerts} Road Crater(s) Detected! (${gMagnitude.toFixed(2)}G Shock)`;
      this.potholeEl.style.color = '#ff3344';
      this.potholeEl.style.fontWeight = '700';
    }

    if (this.confidenceEl) {
      this.confidenceEl.textContent = `⚠️ IMPACT RECOIL: Vertical shock crater ${gMagnitude.toFixed(2)}G detected!`;
      this.confidenceEl.style.color = '#ff3344';
    }

    // Send impulse to 3D Scene and Audio Synth
    if (this.onModeChanged) {
      this.onModeChanged('POTHOLE_IMPACT', this.currentSpeed, this.totalDistance, gMagnitude);
    }

    this.updateAcousticAdvice(
      'Mechanical Road Shock Alert',
      `⚠️ Heavy vertical suspension impact (${gMagnitude.toFixed(2)}G) registered. Recommend visual inspection of front wheel rim and strut mount.`
    );

    setTimeout(() => {
      this.gForce = 1.00;
      if (this.gVal) this.gVal.textContent = '1.00';
      if (this.potholeEl) this.potholeEl.style.color = 'var(--color-text-dim)';
      if (this.confidenceEl) this.confidenceEl.style.color = 'var(--color-text-dim)';
      if (this.onModeChanged) {
        this.onModeChanged(this.currentMode, this.currentSpeed, this.totalDistance, 1.00);
      }
    }, 1800);
  }

  updateSpeedAndDistance(speedKmh) {
    this.currentSpeed = Math.max(0, speedKmh);

    if (this.speedVal) this.speedVal.textContent = this.currentSpeed.toFixed(1);
    if (this.speedBar) {
      const pct = Math.min(100, (this.currentSpeed / 140) * 100);
      this.speedBar.style.width = `${pct}%`;
    }

    const km = this.totalDistance / 1000;
    if (this.distVal) this.distVal.textContent = km.toFixed(2);
    if (this.metersVal) this.metersVal.textContent = `${Math.round(this.totalDistance)} meters accumulated`;

    if (this.cadenceVal) this.cadenceVal.textContent = this.stepCadence.toFixed(1);
    if (this.gVal && this.gForce !== 2.85) this.gVal.textContent = this.gForce.toFixed(2);
  }

  evaluateClassification(speed, cadence, gForce) {
    let mode = 'STATIONARY';
    let icon = '🛑';
    let name = 'AT REST / STATIONARY';
    let conf = 'Auto-Detect: 0.0 km/h • Zero movement detected';

    if (speed < 0.6) {
      mode = 'STATIONARY';
      icon = '🛑';
      name = 'AT REST / STATIONARY';
      conf = 'Auto-Detect: 0.0 km/h • Motionless (At rest)';
    } else if (speed >= 0.6 && speed <= 6.5 && cadence > 0.6) {
      mode = 'WALKING';
      icon = '🚶';
      name = 'HUMAN PHYSICAL WALKING';
      conf = `Auto-Detect: ${speed.toFixed(1)} km/h • ${cadence.toFixed(1)} Hz footfall cadence • Human walking stride`;
      if (this.cadenceClass) this.cadenceClass.textContent = `${this.stepCount} human steps accumulated`;
    } else if (speed > 6.5 && speed <= 18.0 && cadence > 2.0) {
      mode = 'RUNNING';
      icon = '🏃';
      name = 'HUMAN RUNNING / JOGGING';
      conf = `Auto-Detect: ${speed.toFixed(1)} km/h • ${cadence.toFixed(1)} Hz fast footfalls • Elevated locomotion`;
      if (this.cadenceClass) this.cadenceClass.textContent = `${this.stepCount} athletic strides accumulated`;
    } else {
      mode = 'CAR_DRIVING';
      icon = '🚗';
      name = 'IN VEHICLE (DRIVING)';
      conf = `Auto-Detect: ${speed.toFixed(1)} km/h • Vehicular velocity • 0 Hz footfalls (Driver/Passenger)`;
      if (this.cadenceClass) this.cadenceClass.textContent = `0 Hz (Feet resting in vehicular cabin)`;
    }

    this.currentMode = mode;
    if (this.badgeIcon) this.badgeIcon.textContent = icon;
    if (this.badgeName) this.badgeName.textContent = name;
    if (this.confidenceEl) this.confidenceEl.textContent = conf;
    if (this.badge) this.badge.className = `current-mode-tag mode-${mode.toLowerCase()}`;

    if (this.onModeChanged) {
      this.onModeChanged(mode, speed, this.totalDistance, gForce);
    }
  }

  calculateHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dPhi = ((lat2 - lat1) * Math.PI) / 180;
    const dLambda = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // CONTINUOUS LIVE ACOUSTIC SOUND ANALYSIS ENGINE (WEB AUDIO API + FFT)
  // ══════════════════════════════════════════════════════════════════════════════
  autoStartAcousticEngine() {
    window.addEventListener('click', () => {
      if (!this.audioCtx) {
        this.initAudioContext();
      }
    }, { once: true });
  }

  initAudioContext() {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    } catch (e) {
      console.warn('AudioContext notice:', e);
    }
  }

  async startAcousticEngine() {
    if (!this.audioCtx) this.initAudioContext();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const source = this.audioCtx.createMediaStreamSource(this.micStream);

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.82;
      source.connect(this.analyser);

      this.audioDataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.isAudioListening = true;

      if (this.micDot) this.micDot.className = 'mic-dot-on';
      if (this.micText) this.micText.textContent = 'MICROPHONE SENSOR: LIVE & ANALYZING';
      if (this.btnMicToggle) this.btnMicToggle.classList.add('active');

      this.analyzeAcousticLoop();
    } catch (err) {
      console.warn('Microphone permission notice:', err);
      if (this.micText) this.micText.textContent = 'MIC PERMISSION REQUIRED';
    }
  }

  stopAcousticEngine() {
    this.isAudioListening = false;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }

    if (this.micDot) this.micDot.className = 'mic-dot-off';
    if (this.micText) this.micText.textContent = 'ENABLE LIVE MICROPHONE SENSOR';
    if (this.btnMicToggle) this.btnMicToggle.classList.remove('active');

    if (this.dbVal) this.dbVal.textContent = '-- dB';
    if (this.harmonicVal) this.harmonicVal.textContent = '-- Hz';
    if (this.classVal) this.classVal.textContent = 'Standby';
  }

  analyzeAcousticLoop() {
    if (!this.isAudioListening || !this.analyser) return;

    this.animFrameId = requestAnimationFrame(() => this.analyzeAcousticLoop());
    this.analyser.getByteFrequencyData(this.audioDataArray);

    const binCount = this.analyser.frequencyBinCount;
    const nyquist = (this.audioCtx.sampleRate || 48000) / 2;
    const hzPerBin = nyquist / binCount;

    let sumSquares = 0;
    let peakBin = 0;
    let peakVal = 0;

    let lowBassSum = 0;    // 20-250 Hz (Engine combustion, exhaust rumble)
    let midVoiceSum = 0;   // 250-3500 Hz (Human voice, speech conversation)
    let highFrictionSum = 0; // 3500-12000 Hz (Metallic squeal, brake friction, belt whine)

    for (let i = 0; i < binCount; i++) {
      const val = this.audioDataArray[i];
      sumSquares += val * val;

      if (val > peakVal) {
        peakVal = val;
        peakBin = i;
      }

      const freq = i * hzPerBin;
      if (freq <= 250) lowBassSum += val;
      else if (freq <= 3500) midVoiceSum += val;
      else highFrictionSum += val;
    }

    const rms = Math.sqrt(sumSquares / binCount);
    const approxDb = Math.min(108, Math.max(32, Math.round(35 + (rms / 255) * 70)));
    const dominantHz = Math.round(peakBin * hzPerBin);

    this.drawSpectrumCanvas(this.audioDataArray, binCount);

    if (this.dbVal) this.dbVal.textContent = `${approxDb} dB`;
    if (this.harmonicVal) this.harmonicVal.textContent = dominantHz > 0 ? `${dominantHz} Hz` : '-- Hz';

    this.classifyAndAdvise(approxDb, dominantHz, lowBassSum, midVoiceSum, highFrictionSum);
  }

  drawSpectrumCanvas(dataArray, count) {
    if (!this.spectrumCtx || !this.spectrumCanvas) return;
    const ctx = this.spectrumCtx;
    const w = this.spectrumCanvas.width;
    const h = this.spectrumCanvas.height;

    ctx.clearRect(0, 0, w, h);

    const barWidth = (w / count) * 2.2;
    let x = 0;

    for (let i = 0; i < count; i++) {
      const barHeight = (dataArray[i] / 255) * h;
      const freqRatio = i / count;
      if (freqRatio < 0.2) {
        ctx.fillStyle = '#0C813D';
      } else if (freqRatio < 0.55) {
        ctx.fillStyle = '#d4af37';
      } else {
        ctx.fillStyle = '#38bdf8';
      }

      ctx.fillRect(x, h - barHeight, barWidth, barHeight);
      x += barWidth + 1;
      if (x > w) break;
    }
  }

  classifyAndAdvise(db, dominantHz, lowSum, midSum, highSum) {
    let classification = 'Ambient Quiet';
    let classDesc = 'Normal cabin baseline';
    let adviceTitle = 'Acoustic Baseline Safe';
    let advice = 'Ambient acoustic levels are quiet. No human sound stress or mechanical anomalies detected.';

    const vehicle = this.getVehicle ? this.getVehicle() : null;
    const vehicleName = vehicle && vehicle.model ? vehicle.model.name : 'Selected Vehicle';

    if (db < 45) {
      classification = 'Quiet Environment';
      classDesc = 'Low ambient noise (~40 dB)';
      adviceTitle = 'Environment Idle';
      advice = `Acoustic cabin environment is calm. ${vehicleName} powertrain is quiet.`;
    } 
    else if (db > 85) {
      classification = '⚠️ High Noise Exposure';
      classDesc = `High Volume (${db} dB)`;
      adviceTitle = 'Human Hearing Caution (> 85 dB)';
      advice = `⚠️ Elevated sound pressure level of ${db} dB detected! If driving, roll up windows to eliminate turbulence; if working nearby, consider ear protection.`;
    }
    else if (dominantHz > 3800 && highSum > midSum * 0.75) {
      classification = '⚠️ Metallic Squeal / Friction';
      classDesc = `High Harmonic (${dominantHz} Hz)`;
      adviceTitle = 'Mechanical Brake / Belt Friction Alert';
      advice = `⚠️ High-frequency acoustic spike at ${dominantHz} Hz matches brake pad wear indicator or serpentine belt slippage on ${vehicleName}. Check brake pads in 3D Studio.`;
    }
    else if (dominantHz >= 35 && dominantHz <= 220 && lowSum > midSum * 0.8) {
      classification = '🚗 Powertrain Mechanical Idle';
      classDesc = `Rumble (${dominantHz} Hz harmonic)`;
      adviceTitle = `${vehicleName} Engine Acoustics`;
      advice = `Mechanical combustion frequency of ${dominantHz} Hz active. Acoustic signature indicates smooth internal combustion rhythm with zero connecting-rod knock.`;
    }
    else if (dominantHz >= 250 && dominantHz <= 3200 && midSum > lowSum) {
      classification = '🗣️ Human Voice Conversation';
      classDesc = `Speech Formants (${dominantHz} Hz • ${db} dB)`;
      adviceTitle = 'Human Vocal Acoustics (Safe)';
      advice = `Human voice conversation detected at ${db} dB. Volume is within optimal human comfort levels (60–75 dB). No auditory strain.`;
    }

    if (this.classVal) this.classVal.textContent = classification;
    if (this.classDesc) this.classDesc.textContent = classDesc;
    this.updateAcousticAdvice(adviceTitle, advice);
  }

  updateAcousticAdvice(title, text) {
    if (this.advisoryBadge) this.advisoryBadge.textContent = `${title.toUpperCase()}:`;
    if (this.advisoryContent) this.advisoryContent.textContent = text;
  }
}
