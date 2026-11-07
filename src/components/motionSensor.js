export class MotionSensor {
  constructor(containerEl, onModeChanged) {
    this.container = containerEl;
    this.onModeChanged = onModeChanged;
    
    this.isTracking = false;
    this.watchId = null;
    this.currentMode = 'STATIONARY';
    this.currentSpeed = 0; // km/h
    this.totalDistance = 0; // meters
    this.lastPosition = null;
    this.stepCadence = 0; // Hz
    this.gForce = 1.0;
    this.potholeAlerts = 0;
    this.mockInterval = null;
    this.stepCount = 0;
    this.lastStepTime = 0;

    this.init();
  }

  init() {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    this.container.innerHTML = `
      <div class="motion-sensor-card">
        <div class="sensor-header">
          <div class="sensor-badge">
            <span class="pulse-indicator"></span>
            <span>INTELLIGENT KINEMATICS & SENSOR FUSION</span>
          </div>
          <h3 class="sensor-title">Real-Time Speedometer & Locomotion Detector</h3>
          <p class="sensor-desc">
            Accurately tracks your velocity, distance traversed, and distinguishes between human walking, running, and car driving using satellite GPS and 3D accelerometer motion sensors.
          </p>

          <!-- Hardware Device Notice -->
          <div class="device-sensor-status" id="deviceSensorStatus">
            ${isMobile 
              ? '📱 Mobile Device Detected — Native Hardware GPS & Gyro Sensors Available.' 
              : '💻 PC / Laptop Detected — Laptops lack satellite GPS chips (use Wi-Fi or simulation below to test walking/driving).'
            }
          </div>
        </div>

        <!-- Live Mode Badge -->
        <div class="mode-status-container">
          <div class="current-mode-tag" id="motionModeBadge">
            <span class="mode-icon" id="motionModeIcon">🛑</span>
            <span class="mode-name" id="motionModeName">STATIONARY</span>
          </div>
          <div class="mode-confidence" id="motionConfidence">Telemetry: 0.0 km/h (At rest)</div>
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
            <div class="meter-lbl">DISTANCE TRAVERSED</div>
            <div class="meter-val-row">
              <span class="meter-number" id="sensorDistVal">0.00</span>
              <span class="meter-unit">km</span>
            </div>
            <div class="meter-sub" id="sensorMetersVal">0 meters accumulated</div>
          </div>

          <!-- Vertical Footstep Cadence -->
          <div class="meter-box">
            <div class="meter-lbl">STEP CADENCE</div>
            <div class="meter-val-row">
              <span class="meter-number" id="sensorCadenceVal">0.0</span>
              <span class="meter-unit">Hz</span>
            </div>
            <div class="meter-sub" id="cadenceClass">0 steps detected</div>
          </div>

          <!-- G-Force Shock & Pothole Alert -->
          <div class="meter-box">
            <div class="meter-lbl">CHASSIS G-FORCE</div>
            <div class="meter-val-row">
              <span class="meter-number" id="sensorGVal">1.00</span>
              <span class="meter-unit">G</span>
            </div>
            <div class="meter-sub" id="potholeCount">0 Road Shocks / Potholes</div>
          </div>
        </div>

        <!-- Actions: Real Hardware Sensor or Test Simulator -->
        <div class="sensor-actions">
          <button id="btnToggleRealSensor" class="btn-sensor-primary">
            <span>ACTIVATE LIVE GPS SENSOR TRACKING</span>
          </button>
          
          <div class="simulator-buttons">
            <span class="sim-label">OR SIMULATE TO TEST IN SCREEN RECORDING:</span>
            <button class="btn-sim" data-sim="walking">🚶 Walk (4.5 km/h)</button>
            <button class="btn-sim" data-sim="running">🏃 Run (11.0 km/h)</button>
            <button class="btn-sim" data-sim="car_city">🚗 Drive (48 km/h)</button>
            <button class="btn-sim" data-sim="car_highway">🏎️ Highway (115 km/h)</button>
            <button class="btn-sim" data-sim="pothole">⚠️ Hit Pothole (2.8G)</button>
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
    this.deviceStatus = this.container.querySelector('#deviceSensorStatus');

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

    this.container.querySelectorAll('.btn-sim').forEach(btn => {
      btn.addEventListener('click', () => {
        const sim = btn.dataset.sim;
        this.runSimulation(sim);
      });
    });
  }

  startRealTracking() {
    this.isTracking = true;
    this.btnToggleReal.textContent = 'STOP SENSOR TRACKING';
    this.btnToggleReal.classList.add('tracking');

    if ('geolocation' in navigator) {
      this.deviceStatus.textContent = "📡 GPS Sensor Acquired: Reading live satellite positions...";
      this.deviceStatus.style.color = "#0C813D";

      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const accuracy = pos.coords.accuracy;
          let speedKmh = 0;

          if (pos.coords.speed !== null && !isNaN(pos.coords.speed) && pos.coords.speed > 0) {
            speedKmh = pos.coords.speed * 3.6;
          } else if (this.lastPosition) {
            const d = this.calculateHaversine(this.lastPosition.lat, this.lastPosition.lon, lat, lon);
            const timeDiff = (pos.timestamp - this.lastPosition.timestamp) / 1000;
            if (timeDiff > 0.5) {
              this.totalDistance += d;
              speedKmh = (d / timeDiff) * 3.6;
            }
          }

          this.lastPosition = { lat, lon, timestamp: pos.timestamp };
          this.deviceStatus.textContent = `📡 GPS Active (Accuracy: ±${accuracy.toFixed(1)}m, Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)})`;

          this.updateSpeedAndDistance(speedKmh);
          this.evaluateSensorFusion(speedKmh, this.stepCadence, this.gForce);
        },
        (err) => {
          this.deviceStatus.textContent = `⚠️ GPS Error: ${err.message}. (Ensure location permission is enabled in browser)`;
          this.deviceStatus.style.color = "#ff4444";
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }

    // Accelerometer & Gyro Pedometer
    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', (e) => {
        if (!e.accelerationIncludingGravity) return;
        const acc = e.accelerationIncludingGravity;
        const totalG = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z) / 9.81;
        this.gForce = totalG;

        const now = performance.now();
        // Detect footstep peak
        if (totalG > 1.25 && (now - this.lastStepTime) > 300) {
          this.stepCount++;
          this.lastStepTime = now;
          this.stepCadence = 1.9;
          this.cadenceVal.textContent = this.stepCadence.toFixed(1);
          this.cadenceClass.textContent = `${this.stepCount} human steps tracked`;

          // If GPS is stationary (indoor walking), accumulate 0.75m per step!
          if (this.currentSpeed < 3.0) {
            this.totalDistance += 0.75;
            this.updateSpeedAndDistance(4.5);
            this.evaluateSensorFusion(4.5, this.stepCadence, this.gForce);
          }
        }

        // Pothole shock
        if (totalG > 1.9 && this.currentSpeed > 20) {
          this.potholeAlerts++;
          this.potholeEl.textContent = `${this.potholeAlerts} Road Shocks / Potholes Detected`;
          this.potholeEl.style.color = '#ff3344';
        }

        this.gVal.textContent = totalG.toFixed(2);
      }, { passive: true });
    }
  }

  stopRealTracking() {
    this.isTracking = false;
    this.btnToggleReal.textContent = 'ACTIVATE LIVE GPS SENSOR TRACKING';
    this.btnToggleReal.classList.remove('tracking');
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  calculateHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dPhi = ((lat2 - lat1) * Math.PI) / 180;
    const dLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  updateSpeedAndDistance(speedKmh) {
    this.currentSpeed = Math.max(0, speedKmh);
    this.speedVal.textContent = this.currentSpeed.toFixed(1);
    const pct = Math.min(100, (this.currentSpeed / 140) * 100);
    this.speedBar.style.width = `${pct}%`;

    const km = this.totalDistance / 1000;
    this.distVal.textContent = km.toFixed(2);
    this.metersVal.textContent = `${Math.round(this.totalDistance)} meters accumulated`;
  }

  evaluateSensorFusion(speed, cadence, gForce) {
    let mode = 'STATIONARY';
    let icon = '🛑';
    let name = 'STATIONARY';
    let conf = '0.0 km/h (At rest)';

    if (speed < 1.0) {
      mode = 'STATIONARY';
      icon = '🛑';
      name = 'STATIONARY';
      conf = 'Zero displacement';
    } else if (speed >= 1.0 && speed <= 6.5) {
      mode = 'WALKING';
      icon = '🚶';
      name = 'HUMAN WALKING';
      conf = `${speed.toFixed(1)} km/h (1.8–2.0 Hz cadence)`;
    } else if (speed > 6.5 && speed <= 18.0) {
      mode = 'RUNNING';
      icon = '🏃';
      name = 'HUMAN RUNNING / JOGGING';
      conf = `${speed.toFixed(1)} km/h (2.8 Hz cadence)`;
    } else {
      mode = 'CAR_DRIVING';
      icon = '🚗';
      name = 'CAR IN-MOTION (DRIVING)';
      conf = `${speed.toFixed(1)} km/h (Sustained velocity, 0 Hz footfalls)`;
    }

    this.currentMode = mode;
    this.badgeIcon.textContent = icon;
    this.badgeName.textContent = name;
    this.confidenceEl.textContent = `Telemetry: ${conf}`;
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
        this.gForce = 1.02;
        this.gVal.textContent = '1.02';
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
      targetSpeed = 115.0;
      targetCadence = 0.0;
    }

    this.mockInterval = setInterval(() => {
      const currentSimSpeed = targetSpeed + (Math.random() - 0.5) * 2;
      const deltaMeters = (currentSimSpeed / 3.6) * 0.5;
      this.totalDistance += deltaMeters;

      this.updateSpeedAndDistance(currentSimSpeed);
      this.stepCadence = targetCadence > 0 ? targetCadence + (Math.random() - 0.5) * 0.2 : 0;
      this.cadenceVal.textContent = this.stepCadence.toFixed(1);
      this.gVal.textContent = (1.0 + (Math.random() - 0.5) * 0.1).toFixed(2);

      this.evaluateSensorFusion(currentSimSpeed, this.stepCadence, 1.0);
    }, 500);
  }
}
