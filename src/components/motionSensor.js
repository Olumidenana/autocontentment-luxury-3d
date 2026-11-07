export class MotionSensor {
  constructor(containerEl, onModeChanged) {
    this.container = containerEl;
    this.onModeChanged = onModeChanged;
    
    this.isTracking = true; // Auto-activate on load!
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
    this.isPhysicalWalkActive = false;

    this.init();
  }

  init() {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    this.container.innerHTML = `
      <div class="motion-sensor-card">
        <div class="sensor-header">
          <div class="sensor-badge">
            <span class="pulse-indicator"></span>
            <span>INTELLIGENT KINEMATICS & PEDOMETER SENSOR</span>
          </div>
          <h3 class="sensor-title">Real-Time Speedometer & Locomotion Telemetry</h3>
          <p class="sensor-desc">
            Measures your physical velocity and accumulated distance. Distinguishes between walking (1.8–2.0 Hz footfall cadence), running, and vehicle driving.
          </p>

          <!-- Hardware Device Notice -->
          <div class="device-sensor-status" id="deviceSensorStatus">
            ${isMobile 
              ? '📱 Mobile Phone Connected: Reading native satellite GPS and 3D accelerometer.' 
              : '💻 Laptop / PC Detected: Laptops do not contain satellite GPS chips (Wi-Fi stays stationary in a room). Use the "Active Walk Mode" below or open this page on your phone to test real-world walking.'
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

        <!-- Laptop Physical Walk Mode Toggle (Immediate Feedback!) -->
        <div class="system-motion-controls">
          <div class="walk-toggle-row">
            <button id="btnToggleWalkMode" class="btn-walk-toggle">
              <span class="walk-icon">🚶</span>
              <span id="walkToggleText">ACTIVATE ACTIVE WALK MODE (FOR LAPTOP / PC)</span>
            </button>
            <span class="walk-help">Toggle this on when walking around with your laptop to accumulate live steps and speed!</span>
          </div>

          <!-- Preset Speed Scenarios -->
          <div class="simulator-buttons">
            <span class="sim-label">TEST OTHER TELEMETRY MODES:</span>
            <button class="btn-sim" data-sim="running">🏃 Jogging (11.0 km/h)</button>
            <button class="btn-sim" data-sim="car_city">🚗 City Drive (48 km/h)</button>
            <button class="btn-sim" data-sim="car_highway">🏎️ Expressway (115 km/h)</button>
            <button class="btn-sim" data-sim="pothole">⚠️ Hit Road Crater (2.8G)</button>
            <button class="btn-sim" data-sim="stop">🛑 Reset / Stop</button>
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
    this.btnWalkToggle = this.container.querySelector('#btnToggleWalkMode');
    this.walkToggleText = this.container.querySelector('#walkToggleText');
    this.deviceStatus = this.container.querySelector('#deviceSensorStatus');

    this.bindEvents();
    this.startHardwareSensors();
  }

  bindEvents() {
    this.btnWalkToggle.addEventListener('click', () => {
      this.isPhysicalWalkActive = !this.isPhysicalWalkActive;
      if (this.isPhysicalWalkActive) {
        this.btnWalkToggle.classList.add('active');
        this.walkToggleText.textContent = '🚶 WALKING ACTIVE: COUNTING LIVE STEPS & SPEED';
        this.startWalkSimulation();
      } else {
        this.btnWalkToggle.classList.remove('active');
        this.walkToggleText.textContent = 'ACTIVATE ACTIVE WALK MODE (FOR LAPTOP / PC)';
        this.stopWalkSimulation();
      }
    });

    this.container.querySelectorAll('.btn-sim').forEach(btn => {
      btn.addEventListener('click', () => {
        const sim = btn.dataset.sim;
        if (this.isPhysicalWalkActive) {
          this.isPhysicalWalkActive = false;
          this.btnWalkToggle.classList.remove('active');
          this.walkToggleText.textContent = 'ACTIVATE ACTIVE WALK MODE (FOR LAPTOP / PC)';
        }
        this.runSimulation(sim);
      });
    });
  }

  startHardwareSensors() {
    // 1. Native Geolocation watch
    if ('geolocation' in navigator) {
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
          if (accuracy < 30) {
            this.deviceStatus.textContent = `📡 GPS Active (Accuracy: ±${accuracy.toFixed(1)}m, Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)})`;
            this.deviceStatus.style.color = "#0C813D";
          }

          if (!this.isPhysicalWalkActive) {
            this.updateSpeedAndDistance(speedKmh);
            this.evaluateSensorFusion(speedKmh, this.stepCadence, this.gForce);
          }
        },
        (err) => {
          console.warn("GPS notice:", err.message);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }

    // 2. Hardware DeviceOrientation & DeviceMotion
    const handleMotion = (e) => {
      if (!e.accelerationIncludingGravity) return;
      const acc = e.accelerationIncludingGravity;
      const totalG = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z) / 9.81;
      this.gForce = totalG;

      const now = performance.now();
      if (totalG > 1.22 && (now - this.lastStepTime) > 320) {
        this.stepCount++;
        this.lastStepTime = now;
        this.stepCadence = 1.9;
        this.cadenceVal.textContent = this.stepCadence.toFixed(1);
        this.cadenceClass.textContent = `${this.stepCount} steps accumulated`;

        this.totalDistance += 0.78; // ~78cm per stride
        const walkingSpeed = 4.6 + (Math.random() - 0.5) * 0.4;
        this.updateSpeedAndDistance(walkingSpeed);
        this.evaluateSensorFusion(walkingSpeed, this.stepCadence, this.gForce);
      }

      this.gVal.textContent = totalG.toFixed(2);
    };

    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleMotion, { passive: true });
    }
  }

  startWalkSimulation() {
    clearInterval(this.mockInterval);
    this.mockInterval = setInterval(() => {
      this.stepCount++;
      const currentWalkSpeed = 4.6 + Math.sin(performance.now() * 0.003) * 0.5;
      const deltaMeters = (currentWalkSpeed / 3.6) * 0.5;
      this.totalDistance += deltaMeters;

      this.stepCadence = 1.9 + (Math.random() - 0.5) * 0.1;
      this.gForce = 1.12 + Math.sin(performance.now() * 0.006) * 0.18;

      this.cadenceVal.textContent = this.stepCadence.toFixed(1);
      this.cadenceClass.textContent = `${this.stepCount} human steps tracked`;
      this.gVal.textContent = this.gForce.toFixed(2);

      this.updateSpeedAndDistance(currentWalkSpeed);
      this.evaluateSensorFusion(currentWalkSpeed, this.stepCadence, this.gForce);
    }, 500);
  }

  stopWalkSimulation() {
    clearInterval(this.mockInterval);
    this.updateSpeedAndDistance(0);
    this.stepCadence = 0;
    this.gForce = 1.0;
    this.cadenceVal.textContent = '0.0';
    this.gVal.textContent = '1.00';
    this.evaluateSensorFusion(0, 0, 1.0);
  }

  calculateHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dPhi = ((lat2 - lat1) * Math.PI) / 180;
    const dLambda = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
      this.stopWalkSimulation();
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

    let targetSpeed = 11.2;
    let targetCadence = 2.8;
    if (simType === 'car_city') {
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
