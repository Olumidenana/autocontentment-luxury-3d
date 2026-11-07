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
            bodyType: "sedan",
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
            bodyType: "sedan",
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
            bodyType: "mercedes",
            image: "/images/cars/mercedes_gle450.jpg",
            engineImage: "/images/engines/engine_mercedes_v6.jpg",
            knownScams: "48V mild hybrid starter-generator error charged as engine computer replacement",
            spec: "362 bhp • 500 Nm • 4MATIC AWD • Luxury High-Riding SUV"
          },
          { 
            id: "g63_amg", 
            name: "G63 AMG (W463 2019–2024)", 
            engine: "4.0L V8 Biturbo M177 (577 hp)", 
            redline: 7000, 
            oemColor: "Designo Magno Night Black (Code 056)", 
            oemHex: 0x121315,
            oemColorFamily: "Matte Black",
            bodyType: "mercedes",
            image: "/images/cars/mercedes_gle450.jpg",
            engineImage: "/images/engines/engine_mercedes_v6.jpg",
            knownScams: "Intercooler secondary coolant air lock charged as twin-turbo failure",
            spec: "577 bhp • 850 Nm • AMG Speedshift TCT 9G • 4MATIC Heavy SUV"
          },
          { 
            id: "s550_w222", 
            name: "S550 (W222 2014–2020)", 
            engine: "4.7L V8 Twin-Turbo M278 (449 hp)", 
            redline: 6500, 
            oemColor: "Magnetite Black Metallic (Code 183)", 
            oemHex: 0x1A1C1E,
            oemColorFamily: "Black",
            bodyType: "sedan",
            image: "/images/cars/mercedes_e350.jpg",
            engineImage: "/images/engines/engine_mercedes_v6.jpg",
            knownScams: "Camshaft position sensor oil creep charged as full engine harness swap",
            spec: "449 bhp • 700 Nm • 7G-Tronic • Flagship Luxury Saloon"
          },
          { 
            id: "cla250", 
            name: "CLA 250 (2014–2019)", 
            engine: "2.0L Turbo M270 (208 hp)", 
            redline: 6500, 
            oemColor: "Jupiter Red (Code 589)", 
            oemHex: 0x9E1B22,
            oemColorFamily: "Red",
            bodyType: "sedan",
            image: "/images/cars/mercedes_c300.jpg",
            engineImage: "/images/engines/engine_mercedes_v6.jpg",
            knownScams: "Dual-clutch transmission conductor plate charged as gearbox replacement",
            spec: "208 bhp • 350 Nm • 7-Speed DCT • Four-Door Coupe"
          }
        ]
      },
      toyota: {
        name: "Toyota",
        models: [
          { 
            id: "camry_muscle", 
            name: "Camry ('Muscle' 2007–2011)", 
            engine: "2.4L 2AZ-FE / 3.5L V6 2GR-FE", 
            redline: 6200, 
            oemColor: "Magnetic Gray Metallic (Code 1G3)", 
            oemHex: 0x4D5156,
            oemColorFamily: "Gray",
            bodyType: "sedan",
            image: "/images/cars/toyota_camry.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "Roadside mechanics condemn catalytic converter or claim bad gear for cold hesitation",
            spec: "158 bhp • 218 Nm • 5-Speed Automatic • Front-Wheel Drive"
          },
          { 
            id: "camry_spider", 
            name: "Camry ('Spider' 2012–2017)", 
            engine: "2.5L 2AR-FE / 3.5L 2GR-FE", 
            redline: 6400, 
            oemColor: "Celestial Silver Metallic (Code 1J9)", 
            oemHex: 0xC4C8CE,
            oemColorFamily: "Silver",
            bodyType: "sedan",
            image: "/images/cars/toyota_camry.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "Torque converter shudder misdiagnosed as complete transmission rebuild",
            spec: "178 bhp • 230 Nm • 6-Speed Super ECT • Front-Wheel Drive"
          },
          { 
            id: "camry_2018", 
            name: "Camry (2018–2024)", 
            engine: "2.5L Dynamic Force A25A (203 hp)", 
            redline: 6600, 
            oemColor: "Wind Chill Pearl (Code 089)", 
            oemHex: 0xF2F4F7,
            oemColorFamily: "White",
            bodyType: "sedan",
            image: "/images/cars/toyota_camry.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "Coolant bypass valve error code P2681 misdiagnosed as blown head gasket",
            spec: "203 bhp • 250 Nm • 8-Speed Direct Shift • Modern Saloon"
          },
          { 
            id: "corolla_2009", 
            name: "Corolla (2009–2013)", 
            engine: "1.8L 1ZZ-FE Dual VVT-i", 
            redline: 6400, 
            oemColor: "Classic Silver Metallic (Code 1F7)", 
            oemHex: 0xCBD0D6,
            oemColorFamily: "Silver",
            bodyType: "sedan",
            image: "/images/cars/toyota_camry.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "Intake manifold gasket vacuum leak misdiagnosed as burnt valves",
            spec: "132 bhp • 174 Nm • 4-Speed Automatic • Reliable Compact"
          },
          { 
            id: "corolla_2014", 
            name: "Corolla (2014–2021)", 
            engine: "1.8L 2ZR-FE Valvematic", 
            redline: 6500, 
            oemColor: "Super White (Code 040)", 
            oemHex: 0xFAFAFA,
            oemColorFamily: "White",
            bodyType: "sedan",
            image: "/images/cars/toyota_camry.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "CVT solenoid lag misdiagnosed as gearbox condemnation",
            spec: "138 bhp • 173 Nm • CVTi-S Automatic • Front-Wheel Drive"
          },
          { 
            id: "prado_txl", 
            name: "Prado TXL (2014–2022)", 
            engine: "4.0L V6 1GR-FE / 2.7L 2TR", 
            redline: 5800, 
            oemColor: "Blizzard Pearl (Code 070)", 
            oemHex: 0xEEEEEE,
            oemColorFamily: "White",
            bodyType: "mercedes",
            image: "/images/cars/toyota_prado.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "Suspension KDSS valve warning misdiagnosed as complete shock absorber condemnation",
            spec: "271 bhp • 381 Nm • Full-Time 4WD • Kinetic Dynamic Suspension"
          },
          { 
            id: "highlander_2014", 
            name: "Highlander (2014–2021)", 
            engine: "3.5L V6 2GR-FKS (295 hp)", 
            redline: 6600, 
            oemColor: "Midnight Black Metallic (Code 218)", 
            oemHex: 0x161719,
            oemColorFamily: "Black",
            bodyType: "mercedes",
            image: "/images/cars/toyota_prado.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "Transfer case oil seal leak misdiagnosed as cracked 4WD transmission",
            spec: "295 bhp • 357 Nm • 8-Speed Direct Shift • 3-Row Midsize SUV"
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
            bodyType: "sedan",
            image: "/images/cars/lexus_es350.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "Rubber oil cooler pipe leak or transmission solenoid shudder charged as gearbox swap",
            spec: "272 bhp • 344 Nm • 6-Speed ECT-i • Front-Wheel Drive"
          },
          { 
            id: "es350_2019", 
            name: "Lexus ES 350 (2019–2024)", 
            engine: "3.5L V6 2GR-FKS (302 hp)", 
            redline: 6600, 
            oemColor: "Atomic Silver (Code 1J7)", 
            oemHex: 0xACB0B6,
            oemColorFamily: "Silver",
            bodyType: "sedan",
            image: "/images/cars/lexus_es350.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "Direct injection high-pressure fuel pump tick misdiagnosed as rod knock",
            spec: "302 bhp • 362 Nm • 8-Speed Direct Shift • Luxury Executive Saloon"
          },
          { 
            id: "rx350", 
            name: "Lexus RX 350 (2010–2021)", 
            engine: "3.5L V6 2GR-FKS (295 hp)", 
            redline: 6600, 
            oemColor: "Nebula Gray Pearl (Code 1H9)", 
            oemHex: 0x5C6067,
            oemColorFamily: "Gray",
            bodyType: "mercedes",
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
            oemColor: "Matador Red Mica (Code 3R1)", 
            oemHex: 0x8B111A,
            oemColorFamily: "Red",
            bodyType: "sedan",
            image: "/images/cars/lexus_es350.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "Carbon intake valve buildup charged as complete cylinder head replacement",
            spec: "204 bhp • 251 Nm • 6-Speed Sequential • Rear-Wheel Drive"
          },
          { 
            id: "gx460", 
            name: "Lexus GX 460 (2010–2023)", 
            engine: "4.6L V8 1UR-FE (301 hp)", 
            redline: 6000, 
            oemColor: "Starfire Pearl (Code 077)", 
            oemHex: 0xF7F8F9,
            oemColorFamily: "White",
            bodyType: "mercedes",
            image: "/images/cars/lexus_rx350.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "Secondary air injection pump valve failure misdiagnosed as catalytic converter failure",
            spec: "301 bhp • 446 Nm • Full-Time 4WD • Body-on-Frame V8 SUV"
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
            bodyType: "sedan",
            image: "/images/cars/honda_accord.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "VTC Actuator morning cold rattle misdiagnosed as crankshaft engine knock",
            spec: "190 bhp • 222 Nm • 5-Speed Automatic • Front-Wheel Drive"
          },
          { 
            id: "accord_2013", 
            name: "Accord (2013–2017)", 
            engine: "2.4L Earth Dreams K24W / 3.5L V6", 
            redline: 6800, 
            oemColor: "Modern Steel Metallic (Code NH797M)", 
            oemHex: 0x484B50,
            oemColorFamily: "Gray",
            bodyType: "sedan",
            image: "/images/cars/honda_accord.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "Starter motor solenoid click misdiagnosed as seized engine flywheel",
            spec: "185 bhp • 245 Nm • CVT Automatic • Executive Sedan"
          },
          { 
            id: "accord_2018", 
            name: "Accord (2018–2022 Turbo)", 
            engine: "1.5L Earth Dreams / 2.0L K20C4", 
            redline: 6500, 
            oemColor: "Platinum White Pearl (Code NH883P)", 
            oemHex: 0xF3F5F7,
            oemColorFamily: "White",
            bodyType: "sedan",
            image: "/images/cars/honda_accord.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "Fuel injector misfire or wastegate rattle misdiagnosed as blown head gasket",
            spec: "192 bhp • 260 Nm • Direct-Injected Turbo • Front-Wheel Drive"
          },
          { 
            id: "civic_2016", 
            name: "Civic (2016–2021)", 
            engine: "1.5L Turbo / 2.0L VTEC", 
            redline: 6600, 
            oemColor: "Rallye Red (Code R513)", 
            oemHex: 0xC41820,
            oemColorFamily: "Red",
            bodyType: "sedan",
            image: "/images/cars/honda_accord.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "AC compressor clutch failure misdiagnosed as full cooling system replacement",
            spec: "174 bhp • 220 Nm • M-CVT • Sport Sedan"
          },
          { 
            id: "crv_2017", 
            name: "CR-V (2017–2023)", 
            engine: "1.5L Turbo Earth Dreams (190 hp)", 
            redline: 6500, 
            oemColor: "Lunar Silver Metallic (Code NH830M)", 
            oemHex: 0xC8CDD3,
            oemColorFamily: "Silver",
            bodyType: "mercedes",
            image: "/images/cars/toyota_prado.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "Fuel dilution sensor trigger misdiagnosed as full turbocharger failure",
            spec: "190 bhp • 243 Nm • Real Time AWD • Compact Luxury SUV"
          }
        ]
      },
      valmora: {
        name: "Sports GT & Supercars",
        models: [
          { 
            id: "ferrari_portofino", 
            name: "Ferrari Portofino M (2019–2024)", 
            engine: "3.9L Twin-Turbo 90° V8 F154 (612 hp)", 
            redline: 7500, 
            oemColor: "Rosso Corsa Racing Red (Code FER322)", 
            oemHex: 0xC41E3A,
            oemColorFamily: "Rosso Corsa",
            bodyType: "gt_sports",
            image: "/images/cars/mercedes_e350.jpg",
            engineImage: "/images/engines/engine_v6_bay.jpg",
            knownScams: "High-pressure direct injection rail sensor misdiagnosed as blown cylinder head",
            spec: "612 bhp • 760 Nm • 8-Speed Dual-Clutch • 320 km/h Grand Tourer"
          },
          { 
            id: "valmora_gt", 
            name: "Valmora Alba GT 1964 Coachbuilt", 
            engine: "4.0L Hot-Vee V8 Twin-Turbo (610 bhp)", 
            redline: 7800, 
            oemColor: "AutoContentment Bespoke Emerald (Code AC01)", 
            oemHex: 0x0C813D,
            oemColorFamily: "Emerald",
            bodyType: "gt_sports",
            image: "/images/cars/mercedes_e350.jpg",
            engineImage: "/images/engines/engine_mercedes_v6.jpg",
            knownScams: "Dry sump aeration or active exhaust actuator misdiagnosed as engine knock",
            spec: "610 bhp • 800 Nm • 8-Speed Dual-Clutch • RWD Coachbuilt Grand Tourer"
          }
        ]
      }
    };

    // Default to Photorealistic Sports Car (Ferrari Portofino 2019 - SolidWorks & Blender Reference)
    this.selectedBrand = 'valmora';
    this.selectedModel = this.carDatabase.valmora.models[0];
    this.selectedYear = '2019';

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="car-selector-bar">
        <div class="selector-tag">
          <span class="selector-icon">🏎️</span>
          <span>SELECT VEHICLE PROFILE:</span>
        </div>

        <div class="selector-controls">
          <div class="select-group">
            <label>BRAND</label>
            <select id="selectBrand" class="hud-select">
              <option value="valmora" selected>Sports GT & Supercars (Portofino / Valmora)</option>
              <option value="mercedes">Mercedes-Benz (6 Models)</option>
              <option value="toyota">Toyota (7 Models)</option>
              <option value="lexus">Lexus (5 Models)</option>
              <option value="honda">Honda (5 Models)</option>
            </select>
          </div>

          <div class="select-group">
            <label>MODEL & YEAR</label>
            <select id="selectModel" class="hud-select">
              <!-- Injected dynamically -->
            </select>
          </div>

          <div class="select-group">
            <label>OEM FACTORY PAINT</label>
            <div class="oem-color-preview-badge" id="oemColorBadge">
              <span class="oem-color-dot" id="oemColorDot"></span>
              <span class="oem-color-name" id="oemColorName">Rosso Corsa</span>
            </div>
          </div>
        </div>

        <!-- Real-Time Selected Car Badge -->
        <div class="active-car-badge" id="activeCarBadge">
          <span class="badge-title" id="badgeCarName">Ferrari Portofino M (2019–2024)</span>
          <span class="badge-engine" id="badgeEngineName">3.9L Twin-Turbo 90° V8 F154 (612 hp)</span>
        </div>
      </div>
    `;

    this.brandSelect = this.container.querySelector('#selectBrand');
    this.modelSelect = this.container.querySelector('#selectModel');
    this.colorDot = this.container.querySelector('#oemColorDot');
    this.colorName = this.container.querySelector('#oemColorName');
    this.badgeCarName = this.container.querySelector('#badgeCarName');
    this.badgeEngineName = this.container.querySelector('#badgeEngineName');

    this.populateModels('valmora');
    this.bindEvents();
    this.updateDisplay();
  }

  populateModels(brandKey) {
    const brandData = this.carDatabase[brandKey];
    if (!brandData) return;

    this.modelSelect.innerHTML = brandData.models.map(m => `
      <option value="${m.id}" ${m.id === this.selectedModel.id ? 'selected' : ''}>
        ${m.name}
      </option>
    `).join('');

    this.selectedModel = brandData.models[0];
  }

  bindEvents() {
    this.brandSelect.addEventListener('change', (e) => {
      this.selectedBrand = e.target.value;
      this.populateModels(this.selectedBrand);
      this.updateDisplay();
      this.notifyChange();
    });

    this.modelSelect.addEventListener('change', (e) => {
      const modelId = e.target.value;
      const brandData = this.carDatabase[this.selectedBrand];
      const model = brandData.models.find(m => m.id === modelId);
      if (model) {
        this.selectedModel = model;
        this.updateDisplay();
        this.notifyChange();
      }
    });
  }

  updateDisplay() {
    if (!this.selectedModel) return;

    this.badgeCarName.textContent = `${this.carDatabase[this.selectedBrand].name} ${this.selectedModel.name}`;
    this.badgeEngineName.textContent = this.selectedModel.engine;

    if (this.colorDot && this.colorName) {
      const hexStr = '#' + this.selectedModel.oemHex.toString(16).padStart(6, '0');
      this.colorDot.style.backgroundColor = hexStr;
      this.colorDot.style.boxShadow = `0 0 10px ${hexStr}`;
      this.colorName.textContent = this.selectedModel.oemColor;
    }
  }

  notifyChange() {
    if (this.onCarChanged) {
      this.onCarChanged({
        brand: this.selectedBrand,
        brandName: this.carDatabase[this.selectedBrand].name,
        model: this.selectedModel
      });
    }
  }

  getSelectedVehicle() {
    return {
      brand: this.selectedBrand,
      brandName: this.carDatabase[this.selectedBrand].name,
      model: this.selectedModel
    };
  }
}
