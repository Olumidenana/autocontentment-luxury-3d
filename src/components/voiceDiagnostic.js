import confetti from 'canvas-confetti';

export class VoiceDiagnostic {
  constructor(containerEl, getVehicleFn, scene3DFn) {
    this.container = containerEl;
    this.getVehicle = getVehicleFn;
    this.getScene3D = scene3DFn;
    this.recognition = null;
    this.isRecording = false;
    this.audioContext = null;
    this.analyser = null;
    this.micStream = null;
    this.silenceTimer = null;
    this.liveTranscript = '';
    this.selectedLanguage = 'en'; // 'en', 'pidgin', 'yoruba', 'hausa', 'igbo'
    
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="voice-triage-panel">
        <div class="panel-header">
          <div class="header-tag">
            <span class="live-dot"></span>
            <span>AUTOCONTENTMENT FIRST AID EMERGENCY RESPONDER</span>
          </div>
          <h3 class="panel-title">Roadside First-Aid Triage & 3D Teleport</h3>
          <p class="panel-desc">
            Narrate your emergency or symptom. Our responder listens to your actual words, provides immediate safety precautions, tells you if it is roadside DIY feasible, and <strong>teleports the 3D camera to show you exactly where the part is located inside your car</strong>.
          </p>

          <!-- Language Selector -->
          <div class="lang-selector-row">
            <span class="lang-lbl">RESPONDER LANGUAGE:</span>
            <div class="lang-pills">
              <button class="lang-pill active" data-lang="en">🇬🇧 English</button>
              <button class="lang-pill" data-lang="pidgin">🇳🇬 Nigerian Pidgin</button>
              <button class="lang-pill" data-lang="yoruba">Yorùbá</button>
              <button class="lang-pill" data-lang="hausa">Hausa</button>
              <button class="lang-pill" data-lang="igbo">Asụsụ Igbo</button>
            </div>
          </div>
        </div>

        <!-- Dynamic Gemini / ChatGPT-style Voice Orb -->
        <div class="voice-orb-container">
          <div class="voice-orb" id="voiceOrb">
            <div class="orb-ring ring-1"></div>
            <div class="orb-ring ring-2"></div>
            <div class="orb-ring ring-3"></div>
            <div class="orb-core">
              <svg class="mic-orb-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </div>
          </div>
          <div class="orb-status" id="orbStatus">Tap orb or button below to speak your situation</div>
        </div>

        <!-- Live Streaming Speech Typewriter Box -->
        <div class="live-transcript-card" id="transcriptCard">
          <div class="transcript-header">
            <span class="transcript-tag">NARRATED SITUATION:</span>
            <span class="typing-indicator" id="typingIndicator" style="display: none;">● RECORDING</span>
          </div>
          <div class="transcript-body" id="transcriptText">
            <span class="placeholder-text">Your exact words will stream here in real time as you narrate...</span>
          </div>
        </div>

        <!-- Main Action Buttons -->
        <div class="voice-action-bar">
          <button id="btnVoiceRecord" class="btn-primary-record">
            <span id="recordBtnText">NARRATE EMERGENCY</span>
          </button>
          <button id="btnStopAndAnalyze" class="btn-analyze-now" style="display: none;">
            <span>PROCESS FIRST AID TRIAGE</span>
          </button>
        </div>

        <!-- Real-Time Cognitive Steps -->
        <div id="reasoningSteps" class="reasoning-box" style="display: none;">
          <div class="reasoning-step step-1">🧠 Analyzing spoken symptoms and safety risk...</div>
          <div class="reasoning-step step-2">📍 Pinpointing physical component in 3D chassis layout...</div>
          <div class="reasoning-step step-3">🛡️ Formulating roadside precautions & DIY instructions...</div>
        </div>

        <!-- First-Aid Verdict & 3D Location Card -->
        <div id="firstAidCard" class="first-aid-card" style="display: none;">
          <!-- Dynamically Injected -->
        </div>
      </div>
    `;

    this.voiceOrb = this.container.querySelector('#voiceOrb');
    this.orbStatus = this.container.querySelector('#orbStatus');
    this.transcriptText = this.container.querySelector('#transcriptText');
    this.typingIndicator = this.container.querySelector('#typingIndicator');
    this.btnRecord = this.container.querySelector('#btnVoiceRecord');
    this.recordBtnText = this.container.querySelector('#recordBtnText');
    this.btnStopAnalyze = this.container.querySelector('#btnStopAndAnalyze');
    this.reasoningBox = this.container.querySelector('#reasoningSteps');
    this.firstAidCard = this.container.querySelector('#firstAidCard');

    this.bindEvents();
  }

  bindEvents() {
    this.btnRecord.addEventListener('click', () => {
      if (this.isRecording) {
        this.stopListening();
      } else {
        this.startListening();
      }
    });

    this.voiceOrb.addEventListener('click', () => {
      if (this.isRecording) {
        this.stopListening();
      } else {
        this.startListening();
      }
    });

    this.btnStopAnalyze.addEventListener('click', () => {
      this.stopListening();
      if (this.liveTranscript.trim().length > 3) {
        this.processFirstAid(this.liveTranscript);
      }
    });

    // Language selector pills
    this.container.querySelectorAll('.lang-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        this.container.querySelectorAll('.lang-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.selectedLanguage = pill.dataset.lang;
        if (this.lastDiagnosis) {
          this.renderFirstAidResponse(this.lastTranscript, this.lastVehicle, this.lastDiagnosis);
        }
      });
    });
  }

  async startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.micStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);
      this.animateOrbLevel();
    } catch (err) {
      console.warn("Orb mic fallback:", err);
    }

    if (!SpeechRecognition) {
      this.transcriptText.innerHTML = `
        <div style="color: #f59e0b; padding: 10px;">
          Browser speech engine not natively enabled. Type your situation below for instant First-Aid 3D guidance:
        </div>
        <textarea id="manualEmergencyInput" class="manual-input-box" placeholder="Describe what is happening (e.g. Engine is smoking and temperature gauge is on red, or Battery is dead and won't turn on)..."></textarea>
        <button id="btnManualTriageSubmit" class="btn-manual-submit">ANALYZE EMERGENCY NOW</button>
      `;
      const manualBtn = this.container.querySelector('#btnManualTriageSubmit');
      if (manualBtn) {
        manualBtn.addEventListener('click', () => {
          const text = this.container.querySelector('#manualEmergencyInput').value;
          if (text.trim()) this.processFirstAid(text);
        });
      }
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.selectedLanguage === 'en' ? 'en-NG' : 'en-NG';

    this.isRecording = true;
    this.liveTranscript = '';
    this.voiceOrb.classList.add('active-recording');
    this.btnRecord.classList.add('active');
    this.recordBtnText.textContent = 'LISTENING... (NARRATE SITUATION)';
    this.orbStatus.textContent = 'Recording live emergency narration... Pause when done';
    this.typingIndicator.style.display = 'inline-block';
    this.btnStopAnalyze.style.display = 'inline-flex';

    this.recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          this.liveTranscript += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const fullSpokenText = (this.liveTranscript + ' ' + interim).trim();
      this.transcriptText.innerHTML = `
        <span class="transcript-words">${fullSpokenText}</span>
        <span class="typewriter-cursor">|</span>
      `;

      clearTimeout(this.silenceTimer);
      this.silenceTimer = setTimeout(() => {
        if (this.isRecording && fullSpokenText.length > 5) {
          this.stopListening();
          this.processFirstAid(fullSpokenText);
        }
      }, 1900);
    };

    this.recognition.onerror = (e) => console.warn("Speech error:", e.error);
    this.recognition.onend = () => { if (this.isRecording) this.stopListening(); };

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

    this.voiceOrb.classList.remove('active-recording');
    this.btnRecord.classList.remove('active');
    this.recordBtnText.textContent = 'NARRATE EMERGENCY';
    this.orbStatus.textContent = 'Narration Complete';
    this.typingIndicator.style.display = 'none';
  }

  animateOrbLevel() {
    if (!this.isRecording || !this.analyser) return;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
    const avg = sum / dataArray.length;
    const scale = 1.0 + (avg / 255) * 0.45;

    this.voiceOrb.style.transform = `scale(${scale})`;
    requestAnimationFrame(() => this.animateOrbLevel());
  }

  processFirstAid(userText) {
    const vehicle = this.getVehicle ? this.getVehicle() : { brand: 'Lexus', model: { name: 'ES 350' }, year: '2016' };
    
    this.reasoningBox.style.display = 'block';
    this.firstAidCard.style.display = 'none';

    setTimeout(() => {
      const step1 = this.container.querySelector('.step-1');
      if (step1) step1.style.color = '#0C813D';
    }, 400);

    setTimeout(() => {
      const step2 = this.container.querySelector('.step-2');
      if (step2) step2.style.color = '#0C813D';
    }, 900);

    setTimeout(() => {
      const step3 = this.container.querySelector('.step-3');
      if (step3) step3.style.color = '#ffd700';
    }, 1400);

    setTimeout(() => {
      this.reasoningBox.style.display = 'none';
      const diagnosis = this.analyzeFirstAidSemantics(userText, vehicle);
      this.lastTranscript = userText;
      this.lastVehicle = vehicle;
      this.lastDiagnosis = diagnosis;
      this.renderFirstAidResponse(userText, vehicle, diagnosis);
    }, 1800);
  }

  analyzeFirstAidSemantics(text, vehicle) {
    const lower = text.toLowerCase();
    const carName = `${vehicle.year} ${vehicle.model.name}`;

    // Extract any spoken amounts for scam comparison
    let extractedScam = null;
    const priceMatch = lower.match(/(\d+[\.,]?\d*)\s*(k|thousand|million|m)/i) || lower.match(/(₦|naira)?\s*(\d{2,3},000)/i);
    if (priceMatch) extractedScam = priceMatch[0].toUpperCase();

    // 1. OVERHEATING / SMOKE / COOLANT / TEMPERATURE
    if (lower.includes('heat') || lower.includes('hot') || lower.includes('smoke') || lower.includes('temp') || lower.includes('boil') || lower.includes('water') || lower.includes('coolant')) {
      return {
        componentId: 'coolant',
        componentName: 'Radiator Cap & Coolant Expansion Reservoir',
        category: 'Thermal Overheating Emergency',
        diyFeasible: 'YES — WITH STRICT PRECAUTION (Wait 20 Minutes to Cool)',
        diyBadgeClass: 'diy-caution',
        precautions: {
          en: "CRITICAL: NEVER remove the radiator pressure cap while the engine is hot. Scalding pressurized steam (over 105°C) will burst out causing severe burns. Turn off engine and let idle cool for 20 minutes before inspecting.",
          pidgin: "DANGER DEY: No ever open that radiator cap when motor still hot! The hot steam and boiled water go blast your face and hands. Park, put off engine, wait 20 minutes make e cool first.",
          yoruba: "IKILO PATAKI: Ma se si ideri radiator nigba ti moto ba gbona. Omi gbigbona ati eefin yoo ta si o lara. Pa moto, duro fun ogun iseju ki o to fi owo kan.",
          hausa: "KADA KA BUDE: Kar ka kuskura ka bude murfin radiator a lokacin da motar ke da zafi. Zafin zai iya kona maka fuska da hannaye. Tsaya minti ashirin ta huce.",
          igbo: "KPỌKWASI ANYA: Emela ihe na-emeghe okpu radiator mgbe moto na-ekpo ọkụ. Mmiri ọkụ na anwụrụ ọkụ ga-agbawa n'ahụ gị. Gbanyụọ moto chere nkeji iri abụọ."
        },
        steps: {
          en: [
            "1. Shift to Park, pull over to a safe verge, and turn on emergency hazard flashers.",
            "2. Turn off the A/C immediately and switch cabin heater to maximum blower to pull heat away from engine block.",
            "3. Wait 20 minutes until the upper radiator hose is squishy and cool to touch.",
            "4. Check the transparent coolant overflow tank (see 3D beacon). If dry, top up with 50/50 ethylene glycol coolant or distilled water."
          ],
          pidgin: [
            "1. Shift gear go Park, pack motor for safe place, switch on hazard light.",
            "2. Off your AC immediately, turn on fan full make e pull heat commot for engine.",
            "3. Wait 20 minutes make engine cool down well-well.",
            "4. Look the transparent coolant plastic tank (look the 3D pin wey dey shine). If e dry, pour clean water or coolant reach the MAX line."
          ],
          yoruba: [
            "1. Gbe gear si Park, gbe moto duro si ibi ti o ni aabo, tan ina hazard.",
            "2. Pa AC kiakia, tan fan moto lati fa ooru kuro lara engine.",
            "3. Duro fun ogun iseju titi engine yoo fi tutu patapata.",
            "4. Wo inu ike coolant ti o wa lẹgbẹẹ engine (wo ibi ti 3D pin ti n tan). Bu omi mimọ tabi coolant si i de MAX line."
          ]
        },
        scamQuote: extractedScam ? `Mechanic Claim: ₦${extractedScam} for Head Gasket Skim` : "Roadside Mechanic Quote: ₦450,000 for Head Gasket & Skim",
        realCost: "₦18,000 (Relay/Hose) + ₦10,000 (Labor) = ₦28,000",
        savings: "₦422,000 PROTECTED"
      };
    }

    // 2. BATTERY / NO START / CLICKING / ELECTRICAL
    if (lower.includes('battery') || lower.includes('click') || lower.includes('start') || lower.includes('crank') || lower.includes('light') || lower.includes('dead') || lower.includes('key')) {
      return {
        componentId: 'battery',
        componentName: '12V Lead-Acid Battery & Terminal Clamps',
        category: 'Electrical Starting System Failure',
        diyFeasible: 'YES — 100% ROADSIDE DIY FEASIBLE',
        diyBadgeClass: 'diy-yes',
        precautions: {
          en: "PRECAUTION: Ensure ignition is completely off. When jump-starting or cleaning terminals, NEVER let metal wrenches bridge between the Positive (+) Red terminal and the car chassis frame, or a violent spark arc will occur.",
          pidgin: "PRECAUTION: Make sure key dey off. When you dey fix wire, no let iron touch the Red wire and the motor body together, otherwise fire go spark heavy.",
          yoruba: "IKILO: Rii daju pe o pa bọtini moto. Nigba ti o ba n so okun pọ, ma jẹ ki irin fọwọkan okun pupa ati ara moto papọ.",
          hausa: "HATTARA: Tabbatar cewa an kashe makulli. Kar ka bar karfe ya hada wayar ja da jikin mota.",
          igbo: "ỊDỌ AKA NA NTỊ: Hụ na agbanyụrụ igodo moto. Ekwela ka igwe metụ waya na-acha uhie uhie na ahụ moto ọnụ."
        },
        steps: {
          en: [
            "1. Open the bonnet (see 3D camera view) and inspect the two battery terminals for white powdery crust (acid corrosion).",
            "2. Pour hot warm water directly onto the terminal clamps to instantly dissolve acid buildup.",
            "3. Wiggle the clamps with your hand: if loose, tighten the 10mm terminal nut.",
            "4. If jump starting: connect RED clamp to Positive (+) first, then BLACK clamp to bare metal chassis ground."
          ],
          pidgin: [
            "1. Open bonnet (look the 3D screen e don show you where e dey). Check if white powder dey the battery head.",
            "2. Pour warm water for the battery head make e wash that white acid commot.",
            "3. Shake the wire with your hand: if e dey shake, take 10mm spanner tight am well.",
            "4. If you dey jump start: connect RED wire to (+) first, then connect BLACK wire to motor body."
          ],
          yoruba: [
            "1. Si bonnet moto (wo ibi ti 3D ti n fi han ọ). Wo boya eruku funfun wa lori ori battery.",
            "2. Da omi gbigbona die le ori battery naa lati fo gbogbo acid kuro.",
            "3. Gbọn okun naa pẹlu ọwọ rẹ: ti o ba n yẹra, fi spanner 10mm fa a le daadaa.",
            "4. Ti o ba n jump start: so okun PUPA si (+) lakọkọ, ki o to so okun DUDU si ara moto."
          ]
        },
        scamQuote: extractedScam ? `Mechanic Claim: ₦${extractedScam} for Starter Motor & Alternator Swap` : "Roadside Mechanic Quote: ₦220,000 for New Alternator & Starter",
        realCost: "₦3,000 (Terminal Clamp / Jump Start) = ₦3,000",
        savings: "₦217,000 PROTECTED"
      };
    }

    // 3. ENGINE OIL / PRESSURE / DIPSTICK / KNOCK / RATTLE
    if (lower.includes('oil') || lower.includes('dipstick') || lower.includes('rattle') || lower.includes('knock') || lower.includes('noise') || lower.includes('sound')) {
      return {
        componentId: 'oil_dipstick',
        componentName: 'Engine Oil Dipstick & Level Check',
        category: 'Engine Lubrication & Pressure Warning',
        diyFeasible: 'YES — ROADSIDE DIY FEASIBLE',
        diyBadgeClass: 'diy-yes',
        precautions: {
          en: "PRECAUTION: Park vehicle on completely level ground before checking oil. If the red oil pressure lamp illuminated while driving, DO NOT crank or rev the engine, or connecting rod bearings will seize.",
          pidgin: "PRECAUTION: Park motor for flat ground. If that red oil can light come on for dashboard, NO TRY drive am again otherwise engine go knock completely.",
          yoruba: "IKILO: Gbe moto duro si ilẹ tẹlẹjẹ. Ti ina epo pupa ba tan lori dashboard, ma ṣe wakọ mọ ki engine ma ba jona.",
          hausa: "HATTARA: Tsayar da motar a wuri mai fadi. Idan jan fitilar mai ya kawo, kar ka sake tada motar.",
          igbo: "ỊDỌ AKA NA NTỊ: Dọba moto n'ala dị larịị. Ọ bụrụ na ọkụ mmanụ na-acha uhie uhie agbanye, anwala ịnya ya ọzọ."
        },
        steps: {
          en: [
            "1. Turn off engine and locate the bright yellow ring dipstick (see 3D beacon).",
            "2. Pull the dipstick out completely and wipe clean with a tissue or clean cloth.",
            "3. Insert it all the way back in, then withdraw it to read the oil level between the two dots/crosshatches.",
            "4. If level is below the bottom dot, add 1 litre of recommended synthetic oil (5W-30) into the oil filler cap."
          ],
          pidgin: [
            "1. Off engine, look the yellow pull ring dipstick for the engine (look the 3D pin).",
            "2. Pull the dipstick commot, wipe am clean with tissue or dry rag.",
            "3. Chook am back inside reach the bottom, then pull am out again read where oil reach.",
            "4. If the oil dey below the first dot, pour 1 litre of correct 5W-30 engine oil inside the engine cap."
          ],
          yoruba: [
            "1. Pa engine, wo ibi ti dipstick ofeefe wa (wo 3D pin ti o n tọka si i).",
            "2. Fa dipstick naa jade, fi asọ mimọ nu u nù.",
            "3. Tun tì í wọle patapata, lẹhinna fa a jade lati wo ibi ti epo de.",
            "4. Ti epo ba wa ni isalẹ aami akọkọ, bu epo 5W-30 lita kan si i."
          ]
        },
        scamQuote: extractedScam ? `Mechanic Claim: ₦${extractedScam} for Full Engine Overhaul` : "Roadside Mechanic Quote: ₦1,200,000 for Engine Knock Overhaul",
        realCost: "₦8,500 (1L Synthetic Top-Up Oil) = ₦8,500",
        savings: "₦1,191,500 PROTECTED"
      };
    }

    // 4. BRAKES / SQUEAL / PEDAL SOFT / BRAKE FLUID
    if (lower.includes('brake') || lower.includes('stop') || lower.includes('squeal') || lower.includes('pedal') || lower.includes('soft') || lower.includes('grind')) {
      return {
        componentId: 'brake_fluid',
        componentName: 'Brake Master Cylinder Fluid Reservoir',
        category: 'Hydraulic Braking System Safety',
        diyFeasible: 'CAUTION — FLUID LEVEL CHECK ONLY',
        diyBadgeClass: 'diy-caution',
        precautions: {
          en: "DANGER: Brake fluid (DOT 4) is corrosive to car paint. Wash hands immediately if spilled. If your brake pedal sinks to the floorboards, DO NOT drive the car on high-speed roads—you have a hydraulic pressure leak.",
          pidgin: "DANGER: Brake oil dey peel motor paint! If your brake pedal dey sink go ground when you match am, NO DRIVE the motor! Brake leak dey, na tow truck you need.",
          yoruba: "EWU PATAKI: Epo brake ma n ba paint moto jẹ. Ti brake rẹ ba n wọle laisi diduro, ma ṣe wakọ lori titi mo—o ni jijo omi brake.",
          hausa: "HATTARA: Man birki yana bata fentin mota. Idan birkin ya kwanta a kasa, kar ka tuka motar.",
          igbo: "DANGER: Mmanụ brek na-emebi agba moto. Ọ bụrụ na brek gị ruru n'ala, anyala moto ahụ n'okporo ụzọ."
        },
        steps: {
          en: [
            "1. Inspect the translucent reservoir near the firewall (see 3D camera pin).",
            "2. Verify if the amber fluid level sits between MIN and MAX lines.",
            "3. If fluid is near MIN, your brake pads are worn down to backing plates, or a caliper brake hose has burst.",
            "4. Test pump the brake pedal 3 times with engine off: if it becomes firm and holds pressure, hydraulic booster is intact."
          ],
          pidgin: [
            "1. Look the clear plastic tank wey dey near windshield (look the 3D pin).",
            "2. Check if the brake oil reach between MIN and MAX line.",
            "3. If e dey near MIN, your brake pad don finish or brake pipe dey leak.",
            "4. Match the brake 3 times: if e hold tight, the master cylinder still dey okay."
          ],
          yoruba: [
            "1. Wo inu ike brake ti o wa nitosi windshield (wo 3D pin).",
            "2. Rii daju pe epo wa laarin MIN ati MAX.",
            "3. Ti epo ba kere ju, brake pad rẹ ti pari tabi pipe brake n jo.",
            "4. Tẹ brake lẹẹmẹta: ti o ba le daadaa, master cylinder rẹ wa ni pipe."
          ]
        },
        scamQuote: extractedScam ? `Mechanic Claim: ₦${extractedScam} for Master Booster & ABS Pump` : "Roadside Mechanic Quote: ₦350,000 for ABS Pump & Master Cylinder",
        realCost: "₦35,000 (Brembo Pads) + ₦10,000 (Bleed & Labor) = ₦45,000",
        savings: "₦305,000 PROTECTED"
      };
    }

    // 5. GEARBOX / TRANSMISSION / JERKING / SHIFTING
    return {
      componentId: 'bonnet_open',
      componentName: 'Automatic Transmission Control Solenoids',
      category: 'Drivetrain & Transmission Fluid Integrity',
      diyFeasible: 'YES — ELECTRONIC RE-ADAPTATION FEASIBLE',
      diyBadgeClass: 'diy-yes',
      precautions: {
        en: "PRECAUTION: Do not let roadside mechanics drain transmission fluid while hot. Overfilling or using generic Dexron fluid in CVT/Dual-Clutch gearboxes will permanently burn internal clutches.",
        pidgin: "PRECAUTION: No let mechanic open gear oil when motor hot. And make sure dem no put fake gear oil inside your gearbox.",
        yoruba: "IKILO: Ma jẹ ki mechanic da epo gear nu nigba ti o ba gbona, ki o si rii daju pe epo gidi ni won n lo.",
        hausa: "HATTARA: Kar ka bari makanike ya canza man giya a lokacin da take da zafi.",
        igbo: "ỊDỌ AKA NA NTỊ: Ekwela ka mekanik gbanwee mmanụ giya mgbe moto ka na-ekpo ọkụ."
      },
      steps: {
        en: [
          "1. Pull over safely, shift to Park, turn off ignition for 2 minutes to reset the transmission computer (TCM).",
          "2. Restart engine: if check engine lamp is off, the issue is an intermittent shift solenoid pressure drop.",
          "3. Perform manual shift test: gently move from P → R → N → D with brake depressed; observe if engagement takes under 1.5 seconds.",
          "4. Plan fluid drain and OEM shift solenoid swap at verified service center."
        ],
        pidgin: [
          "1. Pack motor, put gear for Park, off engine for 2 minutes make the computer reset.",
          "2. Start am again: if light no show, na small pressure drop for solenoid.",
          "3. Shift from P to R then D softly while you match brake; check if e take less than 2 seconds engage.",
          "4. Plan to buy original OEM gear oil and solenoid change am."
        ],
        yoruba: [
          "1. Gbe moto duro, fi si Park, pa engine fun iṣẹju meji lati tun kọmputa rẹ to.",
          "2. Tan an lẹẹkansi: ti ina check engine ko ba tan, iṣoro kekere ni.",
          "3. Yi gear lati P si R ati D pẹlu iṣọra lakoko ti o tẹ brake.",
          "4. Ra epo gear gidi ati solenoid lati fi rọpo rẹ."
        ]
      },
      scamQuote: extractedScam ? `Mechanic Claim: ₦${extractedScam} for Complete Gearbox Swap` : "Roadside Mechanic Quote: ₦850,000 for Complete Gearbox Swap",
      realCost: "₦48,000 (Shift Solenoid) + ₦22,000 (OEM ATF) = ₦70,000",
      savings: "₦780,000 PROTECTED"
    };
  }

  renderFirstAidResponse(userSpeech, vehicle, diagnosis) {
    this.firstAidCard.style.display = 'block';
    const lang = this.selectedLanguage;
    const precText = diagnosis.precautions[lang] || diagnosis.precautions.en;
    const stepsList = diagnosis.steps[lang] || diagnosis.steps.en;
    const carHeader = `${vehicle.year} ${vehicle.model.name}`;

    // Automatically trigger the 3D Scene camera to teleport and highlight the component!
    const scene = this.getScene3D ? this.getScene3D() : null;
    if (scene) {
      scene.focusFirstAidComponent(diagnosis.componentId);
    }

    this.firstAidCard.innerHTML = `
      <div class="card-status-header">
        <span class="pulse-red-dot"></span>
        <span class="first-aid-badge">${diagnosis.category.toUpperCase()}</span>
      </div>

      <!-- 3D Location Teleport Banner -->
      <div class="location-teleport-banner">
        <div class="teleport-icon">📍</div>
        <div class="teleport-text">
          <span class="teleport-label">3D ENGINE BAY LOCATION TELEPORT:</span>
          <span class="teleport-target">${diagnosis.componentName}</span>
        </div>
        <button id="btnReFocus3D" class="btn-refocus-pin">LOOK AT 3D PIN</button>
      </div>

      <!-- DIY Feasibility Banner -->
      <div class="diy-verdict-box ${diagnosis.diyBadgeClass}">
        <span class="diy-label">ROADSIDE DIY FEASIBILITY:</span>
        <span class="diy-val">${diagnosis.diyFeasible}</span>
      </div>

      <!-- Critical Precaution Alert -->
      <div class="precaution-box">
        <div class="precaution-title">⚠️ CRITICAL SAFETY PRECAUTIONS & HAZARDS:</div>
        <div class="precaution-body">${precText}</div>
      </div>

      <!-- Step-by-Step Roadside Action Plan -->
      <div class="first-aid-steps-box">
        <div class="steps-title">📋 EXACT STEP-BY-STEP ROADSIDE PROCEDURE:</div>
        <ol class="steps-ordered-list">
          ${stepsList.map(step => `<li>${step}</li>`).join('')}
        </ol>
      </div>

      <!-- Scam Shield Protected Cost -->
      <div class="scam-shield-summary">
        <div class="scam-row">
          <span class="scam-col-tag">⚠️ ${diagnosis.scamQuote}</span>
          <span class="honest-col-tag">✅ True OEM Cost: ${diagnosis.realCost}</span>
        </div>
        <div class="savings-total-pill">${diagnosis.savings}</div>
      </div>

      <!-- 1-Tap AutoContentment WhatsApp Dispatch -->
      <div class="first-aid-actions">
        <a href="https://wa.me/2348000000000?text=${encodeURIComponent(`EMERGENCY FIRST AID: My ${carHeader} broke down with: ${diagnosis.category}. The AI pinpointed ${diagnosis.componentName}. Please dispatch verified roadside parts/assistance to my Lagos location.`)}" target="_blank" class="btn-whatsapp-emergency">
          <span class="wa-em-icon">💬</span>
          <span>DISPATCH VERIFIED OEM PARTS VIA AUTOCONTENTMENT</span>
        </a>
      </div>
    `;

    const btnRefocus = this.firstAidCard.querySelector('#btnReFocus3D');
    if (btnRefocus && scene) {
      btnRefocus.addEventListener('click', () => {
        scene.focusFirstAidComponent(diagnosis.componentId);
      });
    }

    // Confetti celebration
    try {
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.65 },
        colors: ['#0C813D', '#ffd700', '#ffffff']
      });
    } catch (e) {}

    // Speech synthesis readout in selected language
    if ('speechSynthesis' in window) {
      try {
        const utterance = new SpeechSynthesisUtterance(
          `First aid response for your ${carHeader}. The issue is located at your ${diagnosis.componentName}. Notice: ${precText}`
        );
        utterance.rate = 1.02;
        window.speechSynthesis.speak(utterance);
      } catch (e) {}
    }

    this.firstAidCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
