import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export class Scene3D {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    
    this.currentBodyType = 'mercedes'; // 'mercedes' | 'sedan' | 'gt_sports'
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

    // DRACO & GLTF Loaders for High-Fidelity 3D Car Models
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/gltf/');
    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(dracoLoader);

    this.textureLoader = new THREE.TextureLoader();
    this.currentEngineImageUrl = '/images/engines/engine_mercedes_v6.jpg';
    this.currentCarImageUrl = '/images/cars/mercedes_e350.jpg';
    this.engineDeckMesh = null;
    this.carBillboardMesh = null;

    this.cameraTargets = {
      exterior:    { pos: new THREE.Vector3(5.2, 1.8, 5.2), lookAt: new THREE.Vector3(0, 0.35, 0) },
      bonnet_open: { pos: new THREE.Vector3(2.4, 1.8, 1.1), lookAt: new THREE.Vector3(1.15, 0.42, 0) },
      battery:     { pos: new THREE.Vector3(1.6, 1.6, 0.8), lookAt: new THREE.Vector3(1.15, 0.52, 0.45) },
      coolant:     { pos: new THREE.Vector3(2.1, 1.4, 0.5), lookAt: new THREE.Vector3(1.65, 0.48, 0.35) },
      oil_dipstick:{ pos: new THREE.Vector3(1.7, 1.6, 0.15), lookAt: new THREE.Vector3(1.25, 0.52, 0.0) },
      brake_fluid: { pos: new THREE.Vector3(1.4, 1.6, -0.6), lookAt: new THREE.Vector3(0.95, 0.55, -0.42) },
      wheel:       { pos: new THREE.Vector3(2.0, 0.4, 2.0), lookAt: new THREE.Vector3(1.4, -0.15, 1.0) },
      xray:        { pos: new THREE.Vector3(4.2, 2.4, 4.2), lookAt: new THREE.Vector3(0, 0.35, 0) }
    };

    this.currentCameraTarget = this.cameraTargets.exterior;
    this.currentLookAt = new THREE.Vector3(0, 0.35, 0);
    this.currentPaintColor = 0xBAC0C6; // Factory OEM Iridium Silver Metallic default (Mercedes E350)

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

    // Assemble Car Hierarchy
    this.carGroup.add(this.chassisMeshGroup);
    this.carGroup.add(this.engineBayGroup);
    this.carGroup.add(this.bonnetGroup);
    this.scene.add(this.carGroup);

    // Load initial authentic Mercedes 3D model
    this.loadVehicleModel('mercedes');
    this.buildEngineComponents();
    this.buildBonnetMesh();
    this.buildDustSheet();
    this.setupEvents();
    this.animate();
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.95);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
    keyLight.position.set(6, 12, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    fillLight.position.set(-6, 8, -6);
    this.scene.add(fillLight);

    // Warm golden rim light for luxury showroom halo
    const rimLight = new THREE.DirectionalLight(0xfef08a, 1.8);
    rimLight.position.set(0, 5, -8);
    this.scene.add(rimLight);

    // Dedicated Engine Bay Inspection Spotlight
    this.engineSpotlight = new THREE.SpotLight(0xffffff, 0, 10, Math.PI / 4, 0.35, 1);
    this.engineSpotlight.position.set(1.4, 3.2, 0);
    this.engineSpotlight.target.position.set(1.2, 0.3, 0);
    this.scene.add(this.engineSpotlight);
    this.scene.add(this.engineSpotlight.target);
  }

  buildStudioShowroom() {
    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x080b10,
      roughness: 0.18,
      metalness: 0.78
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

  /**
   * Loads high-detail production 3D vehicle models (Mercedes, Executive Sedan, Sports GT)
   */
  loadVehicleModel(type) {
    let modelPath = '/models/mercedes.glb';
    let scale = 0.92;
    let rotationY = Math.PI / 2;
    let posY = -0.50;

    if (type === 'sedan') {
      modelPath = '/models/sedan.glb';
      scale = 1.05;
      rotationY = -Math.PI / 2;
      posY = -0.48;
    } else if (type === 'gt_sports' || type === 'ferrari') {
      modelPath = '/models/ferrari.glb';
      scale = 1.0;
      rotationY = 0;
      posY = -0.50;
    }

    console.log(`Loading 3D model: ${modelPath}`);

    this.gltfLoader.load(modelPath, (gltf) => {
      // Clear previous car model from chassis group
      while (this.chassisMeshGroup.children.length > 0) {
        this.chassisMeshGroup.remove(this.chassisMeshGroup.children[0]);
      }
      this.bodyMaterials = [];
      this.wheels = [];

      const model = gltf.scene;
      model.scale.set(scale, scale, scale);
      model.position.set(0, posY, 0);
      model.rotation.y = rotationY;

      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          const matName = child.material && child.material.name ? child.material.name.toLowerCase() : '';
          const nodeName = child.name ? child.name.toLowerCase() : '';

          // Identify vehicle body panels and apply OEM factory paint
          if (
            matName.includes('body') || 
            matName.includes('carpaint') || 
            matName.includes('coloured') || 
            matName.includes('paint') ||
            nodeName.includes('body')
          ) {
            child.material = new THREE.MeshPhysicalMaterial({
              color: this.currentPaintColor,
              metalness: 0.88,
              roughness: 0.12,
              clearcoat: 1.0,
              clearcoatRoughness: 0.04,
              reflectivity: 0.98
            });
            this.bodyMaterials.push(child.material);
          } else if (
            matName.includes('wheel') || 
            matName.includes('rim') || 
            nodeName.includes('rim') || 
            nodeName.includes('wheel')
          ) {
            // High-luster alloy rims
            if (child.material) {
              child.material.metalness = 0.95;
              child.material.roughness = 0.16;
            }
            this.wheels.push(child);
          } else if (matName.includes('tire')) {
            if (child.material) {
              child.material.roughness = 0.85;
              child.material.metalness = 0.1;
            }
            this.wheels.push(child);
          }
        }
      });

      this.chassisMeshGroup.add(model);
      console.log(`Loaded 3D vehicle model ${modelPath} successfully!`);
    }, undefined, (err) => {
      console.error(`Error loading model ${modelPath}:`, err);
    });
  }

  /**
   * Constructs the 3D Mechanical Engine Bay under the hood
   */
  buildEngineComponents() {
    while (this.engineBayGroup.children.length > 0) {
      this.engineBayGroup.remove(this.engineBayGroup.children[0]);
    }
    this.firstAidPins = {};

    this.engineBayGroup.position.set(1.2, 0.0, 0);

    // 1. Engine Bay Apron Tub
    const tub = new THREE.Mesh(
      new THREE.BoxGeometry(1.68, 0.65, 1.55),
      new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.8, side: THREE.BackSide })
    );
    tub.position.set(0, 0.15, 0);
    this.engineBayGroup.add(tub);

    // 2. High-Detail V6/V8 Die-Cast Aluminum Engine Block
    const blockMat = new THREE.MeshStandardMaterial({ color: 0x333b47, metalness: 0.92, roughness: 0.3 });
    const block = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.48, 0.72), blockMat);
    block.position.set(0, 0.12, 0);
    this.engineBayGroup.add(block);

    // 3. Dual Angled Valve Covers (V-Configuration)
    const valveCoverMat = new THREE.MeshStandardMaterial({ color: 0x1c2430, metalness: 0.85, roughness: 0.22 });
    const leftValve = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 0.26), valveCoverMat);
    leftValve.position.set(0, 0.38, 0.26);
    leftValve.rotation.x = 0.35;
    this.engineBayGroup.add(leftValve);

    const rightValve = leftValve.clone();
    rightValve.position.z = -0.26;
    rightValve.rotation.x = -0.35;
    this.engineBayGroup.add(rightValve);

    // 4. Polished Chrome Dual Intake Plenum Runners
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.98, roughness: 0.08 });
    const plenum = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.14, 0.32), chromeMat);
    plenum.position.set(0, 0.46, 0);
    this.engineBayGroup.add(plenum);

    // 5. Air Filter Airbox & Accordion Intake Hose
    const airboxMat = new THREE.MeshStandardMaterial({ color: 0x111419, roughness: 0.7 });
    const airbox = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.32, 0.4), airboxMat);
    airbox.position.set(-0.42, 0.35, 0.45);
    this.engineBayGroup.add(airbox);

    const hoseGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.42, 16);
    hoseGeo.rotateZ(Math.PI / 2);
    const hose = new THREE.Mesh(hoseGeo, airboxMat);
    hose.position.set(-0.18, 0.44, 0.28);
    this.engineBayGroup.add(hose);

    // 6. Polished Strut Tower Brace Bar
    const braceGeo = new THREE.CylinderGeometry(0.022, 0.022, 1.5, 12);
    braceGeo.rotateX(Math.PI / 2);
    const brace = new THREE.Mesh(braceGeo, chromeMat);
    brace.position.set(-0.12, 0.52, 0);
    this.engineBayGroup.add(brace);

    // 7. FIRST-AID 3D COMPONENT: 12V Battery & Terminals
    const batteryGroup = new THREE.Group();
    const batteryBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.28, 0.38),
      new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.65 })
    );
    batteryGroup.add(batteryBox);

    const posTerminal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.06, 12),
      new THREE.MeshBasicMaterial({ color: 0xdc2626 })
    );
    posTerminal.position.set(0.07, 0.16, 0.11);
    batteryGroup.add(posTerminal);

    const negTerminal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.06, 12),
      new THREE.MeshBasicMaterial({ color: 0x1e293b })
    );
    negTerminal.position.set(0.07, 0.16, -0.11);
    batteryGroup.add(negTerminal);

    batteryGroup.position.set(-0.06, 0.34, 0.54);
    this.engineBayGroup.add(batteryGroup);
    this.addFirstAidPin('battery', '12V Battery & Terminals', [-0.06, 0.56, 0.54], '#dc2626');

    // 8. FIRST-AID 3D COMPONENT: Radiator Cap & Coolant Tank
    const coolantGroup = new THREE.Group();
    const coolantTank = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.28, 0.24),
      new THREE.MeshPhysicalMaterial({ color: 0xa7f3d0, transmission: 0.72, roughness: 0.2, transparent: true })
    );
    coolantGroup.add(coolantTank);

    const radCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.04, 16),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.15 })
    );
    radCap.position.set(0, 0.16, 0);
    coolantGroup.add(radCap);

    coolantGroup.position.set(0.58, 0.30, 0.44);
    this.engineBayGroup.add(coolantGroup);
    this.addFirstAidPin('coolant', 'Radiator Coolant Tank & Cap', [0.58, 0.52, 0.44], '#f59e0b');

    // 9. FIRST-AID 3D COMPONENT: Engine Oil Dipstick Loop
    const oilDipstick = new THREE.Mesh(
      new THREE.TorusGeometry(0.04, 0.014, 10, 20),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    oilDipstick.position.set(0.14, 0.52, 0.04);
    this.engineBayGroup.add(oilDipstick);
    this.addFirstAidPin('oil_dipstick', 'Engine Oil Dipstick & Level Check', [0.14, 0.62, 0.04], '#fbbf24');

    // 10. FIRST-AID 3D COMPONENT: Brake Fluid Master Cylinder Reservoir
    const brakeFluidTank = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.22, 0.2),
      new THREE.MeshPhysicalMaterial({ color: 0xfef08a, transmission: 0.75, roughness: 0.2, transparent: true })
    );
    brakeFluidTank.position.set(-0.38, 0.44, -0.48);
    this.engineBayGroup.add(brakeFluidTank);
    this.addFirstAidPin('brake_fluid', 'Brake Master Cylinder Reservoir', [-0.38, 0.62, -0.48], '#3b82f6');
  }

  /**
   * Constructs the 3D Opening Bonnet (Hood) with aerodynamic styling
   */
  buildBonnetMesh() {
    while (this.bonnetGroup.children.length > 0) {
      this.bonnetGroup.remove(this.bonnetGroup.children[0]);
    }

    // Rear hinge pivot positioning
    this.bonnetGroup.position.set(0.35, 0.64, 0);

    const bonnetMat = new THREE.MeshPhysicalMaterial({
      color: this.currentPaintColor,
      metalness: 0.88,
      roughness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      reflectivity: 0.98
    });
    this.bodyMaterials.push(bonnetMat);

    // Main Sculpted Bonnet Lid
    const bonnetLid = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.04, 1.48), bonnetMat);
    bonnetLid.position.set(0.84, 0, 0);
    this.bonnetGroup.add(bonnetLid);

    // Dual Center Crease Lines
    const creaseMat = new THREE.MeshStandardMaterial({ color: 0x111317, metalness: 0.5, roughness: 0.5 });
    const creaseLeft = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 0.02), creaseMat);
    creaseLeft.position.set(0.8, 0.03, 0.25);
    this.bonnetGroup.add(creaseLeft);

    const creaseRight = creaseLeft.clone();
    creaseRight.position.z = -0.25;
    this.bonnetGroup.add(creaseRight);
  }

  addFirstAidPin(id, name, localPos, hexColor) {
    const pinGroup = new THREE.Group();

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.06, 0.09, 24),
      new THREE.MeshBasicMaterial({ color: hexColor, side: THREE.DoubleSide })
    );
    ring.rotateX(Math.PI / 2);
    pinGroup.add(ring);

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    pinGroup.add(sphere);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.15, 8),
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
      color: 0x090d14,
      roughness: 0.65,
      metalness: 0.35,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    this.dustSheet = new THREE.Mesh(sheetGeo, sheetMat);
    this.dustSheet.position.set(0, 0.08, 0);
    this.scene.add(this.dustSheet);
  }

  // Switches 3D Car Architecture dynamically based on selected vehicle
  setVehicleModel(brand, modelId, oemHex) {
    if (oemHex !== undefined) {
      this.currentPaintColor = oemHex;
      this.setCarPaint(oemHex);
    }

    let bodyType = 'mercedes';
    if (modelId.includes('camry') || modelId.includes('accord') || modelId.includes('es350') || modelId.includes('corolla')) {
      bodyType = 'sedan';
    } else if (modelId.includes('valmora') || modelId.includes('is250') || modelId.includes('civic')) {
      bodyType = 'gt_sports';
    } else if (modelId.includes('prado') || modelId.includes('rx350') || modelId.includes('gle') || modelId.includes('c300') || modelId.includes('e350')) {
      bodyType = 'mercedes';
    }

    if (bodyType !== this.currentBodyType) {
      this.currentBodyType = bodyType;
      this.loadVehicleModel(bodyType);
    }
  }

  /**
   * Toggles the physical 3D Bonnet open or closed
   */
  toggleBonnet() {
    this.isBonnetOpen = !this.isBonnetOpen;
    if (this.isBonnetOpen) {
      this.currentCameraTarget = this.cameraTargets.bonnet_open;
      if (this.engineSpotlight) this.engineSpotlight.intensity = 5.0;
    } else {
      this.currentCameraTarget = this.cameraTargets.exterior;
      if (this.engineSpotlight) this.engineSpotlight.intensity = 0;
    }
    return this.isBonnetOpen;
  }

  openBonnet(open) {
    this.isBonnetOpen = open;
    if (open) {
      this.currentCameraTarget = this.cameraTargets.bonnet_open;
      if (this.engineSpotlight) this.engineSpotlight.intensity = 5.0;
    } else {
      this.currentCameraTarget = this.cameraTargets.exterior;
      if (this.engineSpotlight) this.engineSpotlight.intensity = 0;
    }
  }

  focusFirstAidComponent(componentId) {
    this.activePin = componentId;
    this.openBonnet(true);

    const targetKey = this.cameraTargets[componentId] ? componentId : 'bonnet_open';
    this.currentCameraTarget = this.cameraTargets[targetKey];

    if (this.engineSpotlight) {
      this.engineSpotlight.intensity = 5.0;
    }
  }

  setCameraView(viewName) {
    this.activePin = null;
    if (viewName === 'engine') {
      this.openBonnet(true);
    } else {
      this.openBonnet(false);
      this.currentCameraTarget = this.cameraTargets[viewName] || this.cameraTargets.exterior;
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
      this.dustSheet.material.opacity = Math.max(0, 1 - progress * 2.5);
    }

    if (!this.isBonnetOpen) {
      if (progress < 0.2) {
        this.currentCameraTarget = this.cameraTargets.exterior;
      } else if (progress < 0.5) {
        this.currentCameraTarget = {
          pos: new THREE.Vector3(2.8, 1.8, 4.4),
          lookAt: new THREE.Vector3(0.5, 0.35, 0)
        };
      } else if (progress < 0.8) {
        this.currentCameraTarget = {
          pos: new THREE.Vector3(2.2, 0.8, 2.2),
          lookAt: new THREE.Vector3(1.4, -0.15, 1.0)
        };
      } else {
        this.currentCameraTarget = {
          pos: new THREE.Vector3(-4.4, 1.4, 3.2),
          lookAt: new THREE.Vector3(0, 0.35, 0)
        };
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

    // 3D Physical Bonnet Upward Swing (~60 degrees)
    const targetBonnetAngle = this.isBonnetOpen ? -Math.PI / 3.0 : 0;
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
