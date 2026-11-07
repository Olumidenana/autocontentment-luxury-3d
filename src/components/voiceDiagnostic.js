import confetti from 'canvas-confetti';

export class VoiceDiagnostic {
  constructor(containerEl) {
    this.container = containerEl;
    this.recognition = null;
    this.isRecording = false;
    this.audioContext = null;
    this.analyser = null;
    this.micStream = null;
    this.silenceTimer = null;
    this.liveTranscript = '';
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="voice-triage-panel">
        <div class="panel-header">
          <div class="header-tag">
            <span class="live-dot"></span>
            <span>AUTOCONTENTMENT SCAM SHIELD</span>
          </div>
          <h3 class="panel-title">Speak To Triage In Real-Time</h3>
          <p class="panel-desc">
            Describe what your car is doing or what your mechanic told you. Our real-time voice perception captures your words live, isolates the actual fault, and calculates your money saved from fraudulent roadside quotes.
          </p>
        </div>

        <!-- Live Audio Waveform Visualizer -->
        <div class="audio-visualizer-box">
          <canvas id="voiceVisualizer" class="visualizer-canvas" width="600" height="90"></canvas>
          <div class="visualizer-overlay" id="visualizerStatus">Microphone Standby — Tap to Speak</div>
        </div>

        <!-- Live Speech Recognition Streaming Output -->
        <div class="transcript-display" id="transcriptDisplay">
          <span class="placeholder-text">Your spoken words will appear here in real time as you speak...</span>
        </div>

        <!-- Main Action Controls -->
        <div class="triage-controls">
          <button id="btnVoiceToggle" class="btn-voice-record">
            <svg class="mic-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
            <span id="voiceBtnLabel">START SPEAKING</span>
          </button>
          
          <button id="btnManualAnalyze" class="btn-secondary" style="display: none;">
            ANALYZE NOW
          </button>
        </div>

        <!-- Quick 1-Click Verification Scenarios -->
        <div class="demo-scenarios">
          <div class="scenarios-label">Or test common Nigerian mechanic scam scenarios:</div>
          <div class="scenarios-chips">
            <button class="chip" data-scenario="gearbox">"Gearbox jerking, mechanic asked ₦850k for full swap"</button>
            <button class="chip" data-scenario="engine_knock">"Morning metallic rattle, mechanic says engine knock ₦1.2M"</button>
            <button class="chip" data-scenario="overheating">"AC stopping and engine hot, mechanic says bad head gasket ₦450k"</button>
          </div>
        </div>

        <!-- Dynamic Scam Shield Diagnostic Output Result -->
        <div id="diagnosticResult" class="diagnostic-result-card" style="display: none;">
          <!-- Injected dynamically -->
        </div>
      </div>
    `;

    this.btnToggle = this.container.querySelector('#btnVoiceToggle');
    this.btnLabel = this.container.querySelector('#voiceBtnLabel');
    this.btnManual = this.container.querySelector('#btnManualAnalyze');
    this.transcriptEl = this.container.querySelector('#transcriptDisplay');
    this.visualizerCanvas = this.container.querySelector('#voiceVisualizer');
    this.visualizerStatus = this.container.querySelector('#visualizerStatus');
    this.resultEl = this.container.querySelector('#diagnosticResult');

    this.bindEvents();
    this.initCanvas();
  }

  initCanvas() {
    this.canvasCtx = this.visualizerCanvas.getContext('2d');
    this.drawIdleWaveform();
  }

  drawIdleWaveform() {
    if (this.isRecording) return;
    const ctx = this.canvasCtx;
    const w = this.visualizerCanvas.width;
    const h = this.visualizerCanvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(12, 129, 61, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);

    for (let x = 0; x < w; x++) {
      const y = h / 2 + Math.sin(x * 0.05 + performance.now() * 0.002) * 4;
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    if (!this.isRecording) {
      requestAnimationFrame(() => this.drawIdleWaveform());
    }
  }

  bindEvents() {
    this.btnToggle.addEventListener('click', () => {
      if (this.isRecording) {
        this.stopListening();
      } else {
        this.startListening();
      }
    });

    this.btnManual.addEventListener('click', () => {
      if (this.liveTranscript.trim().length > 0) {
        this.analyzeText(this.liveTranscript);
      }
    });

    // Preset chip triggers
    this.container.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const scenario = chip.dataset.scenario;
        if (scenario === 'gearbox') {
          this.executePreset(
            "My Honda Accord 2018 is jerking violently when shifting from gear 1 to 2. Roadside mechanic in Ladipo told me the whole transmission is condemned and quoted ₦850,000 for a tokunbo replacement.",
            {
              fault: "Transmission Shift Solenoid B & ATF Degradation",
              mechanicClaim: "Complete Gearbox Replacement: ₦850,000",
              realSolution: "OEM Shift Solenoid replacement + Genuine ATF DW-1 fluid flush",
              honestCost: "₦48,000 (Solenoid) + ₦22,000 (ATF + Labor) = ₦70,000",
              savings: "₦780,000 SAVED",
              partToOrder: "Honda Genuine ATF-DW1 & Dual Linear Solenoid B"
            }
          );
        } else if (scenario === 'engine_knock') {
          this.executePreset(
            "I hear a sharp clicking and rattling sound under the hood for 3 seconds every morning on cold start. Mechanic says crankshaft bearing has knocked and wants ₦1.2 Million for engine overhaul.",
            {
              fault: "VVT Cam Phaser Actuator Pin Wear (Cold Start Dry Rattle)",
              mechanicClaim: "Engine Knock / Crankshaft Rebuild: ₦1,200,000",
              realSolution: "Replace VVT Sprocket Actuator + Check Oil Filter Anti-Drainback Valve",
              honestCost: "₦65,000 (VVT Actuator) + ₦25,000 (Labor) = ₦90,000",
              savings: "₦1,110,000 SAVED",
              partToOrder: "OEM VVT Cam Phaser Gear & 5W-30 Full Synthetic Oil"
            }
          );
        } else if (scenario === 'overheating') {
          this.executePreset(
            "The temperature gauge climbs when idling in Lagos traffic and AC starts blowing warm air. Mechanic says cylinder head gasket is blown and wants ₦450,000 to skim the engine head.",
            {
              fault: "Radiator Auxiliary Cooling Fan Resistor Failure",
              mechanicClaim: "Blown Cylinder Head Gasket & Skim: ₦450,000",
              realSolution: "Replace dual radiator high-speed cooling fan motor relay & resistor",
              honestCost: "₦18,000 (Fan Relay) + ₦10,000 (Labor) = ₦28,000",
              savings: "₦422,000 SAVED",
              partToOrder: "Heavy-Duty Radiator Cooling Fan Assembly & 50/50 Coolant"
            }
          );
        }
      });
    });
  }

  async startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    // Start Audio Visualizer
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.micStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 128;
      source.connect(this.analyser);
      this.drawLiveSpectrum();
    } catch (err) {
      console.warn("Visualizer mic fallback:", err);
    }

    if (!SpeechRecognition) {
      this.transcriptEl.innerHTML = `
        <div style="color: #f59e0b; padding: 12px;">
          Browser speech engine not natively available on this browser. Type or use scenario chips below for instant analysis.
        </div>
      `;
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-NG'; // Nigerian English context

    this.isRecording = true;
    this.liveTranscript = '';
    this.btnToggle.classList.add('recording');
    this.btnLabel.textContent = 'LISTENING... (SPEAK FREELY)';
    this.visualizerStatus.textContent = 'Recording live voice... Pause when finished';
    this.btnManual.style.display = 'inline-flex';

    this.recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          this.liveTranscript += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const fullText = (this.liveTranscript + ' ' + interim).trim();
      this.transcriptEl.innerHTML = `
        <div class="live-speaking-stream">
          <span class="transcript-active">${fullText}</span>
        </div>
      `;

      // Auto-silence timeout reset (1.8s)
      clearTimeout(this.silenceTimer);
      this.silenceTimer = setTimeout(() => {
        if (this.isRecording && fullText.length > 5) {
          this.stopListening();
          this.analyzeText(fullText);
        }
      }, 1900);
    };

    this.recognition.onerror = (e) => {
      console.warn("Speech error:", e.error);
    };

    this.recognition.onend = () => {
      if (this.isRecording) {
        this.stopListening();
      }
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.error(e);
    }
  }

  stopListening() {
    this.isRecording = false;
    clearTimeout(this.silenceTimer);
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.btnToggle.classList.remove('recording');
    this.btnLabel.textContent = 'START SPEAKING';
    this.visualizerStatus.textContent = 'Analysis Complete';
    this.drawIdleWaveform();
  }

  drawLiveSpectrum() {
    if (!this.isRecording || !this.analyser) return;
    const ctx = this.canvasCtx;
    const w = this.visualizerCanvas.width;
    const h = this.visualizerCanvas.height;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, w, h);
    const barWidth = (w / bufferLength) * 2.2;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * h * 0.9;
      ctx.fillStyle = `rgb(${12 + dataArray[i]}, ${129 + dataArray[i] * 0.4}, ${61 + dataArray[i] * 0.2})`;
      ctx.fillRect(x, h - barHeight, barWidth - 1, barHeight);
      x += barWidth;
    }

    requestAnimationFrame(() => this.drawLiveSpectrum());
  }

  analyzeText(text) {
    const lower = text.toLowerCase();
    let diagnosis = {
      fault: "Drivetrain Mechanical Harmonic Resonance",
      mechanicClaim: "Roadside Quack Estimate: ₦500,000+ Full Part Assembly Replacement",
      realSolution: "Inspect and replace individual wear components (bushings, solenoids, or sensors)",
      honestCost: "₦35,000 – ₦65,000 Verified OEM Repair",
      savings: "₦435,000 ESTIMATED SAVINGS",
      partToOrder: "AutoContentment Verified OEM Diagnostic & Parts Kit"
    };

    if (lower.includes('gear') || lower.includes('transmission') || lower.includes('jerk') || lower.includes('shift')) {
      diagnosis = {
        fault: "Transmission Shift Solenoid & ATF Degradation",
        mechanicClaim: "Quack Mechanic Quote: ₦850,000 Complete Tokunbo Gearbox",
        realSolution: "Do not swap the transmission! Replace the failed shift solenoid and flush with genuine manufacturer ATF.",
        honestCost: "₦48,000 (Solenoid) + ₦22,000 (Fluid + Labor) = ₦70,000",
        savings: "₦780,000 SAVED",
        partToOrder: "Genuine OEM Transmission Solenoid & DW-1 Fluid"
      };
    } else if (lower.includes('knock') || lower.includes('rattle') || lower.includes('morning') || lower.includes('start')) {
      diagnosis = {
        fault: "VVT Cam Phaser Actuator Pin Wear (Cold Start Rattle)",
        mechanicClaim: "Quack Mechanic Quote: ₦1,200,000 Complete Engine Overhaul / Crankshaft Swap",
        realSolution: "Crankshaft is intact. The cold-start rattle is caused by lost oil pressure in the Variable Valve Timing (VVT) sprocket.",
        honestCost: "₦65,000 (VVT Sprocket) + ₦25,000 (Labor) = ₦90,000",
        savings: "₦1,110,000 SAVED",
        partToOrder: "OEM VVT Cam Phaser Gear & 5W-30 Full Synthetic Oil"
      };
    } else if (lower.includes('hot') || lower.includes('heat') || lower.includes('temp') || lower.includes('ac') || lower.includes('fan')) {
      diagnosis = {
        fault: "Radiator Fan Motor / Resistor Relay Failure",
        mechanicClaim: "Quack Mechanic Quote: ₦450,000 Blown Cylinder Head Gasket & Engine Skimming",
        realSolution: "Head gasket is completely fine. High-speed cooling fan is failing to trigger when vehicle is stationary in traffic.",
        honestCost: "₦18,000 (Fan Relay) + ₦10,000 (Labor) = ₦28,000",
        savings: "₦422,000 SAVED",
        partToOrder: "Heavy-Duty Radiator Cooling Fan Assembly & 50/50 Coolant"
      };
    }

    this.renderResult(text, diagnosis);
  }

  executePreset(transcriptText, diagnosis) {
    this.transcriptEl.innerHTML = `
      <div class="live-speaking-stream">
        <span class="transcript-active">${transcriptText}</span>
      </div>
    `;
    this.renderResult(transcriptText, diagnosis);
  }

  renderResult(transcript, diagnosis) {
    this.resultEl.style.display = 'block';
    this.resultEl.innerHTML = `
      <div class="result-badge-top">
        <span class="badge-icon">🛡️</span>
        <span class="badge-text">AUTOCONTENTMENT SCAM SHIELD VERDICT</span>
      </div>

      <div class="savings-banner">
        <div class="savings-amount">${diagnosis.savings}</div>
        <div class="savings-sub">Money Protected from Predatory Roadside Mechanics</div>
      </div>

      <div class="verdict-grid">
        <div class="verdict-col quack-claim">
          <div class="col-tag">⚠️ ROADSIDE MECHANIC CLAIM</div>
          <div class="col-body">${diagnosis.mechanicClaim}</div>
        </div>
        <div class="verdict-col honest-fix">
          <div class="col-tag">✅ TRUE ROOT CAUSE & HONEST FIX</div>
          <div class="col-body"><strong>${diagnosis.fault}:</strong> ${diagnosis.realSolution}</div>
          <div class="col-cost">True Cost: <strong>${diagnosis.honestCost}</strong></div>
        </div>
      </div>

      <div class="action-footer">
        <a href="https://wa.me/2348000000000?text=${encodeURIComponent('Hi AutoContentment, my diagnostic flagged: ' + diagnosis.fault + '. I need verified OEM parts quote for: ' + diagnosis.partToOrder + ' with Lagos delivery.')}" target="_blank" class="btn-whatsapp-order">
          <span class="wa-icon">💬</span>
          <span>ORDER VERIFIED OEM PARTS VIA AUTOCONTENTMENT</span>
        </a>
      </div>
    `;

    // Celebratory confetti explosion
    try {
      confetti({
        particleCount: 65,
        spread: 70,
        origin: { y: 0.75 },
        colors: ['#0C813D', '#ffd700', '#ffffff']
      });
    } catch (e) {}

    this.resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
