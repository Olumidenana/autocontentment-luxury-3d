import * as THREE from 'three';

export class Scene3D {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    
    this.carGroup = new THREE.Group();
    this.bonnetGroup = new THREE.Group();
    this.engineBayGroup = new THREE.Group();
    this.wheels = [];
    this.firstAidPins = {};
    this.dustSheet = null;
    this.isBonnetOpen = false;
    this.autoRotate = false;
    this.activePin = null;

    // Camera targets for smooth cinematic fly-through
    this.cameraTargets = {
      exterior:    { pos: new THREE.Vector3(5.2, 1.8, 5.2), lookAt: new THREE.Vector3(0, 0.3, 0) },
      bonnet_open: { pos: new THREE.Vector3(2.4, 2.1, 1.2), lookAt: new THREE.Vector3(1.2, 0.35, 0) },
      battery:     { pos: new THREE.Vector3(1.6, 1.4, 0.8), lookAt: new THREE.Vector3(1.15, 0.45, 0.45) },
      coolant:     { pos: new THREE.Vector3(2.2, 1.2, 0.5), lookAt: new THREE.Vector3(1.75, 0.38, 0.35) },
      oil_dipstick:{ pos: new THREE.Vector3(1.7, 1.5, 0.2), lookAt: new THREE.Vector3(1.3, 0.45, 0.0) },
      brake_fluid: { pos: new THREE.Vector3(1.3, 1.5, -0.6), lookAt: new THREE.Vector3(0.85, 0.5, -0.4) },
      transmission:{ pos: new THREE.Vector3(1.1, 1.1, -0.2), lookAt: new THREE.Vector3(0.5, 0.15, 0.0) },
      wheel:       { pos: new THREE.Vector3(1.8, 0.3, 1.8), lookAt: new THREE.Vector3(1.38, -0.22, 1.0) },
      xray:        { pos: new THREE.Vector3(4.2, 2.4, 4.2), lookAt: new THREE.Vector3(0, 0.3, 0) }
    };

    this.currentCameraTarget = this.cameraTargets.exterior;
    this.currentLookAt = new THREE.Vector3(0, 0.3, 0);
    this.targetMouse = { x: 0, y: 0 };
    this.mouse = { x: 0, y: 0 };
    this.bodyMaterials = [];
    this.currentPaintColor = 0x7A0016; // Oxblood Rosso from Aman's video (or 0x0C813D Emerald)

    this.init();
  }

  init() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    const ext = this.cameraTargets.exterior;
    this.camera.position.copy(ext.pos);
    this.camera.lookAt(ext.lookAt);

    this.setupLighting();
    this.buildStudioShowroom();
    this.buildGrandTourerBody();
    this.buildDetailedEngineBay();
    this.buildDustSheet();
    this.setupEvents();
    this.animate();
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambient);

    // Studio Key Overhead Light
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(6, 10, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0001;
    this.scene.add(keyLight);

    // Rim Silhouette Light (highlights the curved fenders & bonnet)
    const rimLight = new THREE.DirectionalLight(0x0C813D, 2.2);
    rimLight.position.set(-6, 5, -6);
    this.scene.add(rimLight);

    // Front Grille Fill Light
    const frontFill = new THREE.DirectionalLight(0xffeedd, 1.4);
    frontFill.position.set(7, 1.5, 0);
    this.scene.add(frontFill);

    // Engine Bay Dedicated Inspection Spotlight
    this.engineSpotlight = new THREE.SpotLight(0xffffff, 0, 10, Math.PI / 4, 0.3);
    this.engineSpotlight.position.set(1.4, 4.0, 0);
    this.engineSpotlight.target.position.set(1.2, 0.3, 0);
    this.scene.add(this.engineSpotlight);
    this.scene.add(this.engineSpotlight.target);
  }

  buildStudioShowroom() {
    // Reflective Museum / Showroom Floor
    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x080b10,
      roughness: 0.22,
      metalness: 0.72
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.52;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Grid Matrix Pattern
    const grid = new THREE.PolarGridHelper(14, 16, 8, 32, 0x0C813D, 0x1f2937);
    grid.position.y = -0.51;
    grid.material.opacity = 0.28;
    grid.material.transparent = true;
    this.scene.add(grid);

    // Contact Ground Shadow
    const shadowGeo = new THREE.PlaneGeometry(5.4, 2.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.85
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, -0.505, 0);
    this.scene.add(shadow);
  }

  buildGrandTourerBody() {
    // 1. Physically-Based Clearcoat Car Paint Material
    const paintMat = new THREE.MeshPhysicalMaterial({
      color: this.currentPaintColor,
      metalness: 0.88,
      roughness: 0.14,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 0.98
    });
    this.bodyMaterials.push(paintMat);

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x121418,
      roughness: 0.5,
      metalness: 0.8
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xeef2f7,
      metalness: 0.98,
      roughness: 0.08
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0a1018,
      metalness: 0.1,
      roughness: 0.04,
      transmission: 0.9,
      ior: 1.52,
      transparent: true,
      opacity: 0.88
    });

    // 2. Sculpted Lower Chassis & Sills
    const chassisGeo = new THREE.BoxGeometry(4.35, 0.44, 1.95);
    const chassis = new THREE.Mesh(chassisGeo, carbonMat);
    chassis.position.set(0, -0.16, 0);
    chassis.castShadow = true;
    this.carGroup.add(chassis);

    // Front Splitter
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.07, 1.96), carbonMat);
    splitter.position.set(2.18, -0.32, 0);
    this.carGroup.add(splitter);

    // Rear Diffuser
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 1.9), carbonMat);
    diffuser.position.set(-2.18, -0.28, 0);
    this.carGroup.add(diffuser);

    // 3. Main Curved Body (Waistline & Muscular Rear Haunches)
    const bodyGeo = new THREE.CylinderGeometry(0.96, 1.02, 4.3, 32, 8);
    bodyGeo.rotateZ(Math.PI / 2);
    bodyGeo.scale(1, 0.5, 0.98);
    const mainBody = new THREE.Mesh(bodyGeo, paintMat);
    mainBody.position.set(0, 0.06, 0);
    mainBody.castShadow = true;
    this.carGroup.add(mainBody);

    // 4. Fastback Glasshouse Canopy
    const cabinGeo = new THREE.CylinderGeometry(0.72, 0.88, 2.25, 24);
    cabinGeo.rotateZ(Math.PI / 2);
    cabinGeo.scale(1, 0.6, 0.86);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(-0.25, 0.54, 0);
    cabin.castShadow = true;
    this.carGroup.add(cabin);

    // Chrome Window Frame Trim
    const trimGeo = new THREE.TorusGeometry(0.85, 0.02, 8, 32);
    trimGeo.scale(1.2, 0.5, 1);
    const trimLeft = new THREE.Mesh(trimGeo, chromeMat);
    trimLeft.position.set(-0.25, 0.52, 0.85);
    this.carGroup.add(trimLeft);

    const trimRight = trimLeft.clone();
    trimRight.position.z = -0.85;
    this.carGroup.add(trimRight);

    // 5. The Bonnet (Hinged Hood that physically swings open!)
    // Pivot at base of windshield (x = 0.38, y = 0.28)
    this.bonnetGroup.position.set(0.38, 0.28, 0);
    
    const bonnetGeo = new THREE.BoxGeometry(1.72, 0.06, 1.58);
    const bonnetMesh = new THREE.Mesh(bonnetGeo, paintMat);
    bonnetMesh.position.set(0.86, 0.02, 0);
    bonnetMesh.rotation.z = -0.05;
    bonnetMesh.castShadow = true;
    this.bonnetGroup.add(bonnetMesh);

    // Dual Hood Heat Extractor Vents
    const ventMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    [-0.35, 0.35].forEach(zPos => {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.03, 0.18), ventMat);
      vent.position.set(0.85, 0.06, zPos);
      vent.rotation.z = -0.05;
      this.bonnetGroup.add(vent);
    });

    this.carGroup.add(this.bonnetGroup);

    // 6. Front Grille & AutoContentment Emblem
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 1.48), carbonMat);
    grille.position.set(2.14, -0.08, 0);
    this.carGroup.add(grille);

    const emblem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16),
      new THREE.MeshStandardMaterial({ color: 0x0C813D, metalness: 0.9, roughness: 0.1 })
    );
    emblem.rotateZ(Math.PI / 2);
    emblem.position.set(2.24, -0.02, 0);
    this.carGroup.add(emblem);

    // 7. LED Matrix Headlights & Rear Neon Light Bar
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xc8f0ff });
    [-0.68, 0.68].forEach(zPos => {
      const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.32), headlightMat);
      headlight.position.set(2.05, 0.16, zPos);
      headlight.rotation.y = zPos > 0 ? -0.22 : 0.22;
      this.carGroup.add(headlight);
    });

    const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xff1e28 });
    const tailBar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 1.8), tailLightMat);
    tailBar.position.set(-2.18, 0.24, 0);
    this.carGroup.add(tailBar);

    // 8. Quad Titanium Exhaust Pipes
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x2b3846, metalness: 0.95, roughness: 0.15 });
    [-0.64, -0.48, 0.48, 0.64].forEach(zPos => {
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.28, 16), exhaustMat);
      tip.rotateZ(Math.PI / 2);
      tip.position.set(-2.22, -0.26, zPos);
      this.carGroup.add(tip);
    });

    // 9. Wheels & Emerald Brembo Brakes
    const wheelPositions = [
      { x: 1.4, z: 1.02, isFront: true },
      { x: 1.4, z: -1.02, isFront: true },
      { x: -1.4, z: 1.02, isFront: false },
      { x: -1.4, z: -1.02, isFront: false }
    ];

    wheelPositions.forEach(pos => {
      const wheel = this.createDetailedWheel(pos.isFront);
      wheel.position.set(pos.x, -0.22, pos.z);
      this.carGroup.add(wheel);
      this.wheels.push(wheel);
    });

    this.carGroup.position.set(0, 0, 0);
    this.scene.add(this.carGroup);
  }

  createDetailedWheel(isFront) {
    const group = new THREE.Group();

    // Rubber Tire with Tread
    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.28, 24),
      new THREE.MeshStandardMaterial({ color: 0x16181b, roughness: 0.9, metalness: 0.1 })
    );
    tire.rotateX(Math.PI / 2);
    tire.castShadow = true;
    group.add(tire);

    // 10-Spoke Alloy Rim
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd6dde5, metalness: 0.96, roughness: 0.12 });
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.29, 20), rimMat);
    rim.rotateX(Math.PI / 2);
    group.add(rim);

    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.035, 0.03), rimMat);
      spoke.position.set(Math.cos(angle) * 0.13, Math.sin(angle) * 0.13, 0.12);
      spoke.rotation.z = angle;
      group.add(spoke);
    }

    // Brembo Cross-Drilled Rotor
    const rotor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.04, 16),
      new THREE.MeshStandardMaterial({ color: 0x8a99a8, metalness: 0.92, roughness: 0.28 })
    );
    rotor.rotateX(Math.PI / 2);
    group.add(rotor);

    // AutoContentment Emerald Caliper
    const caliper = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.18, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x0C813D, metalness: 0.88, roughness: 0.2 })
    );
    caliper.position.set(0.12, 0.1, 0.02);
    group.add(caliper);

    return group;
  }

  buildDetailedEngineBay() {
    this.engineBayGroup.position.set(1.22, 0.0, 0);

    // 1. Engine Bay Apron & Firewall Inner Tub
    const tubGeo = new THREE.BoxGeometry(1.65, 0.55, 1.52);
    const tubMat = new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 0.7, side: THREE.BackSide });
    const engineTub = new THREE.Mesh(tubGeo, tubMat);
    engineTub.position.set(0, 0.1, 0);
    this.engineBayGroup.add(engineTub);

    // 2. Cast Aluminium V6/V8 Engine Block
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(1.02, 0.52, 0.76),
      new THREE.MeshStandardMaterial({ color: 0x2b313a, metalness: 0.9, roughness: 0.35 })
    );
    block.position.set(0, 0.1, 0);
    this.engineBayGroup.add(block);

    // 3. High-Flow Chrome Intake Plenum Runners
    const intake = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.16, 0.36),
      new THREE.MeshStandardMaterial({ color: 0xe0e8f0, metalness: 0.98, roughness: 0.1 })
    );
    intake.position.set(0, 0.44, 0);
    this.engineBayGroup.add(intake);

    // 4. Red Valve Covers (Right & Left Banks)
    const coverGeo = new THREE.BoxGeometry(0.88, 0.15, 0.28);
    const coverMat = new THREE.MeshStandardMaterial({ color: 0x990014, metalness: 0.75, roughness: 0.25 });
    
    const leftCover = new THREE.Mesh(coverGeo, coverMat);
    leftCover.position.set(0, 0.38, 0.28);
    leftCover.rotation.x = 0.32;
    this.engineBayGroup.add(leftCover);

    const rightCover = leftCover.clone();
    rightCover.position.z = -0.28;
    rightCover.rotation.x = -0.32;
    this.engineBayGroup.add(rightCover);

    // 5. FIRST-AID COMPONENT: 12V Battery with Terminal Clamps
    const batteryGroup = new THREE.Group();
    const batteryBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.25, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x111316, roughness: 0.6 })
    );
    batteryGroup.add(batteryBox);

    // Positive (+) Red Terminal
    const posTerminal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.05, 12),
      new THREE.MeshBasicMaterial({ color: 0xff2233 })
    );
    posTerminal.position.set(0.06, 0.14, 0.1);
    batteryGroup.add(posTerminal);

    // Negative (-) Black Terminal
    const negTerminal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.05, 12),
      new THREE.MeshBasicMaterial({ color: 0x222222 })
    );
    negTerminal.position.set(0.06, 0.14, -0.1);
    batteryGroup.add(negTerminal);

    batteryGroup.position.set(-0.05, 0.32, 0.52);
    this.engineBayGroup.add(batteryGroup);
    this.addFirstAidPin('battery', '12V Car Battery & Terminals', [-0.05, 0.52, 0.52], '#ff2233');

    // 6. FIRST-AID COMPONENT: Radiator Cap & Coolant Expansion Tank
    const coolantGroup = new THREE.Group();
    const coolantTank = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.26, 0.22),
      new THREE.MeshPhysicalMaterial({ color: 0x99ddaa, transmission: 0.7, roughness: 0.2, transparent: true })
    );
    coolantGroup.add(coolantTank);

    // Yellow Caution Radiator Cap (DO NOT OPEN WHEN HOT)
    const radCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.03, 16),
      new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.8, roughness: 0.2 })
    );
    radCap.position.set(0, 0.14, 0);
    coolantGroup.add(radCap);

    coolantGroup.position.set(0.55, 0.28, 0.42);
    this.engineBayGroup.add(coolantGroup);
    this.addFirstAidPin('coolant', 'Radiator Coolant Tank & Cap', [0.55, 0.5, 0.42], '#ffcc00');

    // 7. FIRST-AID COMPONENT: Engine Oil Dipstick & Filler Cap
    const oilDipstick = new THREE.Mesh(
      new THREE.TorusGeometry(0.035, 0.012, 8, 16),
      new THREE.MeshBasicMaterial({ color: 0xffa500 }) // Bright Yellow Pull Ring
    );
    oilDipstick.position.set(0.12, 0.48, 0.02);
    this.engineBayGroup.add(oilDipstick);
    this.addFirstAidPin('oil_dipstick', 'Engine Oil Dipstick & Level Check', [0.12, 0.58, 0.02], '#ffa500');

    // Oil Filler Cap (5W-30)
    const oilCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 })
    );
    oilCap.position.set(0.25, 0.48, -0.22);
    this.engineBayGroup.add(oilCap);

    // 8. FIRST-AID COMPONENT: Brake Fluid Reservoir
    const brakeFluidTank = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.2, 0.18),
      new THREE.MeshPhysicalMaterial({ color: 0xffeeaa, transmission: 0.75, roughness: 0.2, transparent: true })
    );
    brakeFluidTank.position.set(-0.35, 0.42, -0.45);
    this.engineBayGroup.add(brakeFluidTank);
    this.addFirstAidPin('brake_fluid', 'Brake Fluid Reservoir', [-0.35, 0.58, -0.45], '#00ccff');

    // 9. Alternator & Serpentine Belt Pulley
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x111315, roughness: 0.9 });
    const pulleyMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.95 });

    const crankPulley = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16), pulleyMat);
    crankPulley.rotateZ(Math.PI / 2);
    crankPulley.position.set(0.53, 0.0, 0);
    this.engineBayGroup.add(crankPulley);

    const altPulley = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16), pulleyMat);
    altPulley.rotateZ(Math.PI / 2);
    altPulley.position.set(0.53, 0.25, 0.26);
    this.engineBayGroup.add(altPulley);

    this.carGroup.add(this.engineBayGroup);
  }

  addFirstAidPin(id, name, localPos, hexColor) {
    const pinGroup = new THREE.Group();

    // Beacon Beacon Ring
    const ringGeo = new THREE.RingGeometry(0.05, 0.08, 20);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: hexColor, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    pinGroup.add(ring);

    // Glowing Sphere
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    pinGroup.add(sphere);

    // Vertical Arrow Stem
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.14, 8),
      new THREE.MeshBasicMaterial({ color: hexColor })
    );
    stem.position.y = 0.08;
    pinGroup.add(stem);

    pinGroup.position.set(...localPos);
    pinGroup.userData = { id, name };
    this.engineBayGroup.add(pinGroup);
    this.firstAidPins[id] = pinGroup;
  }

  buildDustSheet() {
    const sheetGeo = new THREE.PlaneGeometry(5.4, 3.6, 32, 24);
    sheetGeo.rotateX(-Math.PI / 2);
    
    const pos = sheetGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const dist = Math.sqrt((x * 0.45) ** 2 + z ** 2);
      const elevation = Math.max(0, 0.98 - dist * 0.42);
      pos.setY(i, elevation);
    }
    sheetGeo.computeVertexNormals();

    const sheetMat = new THREE.MeshStandardMaterial({
      color: 0x151b24,
      roughness: 0.38,
      metalness: 0.35,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.98
    });

    this.dustSheet = new THREE.Mesh(sheetGeo, sheetMat);
    this.dustSheet.position.set(0, 0.08, 0);
    this.scene.add(this.dustSheet);
  }

  // First Aid Camera Teleport & Pin Highlight
  focusFirstAidComponent(componentId) {
    this.activePin = componentId;
    this.openBonnet(true);

    const targetKey = this.cameraTargets[componentId] ? componentId : 'bonnet_open';
    this.currentCameraTarget = this.cameraTargets[targetKey];

    // Turn on the engine bay spotlight
    if (this.engineSpotlight) {
      this.engineSpotlight.intensity = 4.5;
    }
  }

  openBonnet(open) {
    this.isBonnetOpen = open;
  }

  setCameraView(viewName) {
    this.activePin = null;
    if (viewName === 'engine') {
      this.openBonnet(true);
      this.currentCameraTarget = this.cameraTargets.bonnet_open;
      if (this.engineSpotlight) this.engineSpotlight.intensity = 4.5;
    } else {
      this.openBonnet(false);
      this.currentCameraTarget = this.cameraTargets[viewName] || this.cameraTargets.exterior;
      if (this.engineSpotlight) this.engineSpotlight.intensity = 0;
    }

    if (viewName === 'xray') {
      this.setXRayMode(true);
    } else {
      this.setXRayMode(false);
    }
  }

  setXRayMode(enable) {
    this.bodyMaterials.forEach(mat => {
      mat.transparent = enable;
      mat.opacity = enable ? 0.22 : 1.0;
      mat.wireframe = enable;
    });
  }

  setCarPaint(hexColor) {
    this.currentPaintColor = hexColor;
    this.bodyMaterials.forEach(mat => {
      mat.color.setHex(hexColor);
    });
  }

  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
    return this.autoRotate;
  }

  updateScroll(progress) {
    // 1. Dust Sheet Unveiling Stage (0% to 15% scroll)
    if (this.dustSheet) {
      if (progress < 0.18) {
        this.dustSheet.visible = true;
        const liftFactor = Math.min(1, progress / 0.15);
        this.dustSheet.position.y = 0.08 + liftFactor * 4.8;
        this.dustSheet.position.x = -liftFactor * 3.2;
        this.dustSheet.material.opacity = Math.max(0, 0.98 - liftFactor * 1.1);
        this.dustSheet.rotation.z = liftFactor * 0.35;
      } else {
        this.dustSheet.visible = false;
      }
    }

    // Only scroll-orbit if not currently locked on an active first-aid pin
    if (!this.activePin) {
      if (progress <= 0.25) {
        const t = progress / 0.25;
        this.currentCameraTarget = {
          pos: new THREE.Vector3(
            THREE.MathUtils.lerp(5.2, 3.4, t),
            THREE.MathUtils.lerp(1.8, 1.4, t),
            THREE.MathUtils.lerp(5.2, 3.8, t)
          ),
          lookAt: new THREE.Vector3(0, 0.3, 0)
        };
        this.openBonnet(false);
      } else if (progress <= 0.55) {
        // Open Bonnet & Zoom in
        const t = (progress - 0.25) / 0.3;
        this.currentCameraTarget = {
          pos: new THREE.Vector3(
            THREE.MathUtils.lerp(3.4, 2.4, t),
            THREE.MathUtils.lerp(1.4, 2.1, t),
            THREE.MathUtils.lerp(3.8, 1.2, t)
          ),
          lookAt: new THREE.Vector3(1.2, 0.35, 0)
        };
        this.openBonnet(t > 0.15);
      } else if (progress <= 0.8) {
        // Wheel & Brembo Caliper
        const t = (progress - 0.55) / 0.25;
        this.currentCameraTarget = {
          pos: new THREE.Vector3(
            THREE.MathUtils.lerp(2.4, 1.8, t),
            THREE.MathUtils.lerp(2.1, 0.3, t),
            THREE.MathUtils.lerp(1.2, 1.8, t)
          ),
          lookAt: new THREE.Vector3(1.38, -0.22, 1.0)
        };
        this.openBonnet(false);
      } else {
        // Rear Active Aero
        const t = (progress - 0.8) / 0.2;
        this.currentCameraTarget = {
          pos: new THREE.Vector3(
            THREE.MathUtils.lerp(1.8, -4.4, t),
            THREE.MathUtils.lerp(0.3, 1.4, t),
            THREE.MathUtils.lerp(1.8, 3.2, t)
          ),
          lookAt: new THREE.Vector3(0, 0.2, 0)
        };
        this.openBonnet(false);
      }
    }
  }

  setupEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('mousemove', (e) => {
      this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this.targetMouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
        this.targetMouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
      }
    }, { passive: true });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // 1. Smooth Camera Fly-Through
    if (this.currentCameraTarget) {
      this.camera.position.lerp(this.currentCameraTarget.pos, 0.055);
      this.currentLookAt.lerp(this.currentCameraTarget.lookAt, 0.055);
      this.camera.lookAt(this.currentLookAt);
    }

    // 2. Bonnet Opening Animation (Smooth upward swing to ~50 degrees)
    const targetBonnetAngle = this.isBonnetOpen ? -Math.PI / 3.6 : 0;
    this.bonnetGroup.rotation.z += (targetBonnetAngle - this.bonnetGroup.rotation.z) * 0.08;

    // 3. Auto-rotation or mouse parallax
    if (this.autoRotate) {
      this.carGroup.rotation.y += 0.008;
    } else if (!this.activePin) {
      this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05;
      this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05;
      this.carGroup.rotation.z = this.mouse.x * 0.035;
      this.carGroup.rotation.x = -this.mouse.y * 0.025;
    }

    // 4. Pulse First Aid Beacon Pins
    const time = performance.now() * 0.004;
    Object.keys(this.firstAidPins).forEach((key, i) => {
      const pin = this.firstAidPins[key];
      const scale = 1.0 + Math.sin(time + i * 1.5) * 0.25;
      pin.scale.set(scale, scale, scale);
    });

    this.renderer.render(this.scene, this.camera);
  }
}
