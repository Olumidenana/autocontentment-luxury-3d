import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export class Scene3D {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    
    this.currentBodyType = 'sedan'; // 'sedan' | 'suv' | 'gt_sports'
    this.carGroup = new THREE.Group();
    this.chassisMeshGroup = new THREE.Group();
    this.bonnetGroup = new THREE.Group();
    this.engineBayGroup = new THREE.Group();
    this.wheels = [];
    this.bodyMaterials = [];
    this.firstAidPins = {};
    this.dustSheet = null;
    this.isBonnetOpen = false;
    this.autoRotate = false;
    this.activePin = null;

    this.cameraTargets = {
      exterior:    { pos: new THREE.Vector3(5.2, 1.8, 5.2), lookAt: new THREE.Vector3(0, 0.35, 0) },
      bonnet_open: { pos: new THREE.Vector3(2.2, 2.0, 1.0), lookAt: new THREE.Vector3(1.1, 0.45, 0) },
      battery:     { pos: new THREE.Vector3(1.5, 1.6, 0.8), lookAt: new THREE.Vector3(1.05, 0.52, 0.45) },
      coolant:     { pos: new THREE.Vector3(2.0, 1.4, 0.5), lookAt: new THREE.Vector3(1.55, 0.48, 0.35) },
      oil_dipstick:{ pos: new THREE.Vector3(1.6, 1.6, 0.15), lookAt: new THREE.Vector3(1.15, 0.52, 0.0) },
      brake_fluid: { pos: new THREE.Vector3(1.3, 1.6, -0.6), lookAt: new THREE.Vector3(0.85, 0.55, -0.42) },
      wheel:       { pos: new THREE.Vector3(1.8, 0.4, 1.8), lookAt: new THREE.Vector3(1.4, -0.15, 1.0) },
      xray:        { pos: new THREE.Vector3(4.2, 2.4, 4.2), lookAt: new THREE.Vector3(0, 0.35, 0) }
    };

    this.currentCameraTarget = this.cameraTargets.exterior;
    this.currentLookAt = new THREE.Vector3(0, 0.35, 0);
    this.currentPaintColor = 0x0C813D; // Default AutoContentment Emerald

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
    this.buildCarChassis(this.currentBodyType);
    this.buildDustSheet();
    this.setupEvents();
    this.animate();
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(6, 10, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x0C813D, 2.4);
    rimLight.position.set(-6, 5, -6);
    this.scene.add(rimLight);

    const frontFill = new THREE.DirectionalLight(0xffeedd, 1.6);
    frontFill.position.set(7, 1.5, 0);
    this.scene.add(frontFill);

    this.engineSpotlight = new THREE.SpotLight(0xffffff, 0, 10, Math.PI / 4, 0.3);
    this.engineSpotlight.position.set(1.4, 4.0, 0);
    this.engineSpotlight.target.position.set(1.1, 0.45, 0);
    this.scene.add(this.engineSpotlight);
    this.scene.add(this.engineSpotlight.target);
  }

  buildStudioShowroom() {
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

    const grid = new THREE.PolarGridHelper(14, 16, 8, 32, 0x0C813D, 0x1f2937);
    grid.position.y = -0.51;
    grid.material.opacity = 0.28;
    grid.material.transparent = true;
    this.scene.add(grid);

    const shadowGeo = new THREE.PlaneGeometry(5.4, 2.8);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.85 });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, -0.505, 0);
    this.scene.add(shadow);
  }

  // Switches 3D Car Architecture dynamically based on selected vehicle
  setVehicleModel(brand, modelId) {
    let bodyType = 'sedan';
    if (modelId.includes('prado') || modelId.includes('rx350') || modelId.includes('gle') || modelId.includes('crv')) {
      bodyType = 'suv';
    } else if (modelId.includes('valmora') || modelId.includes('is250') || modelId.includes('civic')) {
      bodyType = 'gt_sports';
    }

    if (bodyType !== this.currentBodyType) {
      this.currentBodyType = bodyType;
      this.buildCarChassis(bodyType);
    }
  }

  buildCarChassis(type) {
    // Clear existing car meshes
    while (this.chassisMeshGroup.children.length > 0) {
      this.chassisMeshGroup.remove(this.chassisMeshGroup.children[0]);
    }
    while (this.bonnetGroup.children.length > 0) {
      this.bonnetGroup.remove(this.bonnetGroup.children[0]);
    }
    while (this.engineBayGroup.children.length > 0) {
      this.engineBayGroup.remove(this.engineBayGroup.children[0]);
    }
    this.wheels = [];
    this.bodyMaterials = [];
    this.firstAidPins = {};

    const paintMat = new THREE.MeshPhysicalMaterial({
      color: this.currentPaintColor,
      metalness: 0.88,
      roughness: 0.14,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 0.98
    });
    this.bodyMaterials.push(paintMat);

    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x121418, roughness: 0.5, metalness: 0.8 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xeef2f7, metalness: 0.98, roughness: 0.08 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0a1018,
      metalness: 0.1,
      roughness: 0.04,
      transmission: 0.9,
      ior: 1.52,
      transparent: true,
      opacity: 0.88
    });

    if (type === 'suv') {
      // 1. High-Riding Muscular SUV Chassis (Prado / RX 350 / GLE 450)
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.6, 2.1), carbonMat);
      chassis.position.set(0, -0.05, 0);
      this.chassisMeshGroup.add(chassis);

      // Flared SUV Cabin & Roof
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.85, 1.8), glassMat);
      cabin.position.set(-0.25, 0.75, 0);
      this.chassisMeshGroup.add(cabin);

      // Roof Rails
      [-0.75, 0.75].forEach(z => {
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.4, 8), chromeMat);
        rail.rotateZ(Math.PI / 2);
        rail.position.set(-0.25, 1.2, z);
        this.chassisMeshGroup.add(rail);
      });

      // Main SUV Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(4.25, 0.75, 2.05), paintMat);
      body.position.set(0, 0.2, 0);
      this.chassisMeshGroup.add(body);

      // Upright SUV Grille
      const grille = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 1.55), chromeMat);
      grille.position.set(2.15, 0.1, 0);
      this.chassisMeshGroup.add(grille);

      // SUV Bonnet (Hinged at Cowl x=0.45, y=0.55)
      this.bonnetGroup.position.set(0.45, 0.55, 0);
      const bonnetMesh = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.07, 1.8), paintMat);
      bonnetMesh.position.set(0.84, 0.02, 0);
      bonnetMesh.rotation.z = -0.04;
      this.bonnetGroup.add(bonnetMesh);
      this.chassisMeshGroup.add(this.bonnetGroup);

      // Heavy-Duty Big SUV Wheels & Raised Clearance
      const wheelPos = [
        { x: 1.45, y: -0.15, z: 1.1 }, { x: 1.45, y: -0.15, z: -1.1 },
        { x: -1.45, y: -0.15, z: 1.1 }, { x: -1.45, y: -0.15, z: -1.1 }
      ];
      wheelPos.forEach(p => {
        const w = this.createRealisticWheel(0.44, 0.32, 0.28);
        w.position.set(p.x, p.y, p.z);
        this.chassisMeshGroup.add(w);
        this.wheels.push(w);
      });

      this.buildEngineComponents('suv');

    } else if (type === 'sedan') {
      // 2. Executive Saloon / Sedan (Lexus ES 350 / Camry / Mercedes C300)
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.35, 0.42, 1.9), carbonMat);
      chassis.position.set(0, -0.18, 0);
      this.chassisMeshGroup.add(chassis);

      // Sleek 3-Box Sedan Greenhouse Cabin
      const cabin = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.88, 2.3, 20), glassMat);
      cabin.rotateZ(Math.PI / 2);
      cabin.scale.set(1, 0.58, 0.84);
      cabin.position.set(-0.2, 0.52, 0);
      this.chassisMeshGroup.add(cabin);

      // Sculpted Sedan Waistline
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.98, 4.3, 24, 6), paintMat);
      body.rotateZ(Math.PI / 2);
      body.scale.set(1, 0.48, 0.96);
      body.position.set(0, 0.06, 0);
      this.chassisMeshGroup.add(body);

      // Lexus Spindle / Mercedes Panamericana Grille
      const grille = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.42, 1.45), chromeMat);
      grille.position.set(2.14, -0.06, 0);
      this.chassisMeshGroup.add(grille);

      // Sedan Bonnet (Hinged at x=0.4, y=0.28)
      this.bonnetGroup.position.set(0.4, 0.28, 0);
      const bonnetMesh = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 1.55), paintMat);
      bonnetMesh.position.set(0.85, 0.02, 0);
      bonnetMesh.rotation.z = -0.05;
      this.bonnetGroup.add(bonnetMesh);
      this.chassisMeshGroup.add(this.bonnetGroup);

      // Executive 19" Multispoke Wheels
      const wheelPos = [
        { x: 1.38, y: -0.22, z: 0.98 }, { x: 1.38, y: -0.22, z: -0.98 },
        { x: -1.38, y: -0.22, z: 0.98 }, { x: -1.38, y: -0.22, z: -0.98 }
      ];
      wheelPos.forEach(p => {
        const w = this.createRealisticWheel(0.38, 0.28, 0.26);
        w.position.set(p.x, p.y, p.z);
        this.chassisMeshGroup.add(w);
        this.wheels.push(w);
      });

      this.buildEngineComponents('sedan');

    } else {
      // 3. Sports Grand Tourer (Valmora Alba GT / Fastback Coupe)
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.4, 1.98), carbonMat);
      chassis.position.set(0, -0.2, 0);
      this.chassisMeshGroup.add(chassis);

      // Low Fastback Canopy
      const cabin = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.84, 2.2, 24), glassMat);
      cabin.rotateZ(Math.PI / 2);
      cabin.scale.set(1, 0.52, 0.86);
      cabin.position.set(-0.25, 0.48, 0);
      this.chassisMeshGroup.add(cabin);

      // Curvaceous GT Body
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.94, 1.0, 4.3, 32, 6), paintMat);
      body.rotateZ(Math.PI / 2);
      body.scale.set(1, 0.46, 0.98);
      body.position.set(0, 0.05, 0);
      this.chassisMeshGroup.add(body);

      // Front Carbon Splitter & Grille
      const splitter = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.06, 1.96), carbonMat);
      splitter.position.set(2.18, -0.32, 0);
      this.chassisMeshGroup.add(splitter);

      // GT Bonnet (Hinged at x=0.38, y=0.26)
      this.bonnetGroup.position.set(0.38, 0.26, 0);
      const bonnetMesh = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.06, 1.58), paintMat);
      bonnetMesh.position.set(0.86, 0.02, 0);
      bonnetMesh.rotation.z = -0.05;
      this.bonnetGroup.add(bonnetMesh);
      this.chassisMeshGroup.add(this.bonnetGroup);

      // Sports Staggered Wheels & Brembo Brakes
      const wheelPos = [
        { x: 1.4, y: -0.22, z: 1.02 }, { x: 1.4, y: -0.22, z: -1.02 },
        { x: -1.4, y: -0.22, z: 1.05 }, { x: -1.4, y: -0.22, z: -1.05 }
      ];
      wheelPos.forEach(p => {
        const w = this.createRealisticWheel(0.38, 0.28, 0.28);
        w.position.set(p.x, p.y, p.z);
        this.chassisMeshGroup.add(w);
        this.wheels.push(w);
      });

      this.buildEngineComponents('gt_sports');
    }

    // AutoContentment Emerald Shield Emblem on Nose
    const emblem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16),
      new THREE.MeshStandardMaterial({ color: 0x0C813D, metalness: 0.9, roughness: 0.1 })
    );
    emblem.rotateZ(Math.PI / 2);
    emblem.position.set(2.24, -0.02, 0);
    this.chassisMeshGroup.add(emblem);

    this.carGroup.add(this.chassisMeshGroup);
    this.scene.add(this.carGroup);
  }

  createRealisticWheel(radius, width, rimRadius) {
    const group = new THREE.Group();

    // Tire
    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, width, 24),
      new THREE.MeshStandardMaterial({ color: 0x16181b, roughness: 0.9, metalness: 0.1 })
    );
    tire.rotateX(Math.PI / 2);
    tire.castShadow = true;
    group.add(tire);

    // Rim
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd6dde5, metalness: 0.96, roughness: 0.12 });
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(rimRadius, rimRadius, width + 0.01, 20), rimMat);
    rim.rotateX(Math.PI / 2);
    group.add(rim);

    // Spokes
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(rimRadius * 0.85, 0.035, 0.03), rimMat);
      spoke.position.set(Math.cos(angle) * (rimRadius * 0.45), Math.sin(angle) * (rimRadius * 0.45), width * 0.42);
      spoke.rotation.z = angle;
      group.add(spoke);
    }

    // Brembo Cross-Drilled Rotor & Caliper
    const rotor = new THREE.Mesh(
      new THREE.CylinderGeometry(rimRadius * 0.8, rimRadius * 0.8, 0.04, 16),
      new THREE.MeshStandardMaterial({ color: 0x8a99a8, metalness: 0.92, roughness: 0.28 })
    );
    rotor.rotateX(Math.PI / 2);
    group.add(rotor);

    const caliper = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.16, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x0C813D, metalness: 0.88, roughness: 0.2 })
    );
    caliper.position.set(0.1, 0.08, 0.02);
    group.add(caliper);

    return group;
  }

  buildEngineComponents(type) {
    this.engineBayGroup.position.set(1.2, 0.0, 0);

    // 1. Engine Bay Apron Tub
    const tub = new THREE.Mesh(
      new THREE.BoxGeometry(1.65, 0.55, 1.52),
      new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 0.7, side: THREE.BackSide })
    );
    tub.position.set(0, 0.1, 0);
    this.engineBayGroup.add(tub);

    // 2. Realistic Engine Block (Transverse V6 for Sedan, Longitudinal for SUV/GT)
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.5, 0.74),
      new THREE.MeshStandardMaterial({ color: 0x2b313a, metalness: 0.9, roughness: 0.35 })
    );
    block.position.set(0, 0.1, 0);
    this.engineBayGroup.add(block);

    // 3. Intake Plenum Runners
    const intake = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.16, 0.36),
      new THREE.MeshStandardMaterial({ color: 0xe0e8f0, metalness: 0.98, roughness: 0.1 })
    );
    intake.position.set(0, 0.44, 0);
    this.engineBayGroup.add(intake);

    // 4. Red Valve Covers
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

    const posTerminal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.05, 12),
      new THREE.MeshBasicMaterial({ color: 0xff2233 })
    );
    posTerminal.position.set(0.06, 0.14, 0.1);
    batteryGroup.add(posTerminal);

    const negTerminal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.05, 12),
      new THREE.MeshBasicMaterial({ color: 0x222222 })
    );
    negTerminal.position.set(0.06, 0.14, -0.1);
    batteryGroup.add(negTerminal);

    batteryGroup.position.set(-0.05, 0.32, 0.52);
    this.engineBayGroup.add(batteryGroup);
    this.addFirstAidPin('battery', '12V Battery & Terminals', [-0.05, 0.52, 0.52], '#ff2233');

    // 6. FIRST-AID COMPONENT: Radiator Cap & Coolant Expansion Tank
    const coolantGroup = new THREE.Group();
    const coolantTank = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.26, 0.22),
      new THREE.MeshPhysicalMaterial({ color: 0x99ddaa, transmission: 0.7, roughness: 0.2, transparent: true })
    );
    coolantGroup.add(coolantTank);

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
      new THREE.MeshBasicMaterial({ color: 0xffa500 })
    );
    oilDipstick.position.set(0.12, 0.48, 0.02);
    this.engineBayGroup.add(oilDipstick);
    this.addFirstAidPin('oil_dipstick', 'Engine Oil Dipstick & Level Check', [0.12, 0.58, 0.02], '#ffa500');

    // 8. FIRST-AID COMPONENT: Brake Fluid Reservoir
    const brakeFluidTank = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.2, 0.18),
      new THREE.MeshPhysicalMaterial({ color: 0xffeeaa, transmission: 0.75, roughness: 0.2, transparent: true })
    );
    brakeFluidTank.position.set(-0.35, 0.42, -0.45);
    this.engineBayGroup.add(brakeFluidTank);
    this.addFirstAidPin('brake_fluid', 'Brake Fluid Reservoir', [-0.35, 0.58, -0.45], '#00ccff');

    this.chassisMeshGroup.add(this.engineBayGroup);
  }

  addFirstAidPin(id, name, localPos, hexColor) {
    const pinGroup = new THREE.Group();

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.05, 0.08, 20),
      new THREE.MeshBasicMaterial({ color: hexColor, side: THREE.DoubleSide })
    );
    ring.rotateX(Math.PI / 2);
    pinGroup.add(ring);

    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    pinGroup.add(sphere);

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

  focusFirstAidComponent(componentId) {
    this.activePin = componentId;
    this.openBonnet(true);

    const targetKey = this.cameraTargets[componentId] ? componentId : 'bonnet_open';
    this.currentCameraTarget = this.cameraTargets[targetKey];

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

    if (!this.activePin) {
      if (progress <= 0.25) {
        const t = progress / 0.25;
        this.currentCameraTarget = {
          pos: new THREE.Vector3(
            THREE.MathUtils.lerp(5.2, 3.4, t),
            THREE.MathUtils.lerp(1.8, 1.4, t),
            THREE.MathUtils.lerp(5.2, 3.8, t)
          ),
          lookAt: new THREE.Vector3(0, 0.35, 0)
        };
        this.openBonnet(false);
      } else if (progress <= 0.55) {
        const t = (progress - 0.25) / 0.3;
        this.currentCameraTarget = {
          pos: new THREE.Vector3(
            THREE.MathUtils.lerp(3.4, 2.2, t),
            THREE.MathUtils.lerp(1.4, 2.0, t),
            THREE.MathUtils.lerp(3.8, 1.0, t)
          ),
          lookAt: new THREE.Vector3(1.1, 0.45, 0)
        };
        this.openBonnet(t > 0.15);
      } else if (progress <= 0.8) {
        const t = (progress - 0.55) / 0.25;
        this.currentCameraTarget = {
          pos: new THREE.Vector3(
            THREE.MathUtils.lerp(2.2, 1.8, t),
            THREE.MathUtils.lerp(2.0, 0.4, t),
            THREE.MathUtils.lerp(1.0, 1.8, t)
          ),
          lookAt: new THREE.Vector3(1.4, -0.15, 1.0)
        };
        this.openBonnet(false);
      } else {
        const t = (progress - 0.8) / 0.2;
        this.currentCameraTarget = {
          pos: new THREE.Vector3(
            THREE.MathUtils.lerp(1.8, -4.4, t),
            THREE.MathUtils.lerp(0.4, 1.4, t),
            THREE.MathUtils.lerp(1.8, 3.2, t)
          ),
          lookAt: new THREE.Vector3(0, 0.35, 0)
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
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.currentCameraTarget) {
      this.camera.position.lerp(this.currentCameraTarget.pos, 0.055);
      this.currentLookAt.lerp(this.currentCameraTarget.lookAt, 0.055);
      this.camera.lookAt(this.currentLookAt);
    }

    // Bonnet Opening Animation (Upward swing ~50 degrees)
    const targetBonnetAngle = this.isBonnetOpen ? -Math.PI / 3.6 : 0;
    this.bonnetGroup.rotation.z += (targetBonnetAngle - this.bonnetGroup.rotation.z) * 0.08;

    if (this.autoRotate) {
      this.carGroup.rotation.y += 0.008;
    }

    const time = performance.now() * 0.004;
    Object.keys(this.firstAidPins).forEach((key, i) => {
      const pin = this.firstAidPins[key];
      const scale = 1.0 + Math.sin(time + i * 1.5) * 0.25;
      pin.scale.set(scale, scale, scale);
    });

    this.renderer.render(this.scene, this.camera);
  }
}
