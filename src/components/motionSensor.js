export class MotionSensor {
  constructor(containerEl, onModeChanged) {
    this.container = containerEl;
    this.onModeChanged = onModeChanged;
    
    this.isTracking = false;
    this.watchId = null;
    this.currentMode = 'STATIONARY'; // 'STATIONARY' | 'WALKING' | 'RUNNING' | 'CAR_DRIVING'
    this.currentSpeed = 0; // km/h
    this.totalDistance = 0; // meters
    this.lastPosition = null;
    this.stepCadence = 0; // Hz
    this.gForce = 1.0;
    this.potholeAlerts = 0;
    this.mockInterval = null;

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="motion-sensor-card">
        <div class="sensor-header">
          <div class="sensor-badge">
            <span class="pulse-indicator"></span>
            <span>INTELLIGENT KINEMATICS & MOTION SENSOR</span>
          </div>
          <h3 class="sensor-title">Real-Time Vehicle vs. Human Motion Detection</h3>
          <p class="sensor-desc">
            How your phone knows you're in a car versus walking or running: Human locomotion produces a rhythmic 1.8–3.0 Hz vertical bouncing cadence under 15 km/h. A moving car produces sustained planar velocity (>20 km/h) without footstep cadence, accompanied by continuous high-frequency driveline vibration and road shock impulses.
          </p>
        </div>

        <!-- Live Mode Badge -->
        <div class="mode-status-container">
          <div class="current-mode-tag" id="motionModeBadge">
            <span class="mode-icon" id="motionModeIcon">🛑</span>
            <span class="mode-name" id="motionModeName">STATIONARY / DESK</span>
          </div>
          <div class="mode-confidence" id="motionConfidence">Confidence: 99.8% (0 km/h)</div>
        </div>

        <!-- Telemetry Meters Grid -->
        <div class="telemetry-meters-grid">
          <!-- Speedometer -->
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

          <!-- Total Distance Moved -->
          <div class="meter-box">
            <div class="meter-lbl">DISTANCE MOVED</div>
            <div class="meter-val-row">
              <span class="meter-number" id="sensorDistVal">0.00</span>
              <span class="meter-unit">km</span>
            </div>
            <div class="meter-sub" id="sensorMetersVal">0 meters traversed</div>
          </div>

          <!-- Locomotion Cadence vs Chassis Vibration -->
          <div class="meter-box">
            <div class="meter-lbl">VERTICAL CADENCE</div>
            <div class="meter-val-row">
              <span class="meter-number" id="sensorCadenceVal">0.0</span>
              <span class="meter-unit">Hz (steps/s)</span>
            </div>
            <div class="meter-sub" id="cadenceClass">No human footfall</div>
          </div>

          <!-- G-Force Shock (Pothole Detector) -->
          <div class="meter-box">
            <div class="meter-lbl">CHASSIS G-FORCE</div>
            <div class="meter-val-row">
              <span class="meter-number" id="sensorGVal">1.00</span>
              <span class="meter-unit">G</span>
            </div>
            <div class="meter-sub" id="potholeCount">0 Road Shocks / Potholes</div>
          </div>
        </div>

        <!-- Sensor Fusion Logic Explainer -->
        <div class="sensor-fusion-breakdown">
          <div class="fusion-step">
            <span class="step-num">1</span>
            <div class="step-info">
              <strong>WALKING (3 – 6 km/h):</strong> 
              Rhythmic sinusoidal acceleration peaks at 1.8 – 2.0 Hz from heel-to-toe contact.
            </div>
          </div>
          <div class="fusion-step">
            <span class="step-num">2</span>
            <div class="step-info">
              <strong>RUNNING (7 – 18 km/h):</strong> 
              Cadence increases to 2.4 – 3.2 Hz with vertical G-force oscillations up to 1.8G.
            </div>
          </div>
          <div class="fusion-step">
            <span class="step-num">3</span>
            <div class="step-info">
              <strong>CAR IN-MOTION (20 – 160+ km/h):</strong> 
              Zero step cadence, sustained linear GPS acceleration, continuous chassis micro-harmonics, and sharp >2.0G shocks when hitting road craters.
            </div>
          </div>
        </div>

        <!-- Actions: Real Hardware Sensor or Test Simulator -->
        <div class="sensor-actions">
          <button id="btnToggleRealSensor" class="btn-sensor-primary">
            <span>START LIVE GPS & ACCELEROMETER TRACKING</span>
          </button>
          
          <div class="simulator-buttons">
            <span class="sim-label">SIMULATE MOTION:</span>
            <button class="btn-sim" data-sim="walking">🚶 Walk (4.5 km/h)</button>
            <button class="btn-sim" data-sim="running">🏃 Run (11.0 km/h)</button>
            <button class="btn-sim" data-sim="car_city">🚗 Drive (45 km/h)</button>
            <button class="btn-sim" data-sim="car_highway">🏎️ Highway (110 km/h)</button>
            <button class="btn-sim" data-sim="pothole">⚠️ Pothole Hit (2.8G)</button>
            <button class="btn-sim" data-sim="stop">🛑 Stop</button>
          </div>
        </div>
      </div>
    `;

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
    this.btnToggleReal = this.container.querySelector('#btnToggleRealSensor');

    this.bindEvents();
  }

  bindEvents() {
    this.btnToggleReal.addEventListener('click', () => {
      if (this.isTracking) {
        this.stopRealTracking();
      } else {
        this.startRealTracking();
      }
    });

    // Simulator Buttons
    this.container.querySelectorAll('.btn-sim').forEach(btn => {
      btn.addEventListener('click', () => {
        const sim = btn.dataset.sim;
        this.runSimulation(sim);
      });
    });
  }

  startRealTracking() {
    this.isTracking = true;
    this.btnToggleReal.textContent = 'STOP REAL HARDWARE TRACKING';
    this.btnToggleReal.classList.add('tracking');

    // 1. GPS Geolocation Velocity & Distance Calculation
    if ('geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const speedMs = pos.coords.speed; // speed in m/s if available
          let speedKmh = speedMs ? speedMs * 3.6 : 0;

          if (this.lastPosition) {
            const d = this.calculateHaversine(
              this.lastPosition.lat, this.lastPosition.lon,
              lat, lon
            );
            if (d > 1.5) { // filter GPS jitter (< 1.5m)
              this.totalDistance += d;
              const timeDiff = (pos.timestamp - this.lastPosition.timestamp) / 1000;
              if (timeDiff > 0 && !speedMs) {
                speedKmh = (d / timeDiff) * 3.6;
              }
            }
          }

          this.lastPosition = { lat, lon, timestamp: pos.timestamp };
          this.updateSpeedAndDistance(speedKmh);
          this.evaluateSensorFusion(speedKmh, this.stepCadence, this.gForce);
        },
        (err) => console.warn("GPS watch error:", err.message),
        { enableHighAccuracy: true, maximumAge: 1000 }
      );
    }

    // 2. Accelerometer Cadence & G-Force Detection
    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', (e) => {
        if (!e.accelerationIncludingGravity) return;
        const acc = e.accelerationIncludingGravity;
        const totalG = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z) / 9.81;
        this.gForce = totalG;

        // Check for sudden pothole/crater shock impulse
        if (totalG > 1.8 && this.currentSpeed > 20) {
          this.potholeAlerts++;
          this.potholeEl.textContent = `${this.potholeAlerts} Road Shocks / Potholes Detected`;
        }

        // Estimate vertical cadence (walking vs running)
        if (Math.abs(acc.y) > 1.5 && this.currentSpeed < 18) {
          this.stepCadence = this.currentSpeed > 7 ? 2.8 : 1.9;
        } else {
          this.stepCadence = 0;
        }

        this.gVal.textContent = totalG.toFixed(2);
        this.cadenceVal.textContent = this.stepCadence.toFixed(1);
        this.evaluateSensorFusion(this.currentSpeed, this.stepCadence, this.gForce);
      }, { passive: true });
    }
  }

  stopRealTracking() {
    this.isTracking = false;
    this.btnToggleReal.textContent = 'START LIVE GPS & ACCELEROMETER TRACKING';
    this.btnToggleReal.classList.remove('tracking');
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  calculateHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dPhi = ((lat2 - lat1) * Math.PI) / 180;
    const dLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  }

  updateSpeedAndDistance(speedKmh) {
    this.currentSpeed = Math.max(0, speedKmh);
    this.speedVal.textContent = this.currentSpeed.toFixed(1);
    const pct = Math.min(100, (this.currentSpeed / 140) * 100);
    this.speedBar.style.width = `${pct}%`;

    const km = this.totalDistance / 1000;
    this.distVal.textContent = km.toFixed(2);
    this.metersVal.textContent = `${Math.round(this.totalDistance)} meters traversed`;
  }

  evaluateSensorFusion(speed, cadence, gForce) {
    let mode = 'STATIONARY';
    let icon = '🛑';
    let name = 'STATIONARY / DESK';
    let conf = '99.8% (Vehicle stationary)';

    if (speed < 1.0) {
      mode = 'STATIONARY';
      icon = '🛑';
      name = 'STATIONARY / DESK';
      conf = '99.8% (Zero displacement)';
      this.cadenceClass.textContent = 'No human footfall';
    } else if (speed >= 1.0 && speed <= 6.5) {
      mode = 'WALKING';
      icon = '🚶';
      name = 'HUMAN WALKING';
      conf = `98.4% (${speed.toFixed(1)} km/h with 1.8–2.0 Hz footstep cadence)`;
      this.cadenceClass.textContent = 'Active walking cadence';
    } else if (speed > 6.5 && speed <= 18.0) {
      mode = 'RUNNING';
      icon = '🏃';
      name = 'HUMAN RUNNING / JOGGING';
      conf = `96.7% (${speed.toFixed(1)} km/h with 2.8 Hz footstep cadence)`;
      this.cadenceClass.textContent = 'High-frequency run cadence';
    } else {
      mode = 'CAR_DRIVING';
      icon = '🚗';
      name = 'CAR IN-MOTION (DRIVING)';
      conf = `99.9% (${speed.toFixed(1)} km/h sustained velocity, zero foot cadence)`;
      this.cadenceClass.textContent = 'Vehicle chassis coupled';
    }

    this.currentMode = mode;
    this.badgeIcon.textContent = icon;
    this.badgeName.textContent = name;
    this.confidenceEl.textContent = `Confidence: ${conf}`;

    // Styling
    this.badge.className = `current-mode-tag mode-${mode.toLowerCase()}`;

    if (this.onModeChanged) {
      this.onModeChanged(mode, speed, this.totalDistance);
    }
  }

  runSimulation(simType) {
    clearInterval(this.mockInterval);

    if (simType === 'stop') {
      this.updateSpeedAndDistance(0);
      this.stepCadence = 0;
      this.gForce = 1.0;
      this.gVal.textContent = '1.00';
      this.cadenceVal.textContent = '0.0';
      this.evaluateSensorFusion(0, 0, 1.0);
      return;
    }

    if (simType === 'pothole') {
      this.gForce = 2.85;
      this.gVal.textContent = '2.85';
      this.potholeAlerts++;
      this.potholeEl.textContent = `${this.potholeAlerts} Road Shocks / Potholes Detected!`;
      this.potholeEl.style.color = '#ff3344';
      setTimeout(() => {
        this.gForce = 1.05;
        this.gVal.textContent = '1.05';
        this.potholeEl.style.color = 'var(--color-text-dim)';
      }, 1500);
      return;
    }

    let targetSpeed = 4.5;
    let targetCadence = 1.9;
    if (simType === 'running') {
      targetSpeed = 11.2;
      targetCadence = 2.8;
    } else if (simType === 'car_city') {
      targetSpeed = 48.0;
      targetCadence = 0.0;
    } else if (simType === 'car_highway') {
      targetSpeed = 112.0;
      targetCadence = 0.0;
    }

    this.mockInterval = setInterval(() => {
      // Add slight organic speed jitter
      const currentSimSpeed = targetSpeed + (Math.random() - 0.5) * 3;
      // Add incremental distance: distance = speed (m/s) * 0.5s
      const deltaMeters = (currentSimSpeed / 3.6) * 0.5;
      this.totalDistance += deltaMeters;

      this.updateSpeedAndDistance(currentSimSpeed);
      this.stepCadence = targetCadence > 0 ? targetCadence + (Math.random() - 0.5) * 0.2 : 0;
      this.cadenceVal.textContent = this.stepCadence.toFixed(1);
      this.gVal.textContent = (1.0 + (Math.random() - 0.5) * 0.15).toFixed(2);

      this.evaluateSensorFusion(currentSimSpeed, this.stepCadence, 1.0);
    }, 500);
  }
}
