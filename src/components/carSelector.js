export class CarSelector {
  constructor(containerEl, onCarChanged) {
    this.container = containerEl;
    this.onCarChanged = onCarChanged;
    
    this.carDatabase = {
      mercedes: {
        name: "Mercedes-Benz",
        models: [
          { 
            id: "e350_w212", 
            name: "E350 (W212 2010–2016)", 
            engine: "3.5L Direct Injection V6 M276 (302 hp)", 
            redline: 6600, 
            oemColor: "Iridium Silver Metallic (Code 775)", 
            oemHex: 0xBAC0C6,
            oemColorFamily: "Silver",
            image: "/images/cars/mercedes_e350.jpg",
            engineImage: "/images/engines/engine_mercedes_v6.jpg",
            knownScams: "Airmatic rear suspension level sensor charged as ₦1.2M blown airbag suspension",
            spec: "302 bhp • 370 Nm • 7G-Tronic Plus • Executive Saloon"
          },
          { 
            id: "c300_w205", 
            name: "C300 4MATIC (W205 2015–2020)", 
            engine: "2.0L Turbo M274 (241 hp)", 
            redline: 6500, 
            oemColor: "Polar White (Code 149)", 
            oemHex: 0xF6F8FA,
            oemColorFamily: "White",
            image: "/images/cars/mercedes_c300.jpg",
            engineImage: "/images/engines/engine_mercedes_v6.jpg",
            knownScams: "Auxiliary battery malfunction charged as alternator condemnation",
            spec: "241 bhp • 370 Nm • 9G-Tronic • 4MATIC All-Wheel Drive"
          },
          { 
            id: "gle450", 
            name: "GLE 450 (2020–2023)", 
            engine: "3.0L Inline-6 Turbo EQ Boost (362 hp)", 
            redline: 6500, 
            oemColor: "Obsidian Black Metallic (Code 197)", 
            oemHex: 0x181A1D,
            oemColorFamily: "Black",
            image: "/images/cars/mercedes_gle450.jpg",
            engineImage: "/images/engines/engine_mercedes_v6.jpg",
            knownScams: "48V mild hybrid starter-generator error charged as engine computer replacement",
            spec: "362 bhp • 500 Nm • 4MATIC AWD • Luxury High-Riding SUV"
          }
        ]
      },
      lexus: {
        name: "Lexus",
        models: [
          { 
            id: "es350", 
            name: "Lexus ES 350 (2007–2018)", 
            engine: "3.5L V6 2GR-FE (272 hp)", 
            redline: 6600, 
            oemColor: "Eminent White Pearl (Code 085)", 
            oemHex: 0xEEEEF0,
            oemColorFamily: "White",
            image: "/images/cars/lexus_es350.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "Rubber oil cooler pipe leak or transmission solenoid shudder charged as gearbox swap",
            spec: "272 bhp • 344 Nm • 6-Speed ECT-i • Front-Wheel Drive"
          },
          { 
            id: "rx350", 
            name: "Lexus RX 350 (2010–2021)", 
            engine: "3.5L V6 2GR-FKS (295 hp)", 
            redline: 6600, 
            oemColor: "Nebula Gray Pearl (Code 1H9)", 
            oemHex: 0x5C6067,
            oemColorFamily: "Gray",
            image: "/images/cars/lexus_rx350.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "Steering rack electronic sensor play charged as ₦600k steering rack replacement",
            spec: "295 bhp • 362 Nm • 8-Speed Direct Shift • Luxury Crossover SUV"
          },
          { 
            id: "is250", 
            name: "Lexus IS 250 (2006–2015)", 
            engine: "2.5L V6 4GR-FSE (204 hp)", 
            redline: 6800, 
            oemColor: "Atomic Silver (Code 1J7)", 
            oemHex: 0xACB0B6,
            oemColorFamily: "Silver",
            image: "/images/cars/lexus_es350.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "Carbon intake valve buildup charged as complete cylinder head replacement",
            spec: "204 bhp • 251 Nm • 6-Speed Sequential • Rear-Wheel Drive"
          }
        ]
      },
      toyota: {
        name: "Toyota",
        models: [
          { 
            id: "prado_txl", 
            name: "Prado TXL (2014–2022)", 
            engine: "4.0L V6 1GR-FE / 2.7L 2TR", 
            redline: 5800, 
            oemColor: "Super White II (Code 040)", 
            oemHex: 0xF7F9FA,
            oemColorFamily: "White",
            image: "/images/cars/toyota_prado.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "Suspension KDSS valve warning misdiagnosed as complete shock absorber condemnation",
            spec: "271 bhp • 381 Nm • Full-Time 4WD • Kinetic Dynamic Suspension"
          },
          { 
            id: "camry_spider", 
            name: "Camry ('Spider' 2012–2017)", 
            engine: "2.5L 2AR-FE / 3.5L 2GR", 
            redline: 6400, 
            oemColor: "Celestial Silver Metallic (Code 1J9)", 
            oemHex: 0xC4C8CE,
            oemColorFamily: "Silver",
            image: "/images/cars/toyota_camry.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "Torque converter shudder misdiagnosed as complete transmission rebuild",
            spec: "178 bhp • 230 Nm • 6-Speed Super ECT • Front-Wheel Drive"
          },
          { 
            id: "camry_muscle", 
            name: "Camry ('Muscle' 2007–2011)", 
            engine: "2.4L 2AZ-FE / 3.5L V6", 
            redline: 6200, 
            oemColor: "Magnetic Gray Metallic (Code 1G3)", 
            oemHex: 0x4D5156,
            oemColorFamily: "Gray",
            image: "/images/cars/toyota_camry.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "Roadside mechanics condemn catalytic converter or claim bad gear for cold hesitation",
            spec: "158 bhp • 218 Nm • 5-Speed Automatic • Front-Wheel Drive"
          },
          { 
            id: "corolla_2014", 
            name: "Corolla (2014–2021)", 
            engine: "1.8L 2ZR-FE Valvematic", 
            redline: 6500, 
            oemColor: "Classic Silver Metallic (Code 1F7)", 
            oemHex: 0xD3D7DC,
            oemColorFamily: "Silver",
            image: "/images/cars/toyota_camry.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "CVT solenoid lag misdiagnosed as gearbox condemnation",
            spec: "138 bhp • 173 Nm • Super CVT-i • Front-Wheel Drive"
          }
        ]
      },
      honda: {
        name: "Honda",
        models: [
          { 
            id: "accord_evil_spirit", 
            name: "Accord ('Evil Spirit' 2008–2012)", 
            engine: "2.4L K24Z2 / 3.5L V6", 
            redline: 6800, 
            oemColor: "Alabaster Silver Metallic (Code NH700M)", 
            oemHex: 0xCCD1D7,
            oemColorFamily: "Silver",
            image: "/images/cars/honda_accord.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "VTC Actuator morning cold rattle misdiagnosed as crankshaft engine knock",
            spec: "190 bhp • 222 Nm • 5-Speed Automatic • Front-Wheel Drive"
          },
          { 
            id: "accord_2018", 
            name: "Accord (2018–2022 Turbo)", 
            engine: "1.5L Earth Dreams / 2.0L K20C4", 
            redline: 6500, 
            oemColor: "Platinum White Pearl (Code NH883P)", 
            oemHex: 0xF3F5F7,
            oemColorFamily: "White",
            image: "/images/cars/honda_accord.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "Fuel injector misfire or wastegate rattle misdiagnosed as blown head gasket",
            spec: "192 bhp • 260 Nm • Direct-Injected Turbo • Front-Wheel Drive"
          },
          { 
            id: "civic_2016", 
            name: "Civic (2016–2021)", 
            engine: "1.5L Turbo / 2.0L", 
            redline: 6600, 
            oemColor: "Modern Steel Metallic (Code NH797M)", 
            oemHex: 0x484B50,
            oemColorFamily: "Gray",
            image: "/images/cars/honda_accord.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "AC compressor clutch failure misdiagnosed as full cooling system replacement",
            spec: "174 bhp • 220 Nm • M-CVT • Sport Sedan"
          }
        ]
      },
      valmora: {
        name: "Valmora Bespoke GT",
        models: [
          { 
            id: "valmora_gt", 
            name: "Valmora Alba GT 1964 Coachbuilt", 
            engine: "4.0L Hot-Vee V8 Twin-Turbo (610 bhp)", 
            redline: 7800, 
            oemColor: "AutoContentment Bespoke Emerald (Code AC01)", 
            oemHex: 0x0C813D,
            oemColorFamily: "Emerald",
            image: "/images/cars/mercedes_e350.jpg",
            engineImage: "/images/engines/engine_mercedes_v6.jpg",
            knownScams: "Dry sump aeration or active exhaust actuator misdiagnosed",
            spec: "610 bhp • 800 Nm • 8-Speed Dual-Clutch • RWD"
          }
        ]
      }
    };

    // Default to Mercedes-Benz E350
    this.selectedBrand = 'mercedes';
    this.selectedModel = this.carDatabase.mercedes.models[0];
    this.selectedYear = '2014';

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
              <option value="mercedes" selected>Mercedes-Benz</option>
              <option value="lexus">Lexus</option>
              <option value="toyota">Toyota</option>
              <option value="honda">Honda</option>
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
              ${[2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2010, 2008].map(y => `<option value="${y}" ${y === 2014 ? 'selected' : ''}>${y}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="active-car-badge" id="activeCarDisplay">
          <span class="active-brand">MERCEDES-BENZ E350</span>
          <span class="active-engine">3.5L V6 M276 (302 hp)</span>
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
