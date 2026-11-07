export class CarSelector {
  constructor(containerEl, onCarChanged) {
    this.container = containerEl;
    this.onCarChanged = onCarChanged;
    
    this.carDatabase = {
      toyota: {
        name: "Toyota",
        models: [
          { id: "camry_muscle", name: "Camry ('Muscle' 2007–2011)", engine: "2.4L 2AZ-FE / 3.5L V6", redline: 6200, knownScams: "Roadside mechanics blame catalytic converter or claim bad gear for cold hesitation" },
          { id: "camry_spider", name: "Camry ('Spider' 2012–2017)", engine: "2.5L 2AR-FE / 3.5L V6", redline: 6400, knownScams: "Torque converter shudder misdiagnosed as complete transmission failure" },
          { id: "corolla_2014", name: "Corolla (2014–2021)", engine: "1.8L 2ZR-FE Valvematic", redline: 6500, knownScams: "CVT solenoid lag misdiagnosed as gearbox condemnation" },
          { id: "prado_txl", name: "Prado TXL (2014–2022)", engine: "2.7L 2TR / 4.0L V6 1GR", redline: 5800, knownScams: "Suspension KDSS warning misdiagnosed as complete shock replacement" }
        ]
      },
      honda: {
        name: "Honda",
        models: [
          { id: "accord_evil_spirit", name: "Accord ('Evil Spirit' 2008–2012)", engine: "2.4L K24Z2 / 3.5L V6", redline: 6800, knownScams: "VTC Actuator morning cold rattle misdiagnosed as crankshaft engine knock" },
          { id: "accord_2018", name: "Accord (2018–2022 Turbo)", engine: "1.5L Earth Dreams / 2.0L K20C4", redline: 6500, knownScams: "Fuel injector misfire or wastegate rattle misdiagnosed as blown head gasket" },
          { id: "civic_2016", name: "Civic (2016–2021)", engine: "1.5L Turbo / 2.0L", redline: 6600, knownScams: "AC compressor clutch failure misdiagnosed as full cooling system replacement" }
        ]
      },
      lexus: {
        name: "Lexus",
        models: [
          { id: "es350", name: "Lexus ES 350 (2007–2018)", engine: "3.5L V6 2GR-FE (272 hp)", redline: 6600, knownScams: "Rubber oil cooler pipe leak or transmission solenoid shudder charged as gearbox swap" },
          { id: "rx350", name: "Lexus RX 350 (2010–2021)", engine: "3.5L V6 2GR-FKS", redline: 6600, knownScams: "Steering rack electronic sensor play charged as ₦600k steering rack replacement" },
          { id: "is250", name: "Lexus IS 250 (2006–2015)", engine: "2.5L V6 4GR-FSE (Direct Injection)", redline: 6800, knownScams: "Carbon intake buildup charged as complete cylinder head replacement" }
        ]
      },
      mercedes: {
        name: "Mercedes-Benz",
        models: [
          { id: "c300_w205", name: "C300 4MATIC (W205 2015–2020)", engine: "2.0L Turbo M274 (241 hp)", redline: 6500, knownScams: "Auxiliary battery malfunction charged as alternator condemnation" },
          { id: "e350_w212", name: "E350 (W212 2010–2016)", engine: "3.5L V6 M272/M276", redline: 6600, knownScams: "Airmatic rear suspension level sensor charged as blown airbag suspension" },
          { id: "gle450", name: "GLE 450 (2020–2023)", engine: "3.0L Inline-6 Turbo EQ Boost", redline: 6500, knownScams: "48V mild hybrid starter-generator error charged as engine computer replacement" }
        ]
      },
      valmora: {
        name: "Valmora Bespoke GT",
        models: [
          { id: "valmora_gt", name: "Valmora Alba GT 1964 Coachbuilt", engine: "4.0L Hot-Vee V8 Twin-Turbo (610 bhp)", redline: 7800, knownScams: "Dry sump aeration or active exhaust actuator misdiagnosed" }
        ]
      }
    };

    this.selectedBrand = 'lexus';
    this.selectedModel = this.carDatabase.lexus.models[0];
    this.selectedYear = '2016';

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="car-selector-bar">
        <div class="selector-tag">
          <span class="selector-icon">🚗</span>
          <span>SELECT VEHICLE PROFILE:</span>
        </div>

        <div class="selector-controls">
          <div class="select-group">
            <label>BRAND</label>
            <select id="selectBrand" class="hud-select">
              <option value="lexus" selected>Lexus</option>
              <option value="toyota">Toyota</option>
              <option value="honda">Honda</option>
              <option value="mercedes">Mercedes-Benz</option>
              <option value="valmora">Valmora Bespoke GT</option>
            </select>
          </div>

          <div class="select-group">
            <label>MODEL</label>
            <select id="selectModel" class="hud-select">
              <!-- Injected dynamically -->
            </select>
          </div>

          <div class="select-group">
            <label>YEAR</label>
            <select id="selectYear" class="hud-select">
              ${[2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2010, 2008].map(y => `<option value="${y}" ${y === 2016 ? 'selected' : ''}>${y}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="active-car-badge" id="activeCarDisplay">
          <span class="active-brand">LEXUS ES 350</span>
          <span class="active-engine">3.5L V6 2GR-FE</span>
        </div>
      </div>
    `;

    this.brandSelect = this.container.querySelector('#selectBrand');
    this.modelSelect = this.container.querySelector('#selectModel');
    this.yearSelect = this.container.querySelector('#selectYear');
    this.carDisplay = this.container.querySelector('#activeCarDisplay');

    this.populateModels();
    this.bindEvents();
  }

  populateModels() {
    const brandData = this.carDatabase[this.selectedBrand];
    this.modelSelect.innerHTML = brandData.models.map((m, idx) => `
      <option value="${m.id}" ${idx === 0 ? 'selected' : ''}>${m.name}</option>
    `).join('');
    this.selectedModel = brandData.models[0];
    this.updateDisplay();
  }

  bindEvents() {
    this.brandSelect.addEventListener('change', (e) => {
      this.selectedBrand = e.target.value;
      this.populateModels();
      this.notifyChange();
    });

    this.modelSelect.addEventListener('change', (e) => {
      const modelId = e.target.value;
      this.selectedModel = this.carDatabase[this.selectedBrand].models.find(m => m.id === modelId);
      this.updateDisplay();
      this.notifyChange();
    });

    this.yearSelect.addEventListener('change', (e) => {
      this.selectedYear = e.target.value;
      this.updateDisplay();
      this.notifyChange();
    });
  }

  updateDisplay() {
    this.carDisplay.innerHTML = `
      <span class="active-brand">${this.selectedYear} ${this.selectedModel.name.toUpperCase()}</span>
      <span class="active-engine">${this.selectedModel.engine}</span>
    `;
  }

  notifyChange() {
    if (this.onCarChanged) {
      this.onCarChanged({
        brand: this.selectedBrand,
        model: this.selectedModel,
        year: this.selectedYear
      });
    }
  }

  getSelectedVehicle() {
    return {
      brand: this.selectedBrand,
      model: this.selectedModel,
      year: this.selectedYear
    };
  }
}
