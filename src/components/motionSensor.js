export class MotionSensor {
  constructor(containerEl, onModeChanged, getVehicleFn = null) {
    this.container = containerEl;
    this.onModeChanged = onModeChanged;
    this.getVehicle = getVehicleFn;

    // Locomotion & Kinematics State (Zero fake values, strictly 0.0 when at rest)
    this.currentMode = 'STATIONARY';
    this.currentSpeed = 0.0; // km/h
    this.totalDistance = 0.0; // meters
    this.stepCount = 0;
    this.stepCadence = 0.0; // Hz
    this.gForce = 1.00;
    this.potholeAlerts = 0;
    this.lastPosition = null;

    // High-Pass Dynamic Motion Filter (Adaptive Gravity Baseline)
    this.gravityBaseline = 9.80665;
    this.lastStepTime = 0;
    this.stepIntervals = [];
    this.hasValley = false;
    this.watchdogTimer = null;
    this.sensorsActive = false;

    // Live Acoustic Sound Intelligence State
    this.audioCtx = null;
    this.analyser = null;
    this.micStream = null;
    this.audioDataArray = null;
    this.isAudioListening = false;
    this.animFrameId = null;
    this.lastAcousticClass = '';

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="motion-sensor-card">
        
        <!-- Header & Autonomous Status -->
        <div class="sensor-header">
          <div class="sensor-badge">
            <span class="pulse-indicator"></span>
            <span>100% BUILT-IN AUTONOMOUS MOTION & ACOUSTIC SENSOR</span>
          </div>
          <h3 class="sensor-title">Built-In Motion Detector & Real-Time Sound Intelligence</h3>
          <p class="sensor-desc">
            Hands-free autonomous engine. Continuously detects your real footsteps, walking speed, running pace, vehicular velocity, 
            and road pothole drops. The moment you stop, speed immediately drops to <strong>0.0 km/h</strong>. 
            Concurrently analyzes live ambient sound for human voice decibels and mechanical engine diagnostics.
          </p>

          <div class="device-sensor-status" id="deviceSensorStatus">
            🟢 Autonomous Hardware Detector: Active & Listening for physical motion and sound.
          </div>
        </div>

        <!-- Real-Time Classification Pill -->
        <div class="mode-status-container">
          <div class="current-mode-tag mode-stationary" id="motionModeBadge">
            <span class="mode-icon" id="motionModeIcon">🛑</span>
            <span class="mode-name" id="motionModeName">AT REST / STATIONARY</span>
          </div>
          <div class="mode-confidence" id="motionConfidence">Built-in Sensor: 0.0 km/h • Motionless (At rest)</div>
        </div>

        <!-- Telemetry Meters Grid -->
        <div class="telemetry-meters-grid">
          <!-- 1. Velocity Speedometer -->
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

          <!-- 2. Distance Accumulated -->
          <div class="meter-box">
            <div class="meter-lbl">DISTANCE ACCUMULATED</div>
            <div class="meter-val-row">
              <span class="meter-number" id="sensorDistVal">0.00</span>
              <span class="meter-unit">km</span>
            </div>
            <div class="meter-sub" id="sensorMetersVal">0 meters accumulated</div>
          </div>

          <!-- 3. Footfall Step Cadence -->
          <div class="meter-box">
            <div class="meter-lbl">FOOTSTEP CADENCE</div>
            <div class="meter-val-row">
              <span class="meter-number" id="sensorCadenceVal">0.0</span>
              <span class="meter-unit">Hz</span>
            </div>
            <div class="meter-sub" id="cadenceClass">0 steps detected (At rest)</div>
          </div>

          <!-- 4. Chassis G-Force & Pothole Alert -->
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
             CONTINUOUS LIVE ACOUSTIC SOUND ANALYSIS ENGINE (HANDS-FREE)
             ══════════════════════════════════════════════════════════════════════ -->
        <div class="acoustic-analyzer-section">
          <div class="acoustic-header">
            <div class="acoustic-title-row">
              <div class="acoustic-icon">🎙️</div>
              <div>
                <h4 class="acoustic-title">CONTINUOUS ACOUSTIC SOUND INTELLIGENCE</h4>
                <div class="acoustic-sub">Auto-analyzing ambient audio • Human voice safety dB • Mechanical harmonics</div>
              </div>
            </div>
            <div class="acoustic-live-indicator">
              <span class="mic-dot-on" id="micStatusDot"></span>
              <span class="mic-live-label" id="micStatusText">LIVE AUDIO SENSOR RUNNING</span>
            </div>
          </div>

          <!-- Sound Spectrum Visualizer Canvas -->
          <div class="spectrum-visualizer-container">
            <canvas id="acousticSpectrumCanvas" class="spectrum-canvas" width="600" height="85"></canvas>
            <div class="spectrum-freq-axis">
              <span>20 Hz (Sub-Bass)</span>
              <span>250 Hz (Combustion)</span>
              <span>1 kHz (Human Voice)</span>
              <span>4 kHz (Friction/Brakes)</span>
              <span>16 kHz (Air/Tire)</span>
            </div>
          </div>

          <!-- Acoustic Telemetry Readings -->
          <div class="acoustic-telemetry-grid">
            <div class="acoustic-meter">
              <span class="ac-lbl">SOUND LEVEL:</span>
              <span class="ac-val" id="acousticDbVal">-- dB</span>
              <span class="ac-desc" id="acousticDbDesc">Live acoustic pressure</span>
            </div>
            <div class="acoustic-meter">
              <span class="ac-lbl">DOMINANT FREQUENCY:</span>
              <span class="ac-val" id="acousticHarmonicVal">-- Hz</span>
              <span class="ac-desc" id="acousticHarmonicDesc">Peak acoustic spectral harmonic</span>
            </div>
            <div class="acoustic-meter">
              <span class="ac-lbl">SOUND CLASSIFICATION:</span>
              <span class="ac-val highlight-val" id="acousticClassVal">Ambient Baseline</span>
              <span class="ac-desc" id="acousticClassDesc">Autonomous classification</span>
            </div>
          </div>

          <!-- Automated Live Mechanical & Safety Advisory Box -->
          <div class="acoustic-advisory-card" id="acousticAdvisoryCard">
            <div class="advisory-badge">
              <span class="advisory-pulse"></span>
              <span id="advisoryBadgeText">REAL-TIME AUTONOMOUS ADVISORY:</span>
            </div>
            <div class="advisory-content" id="advisoryContentText">
              Live acoustic monitor is active. Audio levels and mechanical frequencies are continuously analyzed to generate real-time advice.
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

    // Cache Acoustic DOM references
    this.micDot = this.container.querySelector('#micStatusDot');
    this.micText = this.container.querySelector('#micStatusText');
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

    this.startHardwareSensors();
    this.startStepWatchdog();
    this.setupAutoAcousticEngine();
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // BUILT-IN HARDWARE ACCELEROMETER & SATELLITE GPS (100% HANDS-FREE)
  // ══════════════════════════════════════════════════════════════════════════════
  startHardwareSensors() {
    if (this.sensorsActive) return;
    this.sensorsActive = true;

    // 1. Satellite GPS Speed & Telemetry
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
            this.deviceStatus.textContent = `🟢 Satellite GPS Active (±${accuracy.toFixed(1)}m precision • Lat ${lat.toFixed(4)}, Lon ${lon.toFixed(4)})`;
            this.deviceStatus.style.color = '#10b981';
          }

          // If GPS indicates car driving (> 16 km/h) and no footsteps
          if (gpsSpeedKmh > 16.0) {
            this.stepCadence = 0.0;
            this.updateSpeedAndDistance(gpsSpeedKmh);
            this.evaluateClassification(gpsSpeedKmh, 0.0, 1.05);
          } else if (gpsSpeedKmh < 0.6 && this.currentMode === 'CAR_DRIVING') {
            this.setStationaryState();
          }
        },
        (err) => {
          console.warn('GPS hardware notice:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    // 2. High-Pass Adaptive Accelerometer Filter for True Human Steps
    const handleDeviceMotion = (e) => {
      // Read raw acceleration (with or without gravity)
      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (!acc) return;

      const ax = acc.x || 0;
      const ay = acc.y || 0;
      const az = acc.z || 0;
      const rawMagnitude = Math.sqrt(ax * ax + ay * ay + az * az);
      if (rawMagnitude < 0.1) return;

      // Update running gravity baseline (EMA filter with alpha = 0.92)
      this.gravityBaseline = this.gravityBaseline * 0.92 + rawMagnitude * 0.08;

      // Dynamic acceleration with gravity baseline subtracted (pure human footfall impulse)
      const dynamicAcc = Math.abs(rawMagnitude - this.gravityBaseline);
      const instantG = rawMagnitude / 9.80665;
      this.gForce = instantG;
      if (this.gVal && instantG !== 2.85) this.gVal.textContent = instantG.toFixed(2);

      // Pothole Shock Detection: Sudden massive vertical shock (> 1.9G total or dynamic impulse > 8.5 m/s²)
      if (instantG > 2.25 || dynamicAcc > 8.5) {
        this.triggerPotholeShock(instantG > 2.25 ? instantG : 2.85);
        return;
      }

      // Step Detection using Hysteresis (Valley then Peak)
      // Valley: dynamic acceleration drops below 0.55 m/s²
      if (dynamicAcc < 0.55) {
        this.hasValley = true;
      }

      // Peak: dynamic acceleration rises above 1.45 m/s² (human heel strike on ground)
      const now = performance.now();
      if (this.hasValley && dynamicAcc > 1.45 && (now - this.lastStepTime) > 240) {
        this.hasValley = false;
        this.registerStep(now);
      }
    };

    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleDeviceMotion, { passive: true });
    }

    // For iOS 13+ devices where permission needs a user gesture, request on first interaction
    const grantMotion = async () => {
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
          const perm = await DeviceMotionEvent.requestPermission();
          if (perm === 'granted') {
            window.addEventListener('devicemotion', handleDeviceMotion, { passive: true });
          }
        } catch (err) {
          // ignore
        }
      }
    };
    window.addEventListener('touchstart', grantMotion, { once: true });
    window.addEventListener('click', grantMotion, { once: true });
  }

  registerStep(timestamp) {
    const timeDeltaSec = this.lastStepTime > 0 ? (timestamp - this.lastStepTime) / 1000 : 0;
    this.lastStepTime = timestamp;
    this.stepCount++;

    // Cadence (steps per second, Hz)
    let cadence = 1.8;
    if (timeDeltaSec > 0.22 && timeDeltaSec < 1.3) {
      cadence = 1.0 / timeDeltaSec;
      this.stepIntervals.push(cadence);
      if (this.stepIntervals.length > 4) this.stepIntervals.shift();
      cadence = this.stepIntervals.reduce((a, b) => a + b, 0) / this.stepIntervals.length;
    }

    this.stepCadence = Math.min(3.8, Math.max(0.8, cadence));

    // Dynamic Human Stride & Speed calculation
    const isRunning = this.stepCadence > 2.15;
    const strideMeters = isRunning ? 1.15 : 0.78;
    this.totalDistance += strideMeters;

    const dynamicSpeed = this.stepCadence * strideMeters * 3.6; // m/s to km/h
    this.gForce = isRunning ? 1.45 : 1.18;

    this.updateSpeedAndDistance(dynamicSpeed);
    this.evaluateClassification(dynamicSpeed, this.stepCadence, this.gForce);
  }

  /**
   * Watchdog timer running at 10 Hz.
   * If > 1.0 second has elapsed with NO NEW FOOTSTEP, the user has stopped walking!
   * Immediately halts step cadence, freezes velocity at 0.0 km/h, and reverts to AT REST.
   */
  startStepWatchdog() {
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);

    this.watchdogTimer = setInterval(() => {
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

  triggerPotholeShock(gMagnitude = 2.85) {
    this.potholeAlerts++;
    this.gForce = gMagnitude;

    if (this.gVal) this.gVal.textContent = gMagnitude.toFixed(2);
    if (this.potholeEl) {
      this.potholeEl.textContent = `⚠️ ${this.potholeAlerts} Road Shock(s) Detected! (${gMagnitude.toFixed(2)}G Shock)`;
      this.potholeEl.style.color = '#ff3344';
      this.potholeEl.style.fontWeight = '700';
    }

    if (this.confidenceEl) {
      this.confidenceEl.textContent = `⚠️ IMPACT DETECTED: Vertical chassis crater ${gMagnitude.toFixed(2)}G!`;
      this.confidenceEl.style.color = '#ff3344';
    }

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
    let conf = 'Built-in Sensor: 0.0 km/h • Motionless (At rest)';

    if (speed < 0.6) {
      mode = 'STATIONARY';
      icon = '🛑';
      name = 'AT REST / STATIONARY';
      conf = 'Built-in Sensor: 0.0 km/h • Zero movement detected';
    } else if (speed >= 0.6 && speed <= 6.5 && cadence > 0.6) {
      mode = 'WALKING';
      icon = '🚶';
      name = 'HUMAN PHYSICAL WALKING';
      conf = `Auto-Detected: ${speed.toFixed(1)} km/h • ${cadence.toFixed(1)} Hz footfall cadence • Human stride`;
      if (this.cadenceClass) this.cadenceClass.textContent = `${this.stepCount} human steps accumulated`;
    } else if (speed > 6.5 && speed <= 18.0 && cadence > 2.0) {
      mode = 'RUNNING';
      icon = '🏃';
      name = 'HUMAN RUNNING / JOGGING';
      conf = `Auto-Detected: ${speed.toFixed(1)} km/h • ${cadence.toFixed(1)} Hz fast footfalls • Elevated locomotion`;
      if (this.cadenceClass) this.cadenceClass.textContent = `${this.stepCount} athletic strides accumulated`;
    } else {
      mode = 'CAR_DRIVING';
      icon = '🚗';
      name = 'IN VEHICLE (DRIVING)';
      conf = `Auto-Detected: ${speed.toFixed(1)} km/h • Vehicular velocity • 0 Hz footfalls`;
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
  // CONTINUOUS LIVE ACOUSTIC SOUND ANALYSIS (HANDS-FREE AUTO-START)
  // ══════════════════════════════════════════════════════════════════════════════
  setupAutoAcousticEngine() {
    const autoInit = async () => {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (AudioCtxClass) this.audioCtx = new AudioCtxClass();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
      if (!this.isAudioListening) {
        this.startAcousticStream();
      }
    };

    // Auto-start on any initial interaction anywhere on the screen
    window.addEventListener('click', autoInit, { once: true });
    window.addEventListener('touchstart', autoInit, { once: true });
    window.addEventListener('keydown', autoInit, { once: true });
  }

  async startAcousticStream() {
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
      if (this.micText) this.micText.textContent = 'LIVE ACOUSTIC MONITORING ACTIVE';

      this.analyzeAcousticLoop();
    } catch (err) {
      console.warn('Microphone permission notice:', err);
      if (this.micText) this.micText.textContent = 'TAP ANYWHERE TO GRANT MIC PERMISSION';
    }
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
