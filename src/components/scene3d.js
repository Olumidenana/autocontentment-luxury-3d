import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'gsap';

export class Scene3D {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.scene = new THREE.Scene();
    const initW = this.container?.clientWidth || window.innerWidth;
    const initH = this.container?.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(40, initW / initH, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    
    // Default to the photorealistic Sports Car GT (Ferrari Portofino reference)
    this.currentBodyType = 'gt_sports'; // 'gt_sports' | 'sedan' | 'mercedes'
    this.activeBrand = 'valmora';
    this.activeModelId = 'ferrari_portofino';
    this.currentPaintColor = 0xC41E3A; // Factory OEM Rosso Corsa Racing Red default

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

    // SolidWorks CAD Click-to-Separate Registry
    this.separableComponents = new Map(); // key: Object3D -> { id, label, restPos, targetPos, isSeparated, axis }
    this.interactiveMeshes = [];
    this.hoveredComp = null;

    // Raycaster & Pointer
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pointerDownPos = { x: 0, y: 0, time: 0 };

    // Kinematics & Speedometer Sensation
    this.currentSpeedKmh = 0;
    this.targetGForce = 1.0;
    this.floorGrid = null;

    // DRACO & GLTF Loaders for Production 3D Car Models
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/gltf/');
    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(dracoLoader);

    this.textureLoader = new THREE.TextureLoader();

    // Camera viewpoints for 3D inspection & roadside first-aid
    this.cameraTargets = {
      exterior:    { pos: new THREE.Vector3(5.2, 1.8, 5.2), lookAt: new THREE.Vector3(0, 0.35, 0) },
      bonnet_open: { pos: new THREE.Vector3(2.4, 1.8, 1.1), lookAt: new THREE.Vector3(1.15, 0.42, 0) },
      engine:      { pos: new THREE.Vector3(2.2, 1.6, 0.9), lookAt: new THREE.Vector3(1.15, 0.42, 0) },
      battery:     { pos: new THREE.Vector3(1.6, 1.6, 0.8), lookAt: new THREE.Vector3(1.15, 0.52, 0.45) },
      coolant:     { pos: new THREE.Vector3(2.1, 1.4, 0.5), lookAt: new THREE.Vector3(1.65, 0.48, 0.35) },
      oil_dipstick:{ pos: new THREE.Vector3(1.7, 1.6, 0.15), lookAt: new THREE.Vector3(1.25, 0.52, 0.0) },
      brake_fluid: { pos: new THREE.Vector3(1.4, 1.6, -0.6), lookAt: new THREE.Vector3(0.95, 0.55, -0.42) },
      wheel:       { pos: new THREE.Vector3(2.0, 0.4, 2.0), lookAt: new THREE.Vector3(1.4, -0.15, 1.0) },
      xray:        { pos: new THREE.Vector3(4.2, 2.4, 4.2), lookAt: new THREE.Vector3(0, 0.35, 0) }
    };

    this.currentCameraTarget = this.cameraTargets.exterior;
    this.currentLookAt = new THREE.Vector3(0, 0.35, 0);
    this.isAutoCameraTargetActive = true;

    this.createFloatingHud();
    this.init();
  }

  createFloatingHud() {
    // 1. Hover Tooltip
    this.tooltipEl = document.getElementById('scene3d-cad-tooltip');
    if (!this.tooltipEl) {
      this.tooltipEl = document.createElement('div');
      this.tooltipEl.id = 'scene3d-cad-tooltip';
      this.tooltipEl.className = 'scene3d-cad-tooltip';
      this.tooltipEl.style.display = 'none';
      document.body.appendChild(this.tooltipEl);
    }

    // 2. Action Toast Notification
    this.toastEl = document.getElementById('scene3d-cad-toast');
    if (!this.toastEl) {
      this.toastEl = document.createElement('div');
      this.toastEl.id = 'scene3d-cad-toast';
      this.toastEl.className = 'scene3d-cad-toast';
      this.toastEl.style.display = 'none';
      document.body.appendChild(this.toastEl);
    }
  }

  showInspectToast(message, icon = '🔍') {
    if (!this.toastEl) return;
    this.toastEl.innerHTML = `<span style="font-size:16px;">${icon}</span><span>${message}</span>`;
    this.toastEl.style.display = 'flex';
    this.toastEl.style.opacity = '1';

    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.toastEl.style.opacity = '0';
      setTimeout(() => { this.toastEl.style.display = 'none'; }, 300);
    }, 3800);
  }

  handleResize() {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  init() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    const ext = this.cameraTargets.exterior;
    this.camera.position.copy(ext.pos);
    this.camera.lookAt(ext.lookAt);

    // OrbitControls for Full 360° Studio Inspection
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 18.0;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.02; // Studio floor limit
    this.controls.target.copy(ext.lookAt);

    this.controls.addEventListener('start', () => {
      this.isAutoCameraTargetActive = false;
    });

    this.setupLighting();
    this.buildStudioShowroom();

    // Assemble Car Hierarchy
    this.carGroup.add(this.chassisMeshGroup);
    this.carGroup.add(this.engineBayGroup);
    this.carGroup.add(this.bonnetGroup);
    this.scene.add(this.carGroup);

    // Load initial authentic intact 3D car model (Ferrari Portofino GT Sports Car default)
    this.loadVehicleModel('gt_sports');
    this.buildEngineComponents('valmora', 'ferrari_portofino');
    this.buildBonnetMesh();
    this.buildDustSheet();

    // Engine bay and bonnet start closed & hidden so exterior is 100% clean and pristine
    this.isBonnetOpen = false;
    this.engineBayGroup.visible = false;
    this.bonnetGroup.visible = false;
    this.updateInteractiveMeshes();

    this.setupEvents();
    this.animate();
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.95);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(6, 14, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
    fillLight.position.set(-6, 9, -6);
    this.scene.add(fillLight);

    // Warm golden rim light for luxury showroom halo
    const rimLight = new THREE.DirectionalLight(0xfef08a, 1.8);
    rimLight.position.set(0, 6, -8);
    this.scene.add(rimLight);

    // Dedicated Engine Bay Inspection Spotlight
    this.engineSpotlight = new THREE.SpotLight(0xffffff, 0, 12, Math.PI / 4, 0.35, 1);
    this.engineSpotlight.position.set(1.4, 3.5, 0);
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
    this.floorGrid = grid;

    const shadowGeo = new THREE.PlaneGeometry(5.4, 2.8);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.85 });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, -0.505, 0);
    this.scene.add(shadow);
  }

  setVehicleSpeed(speedKmh, gForce = 1.0) {
    this.currentSpeedKmh = Math.max(0, speedKmh);
    this.targetGForce = gForce;
  }

  /**
   * Registers a separable 3D component (wheel, glass canopy, etc.) for SolidWorks CAD click-to-separate mechanics
   */
  registerSeparableComponent(object, id, label, separationVector) {
    const comp = {
      object,
      id,
      label,
      separationVector,
      restPos: object.position.clone(),
      isSeparated: false
    };
    this.separableComponents.set(id, comp);

    object.traverse((child) => {
      if (child.isMesh) {
        child.userData.separableComp = comp;
        this.interactiveMeshes.push(child);
      }
    });
  }

  /**
   * Resets all separated components smoothly back into the intact chassis assembly
   */
  resetAllSeparations() {
    let count = 0;
    this.separableComponents.forEach((comp) => {
      if (comp.isSeparated) {
        comp.isSeparated = false;
        count++;
        gsap.to(comp.object.position, {
          x: comp.restPos.x,
          y: comp.restPos.y,
          z: comp.restPos.z,
          duration: 0.75,
          ease: 'power2.inOut'
        });
      }
    });

    if (this.isBonnetOpen) {
      this.openBonnet(false);
      count++;
    }

    this.setCameraView('exterior');
    this.showInspectToast('🧲 Assembly Reset: All components seated to factory specifications.', '🧲');
    return count;
  }

  /**
   * Loads high-detail production 3D vehicle models completely intact
   * (Coachbuilt Sports GT Ferrari Portofino, Executive Sedan M-Sport, Mercedes Luxury SUV)
   */
  loadVehicleModel(type) {
    let modelPath = '/models/ferrari.glb';
    let scale = 1.0;
    let rotationY = -Math.PI / 2;
    let posY = -0.50;

    if (type === 'mercedes') {
      modelPath = '/models/mercedes.glb';
      scale = 0.88;
      rotationY = Math.PI / 2;
      posY = -0.50;
    } else if (type === 'sedan') {
      modelPath = '/models/sedan.glb';
      scale = 1.05;
      rotationY = -Math.PI / 2;
      posY = -0.48;
    } else if (type === 'gt_sports' || type === 'ferrari') {
      modelPath = '/models/ferrari.glb';
      scale = 1.0;
      rotationY = -Math.PI / 2;
      posY = -0.50;
    }

    console.log(`Loading intact 3D vehicle model: ${modelPath}`);

    this.gltfLoader.load(modelPath, (gltf) => {
      // Clear previous car model from chassis group
      while (this.chassisMeshGroup.children.length > 0) {
        this.chassisMeshGroup.remove(this.chassisMeshGroup.children[0]);
      }
      this.bodyMaterials = [];
      this.wheels = [];
      this.separableComponents.clear();
      this.interactiveMeshes = [];

      // Re-register bonnet meshes in interactive list
      this.bonnetGroup.traverse((child) => {
        if (child.isMesh) {
          child.userData.isBonnet = true;
          this.interactiveMeshes.push(child);
        }
      });

      // Re-register first-aid pin meshes in interactive list
      Object.values(this.firstAidPins).forEach((pin) => {
        pin.traverse((child) => {
          if (child.isMesh) {
            child.userData.firstAidPin = pin;
            this.interactiveMeshes.push(child);
          }
        });
      });

      const model = gltf.scene;
      model.scale.set(scale, scale, scale);
      model.position.set(0, posY, 0);
      model.rotation.y = rotationY;

      // 1. Identify Separable Parent Groups in Ferrari / Sports GT
      model.traverse((child) => {
        const nodeName = (child.name || '').toLowerCase();

        // Ferrari Isolated Wheel Groups
        if (nodeName === 'wheel_fl') {
          this.registerSeparableComponent(child, 'wheel_fl', 'Front Left Wheel & Brembo Carbon-Ceramic Caliper', new THREE.Vector3(-1.35, 0, 0));
        } else if (nodeName === 'wheel_fr') {
          this.registerSeparableComponent(child, 'wheel_fr', 'Front Right Wheel & Brembo Carbon-Ceramic Caliper', new THREE.Vector3(1.35, 0, 0));
        } else if (nodeName === 'wheel_rl') {
          this.registerSeparableComponent(child, 'wheel_rl', 'Rear Left Wheel & Ventilated Disc', new THREE.Vector3(-1.35, 0, 0));
        } else if (nodeName === 'wheel_rr') {
          this.registerSeparableComponent(child, 'wheel_rr', 'Rear Right Wheel & Ventilated Disc', new THREE.Vector3(1.35, 0, 0));
        } else if (nodeName === 'glass') {
          this.registerSeparableComponent(child, 'glass', 'Aerodynamic Cockpit Glass Canopy', new THREE.Vector3(0, 1.4, 0));
        } else if (nodeName.includes('wheel front l') || nodeName.includes('front l_47')) {
          this.registerSeparableComponent(child, 'wheel_fl', 'Front Left Wheel Assembly', new THREE.Vector3(-1.35, 0, 0));
        } else if (nodeName.includes('wheel front r') || nodeName.includes('front r_')) {
          this.registerSeparableComponent(child, 'wheel_fr', 'Front Right Wheel Assembly', new THREE.Vector3(1.35, 0, 0));
        } else if (nodeName.includes('wheel rear l') || nodeName.includes('rear l_')) {
          this.registerSeparableComponent(child, 'wheel_rl', 'Rear Left Wheel Assembly', new THREE.Vector3(-1.35, 0, 0));
        } else if (nodeName.includes('wheel rear r') || nodeName.includes('rear r_')) {
          this.registerSeparableComponent(child, 'wheel_rr', 'Rear Right Wheel Assembly', new THREE.Vector3(1.35, 0, 0));
        }
      });

      // 2. Material Shading and Mesh Registering
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          const matName = child.material && child.material.name ? child.material.name.toLowerCase() : '';
          const nodeName = child.name ? child.name.toLowerCase() : '';

          // Identify OEM Paint Panels
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
            matName.includes('glass') || 
            matName.includes('window') || 
            nodeName.includes('glass') || 
            nodeName.includes('window')
          ) {
            // Realistic tinted automotive glass
            child.material = new THREE.MeshPhysicalMaterial({
              color: 0x0a1018,
              metalness: 0.1,
              roughness: 0.04,
              transmission: 0.9,
              ior: 1.52,
              transparent: true,
              opacity: 0.88
            });
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
          } else if (matName.includes('tire') || nodeName.includes('tire')) {
            if (child.material) {
              child.material.roughness = 0.85;
              child.material.metalness = 0.1;
            }
            this.wheels.push(child);
          } else if (matName.includes('brake') || nodeName.includes('brake') || nodeName.includes('caliper')) {
            if (child.material) {
              child.material.color = new THREE.Color(0xdc2626); // Brembo Calipers
              child.material.metalness = 0.8;
              child.material.roughness = 0.25;
            }
          }
        }
      });

      this.chassisMeshGroup.add(model);
      console.log(`Loaded intact 3D vehicle model ${modelPath} successfully!`);
    }, undefined, (err) => {
      console.error(`Error loading model ${modelPath}:`, err);
    });
  }

  /**
   * Constructs the Roadside First-Aid Engine Bay under the hood
   * tailored to the real-world mechanical characteristics of each brand/model:
   * - Ferrari / Sports GT: 3.9L/4.0L Twin-Turbo Hot-Vee V8 with Rosso Corsa crackle valve covers, twin turbos, carbon plenum.
   * - Mercedes-Benz: AMG 4.0L V8 Biturbo / 3.5L V6 with dark obsidian block and silver intake plenums.
   * - Toyota / Lexus: Dual VVT-i 3.5L V6 composite manifold cover with hybrid/sport accents.
   * - Honda: Earth Dreams i-VTEC red stripe performance cover.
   * All configurations feature the 4 interactive first-aid checkpoints.
   */
  buildEngineComponents(brand = this.activeBrand, modelId = this.activeModelId) {
    while (this.engineBayGroup.children.length > 0) {
      this.engineBayGroup.remove(this.engineBayGroup.children[0]);
    }
    this.firstAidPins = {};

    this.engineBayGroup.position.set(1.2, 0.0, 0);

    const isSportsGT = brand === 'valmora' || this.currentBodyType === 'gt_sports' || modelId.includes('ferrari');
    const isMercedes = brand === 'mercedes';
    const isToyotaLexus = brand === 'toyota' || brand === 'lexus';
    const isHonda = brand === 'honda';

    // 1. Engine Block (Die-Cast Alloy tailored per brand)
    let blockColor = 0x242830;
    if (isSportsGT) blockColor = 0x1e2127;
    if (isMercedes) blockColor = 0x1f242d;
    if (isToyotaLexus) blockColor = 0x181c22;
    if (isHonda) blockColor = 0x262b33;

    const blockMat = new THREE.MeshStandardMaterial({ color: blockColor, metalness: 0.92, roughness: 0.28 });
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.46, 0.70), blockMat);
    block.position.set(0, 0.12, 0);
    this.engineBayGroup.add(block);

    // 2. Cylinder Head Valve Covers
    let valveCoverColor = 0x18202c;
    let valveRoughness = 0.18;
    let valveMetalness = 0.88;

    if (isSportsGT) {
      // Ferrari / Valmora GT Rosso Corsa crackle red
      valveCoverColor = 0xc41e3a;
      valveRoughness = 0.32;
      valveMetalness = 0.80;
    } else if (isMercedes) {
      // Mercedes AMG graphite & silver
      valveCoverColor = 0x334155;
      valveRoughness = 0.15;
      valveMetalness = 0.94;
    } else if (isToyotaLexus) {
      // Toyota/Lexus composite charcoal
      valveCoverColor = 0x0f172a;
      valveRoughness = 0.40;
      valveMetalness = 0.50;
    } else if (isHonda) {
      // Honda gunmetal with red racing accent
      valveCoverColor = 0xdc2626;
      valveRoughness = 0.25;
      valveMetalness = 0.82;
    }

    const valveCoverMat = new THREE.MeshStandardMaterial({
      color: valveCoverColor,
      metalness: valveMetalness,
      roughness: valveRoughness
    });

    const leftValve = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.14, 0.25), valveCoverMat);
    leftValve.position.set(0, 0.38, 0.24);
    leftValve.rotation.x = 0.38;
    this.engineBayGroup.add(leftValve);

    const rightValve = leftValve.clone();
    rightValve.position.z = -0.24;
    rightValve.rotation.x = -0.38;
    this.engineBayGroup.add(rightValve);

    // 3. Intake Plenum & Induction Runners
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.98, roughness: 0.06 });
    const plenum = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.14, 0.32), chromeMat);
    plenum.position.set(0, 0.46, 0);
    this.engineBayGroup.add(plenum);

    // Twin Turbochargers for Sports GT / Mercedes AMG
    if (isSportsGT || isMercedes) {
      const turboMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.12 });
      
      const leftTurbo = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.16, 24), turboMat);
      leftTurbo.rotation.z = Math.PI / 2;
      leftTurbo.position.set(0.32, 0.28, 0.42);
      this.engineBayGroup.add(leftTurbo);

      const rightTurbo = leftTurbo.clone();
      rightTurbo.position.z = -0.42;
      this.engineBayGroup.add(rightTurbo);
    }

    // 4. FIRST-AID 3D COMPONENT: 12V Starter Battery & Terminals
    const batteryGroup = new THREE.Group();
    const batteryBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.30, 0.28, 0.38),
      new THREE.MeshStandardMaterial({ color: 0x0f141c, roughness: 0.65 })
    );
    batteryGroup.add(batteryBox);

    const posTerminal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.07, 16),
      new THREE.MeshBasicMaterial({ color: 0xdc2626 })
    );
    posTerminal.position.set(0.08, 0.16, 0.11);
    batteryGroup.add(posTerminal);

    const negTerminal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.07, 16),
      new THREE.MeshBasicMaterial({ color: 0x1e293b })
    );
    negTerminal.position.set(0.08, 0.16, -0.11);
    batteryGroup.add(negTerminal);

    batteryGroup.position.set(-0.08, 0.35, 0.55);
    this.engineBayGroup.add(batteryGroup);
    this.addFirstAidPin('battery', '12V Battery & Terminals', [-0.08, 0.58, 0.55], '#dc2626');

    // 5. FIRST-AID 3D COMPONENT: Radiator Cap & Coolant Tank
    const coolantGroup = new THREE.Group();
    const coolantTank = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.28, 0.24),
      new THREE.MeshPhysicalMaterial({ color: 0xa7f3d0, transmission: 0.75, roughness: 0.18, transparent: true })
    );
    coolantGroup.add(coolantTank);

    const radCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.058, 0.058, 0.045, 16),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.88, roughness: 0.12 })
    );
    radCap.position.set(0, 0.16, 0);
    coolantGroup.add(radCap);

    coolantGroup.position.set(0.58, 0.32, 0.44);
    this.engineBayGroup.add(coolantGroup);
    this.addFirstAidPin('coolant', 'Radiator Coolant Tank & Cap', [0.58, 0.55, 0.44], '#f59e0b');

    // 6. FIRST-AID 3D COMPONENT: Engine Oil Dipstick Loop
    const dipstickGroup = new THREE.Group();
    const oilDipstick = new THREE.Mesh(
      new THREE.TorusGeometry(0.042, 0.014, 12, 24),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    dipstickGroup.add(oilDipstick);

    const dipstickTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.42, 12),
      chromeMat
    );
    dipstickTube.position.y = -0.23;
    dipstickGroup.add(dipstickTube);

    dipstickGroup.position.set(0.14, 0.54, 0.04);
    this.engineBayGroup.add(dipstickGroup);
    this.addFirstAidPin('oil_dipstick', 'Engine Oil Dipstick & Level Check', [0.14, 0.65, 0.04], '#fbbf24');

    // 7. FIRST-AID 3D COMPONENT: Brake Fluid Master Cylinder Reservoir
    const brakeFluidTank = new THREE.Mesh(
      new THREE.BoxGeometry(0.19, 0.22, 0.20),
      new THREE.MeshPhysicalMaterial({ color: 0xfef08a, transmission: 0.78, roughness: 0.18, transparent: true })
    );
    brakeFluidTank.position.set(-0.38, 0.45, -0.46);
    this.engineBayGroup.add(brakeFluidTank);

    const brakeCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.03, 16),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3 })
    );
    brakeCap.position.set(-0.38, 0.58, -0.46);
    this.engineBayGroup.add(brakeCap);

    this.addFirstAidPin('brake_fluid', 'Brake Master Cylinder Reservoir', [-0.38, 0.65, -0.46], '#3b82f6');
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

    // Sculpted Bonnet Lid
    const bonnetLid = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.03, 1.45), bonnetMat);
    bonnetLid.position.set(0.82, 0, 0);
    bonnetLid.userData.isBonnet = true;
    this.bonnetGroup.add(bonnetLid);
    this.interactiveMeshes.push(bonnetLid);

    // Center Crease Lines
    const creaseMat = new THREE.MeshStandardMaterial({ color: 0x111317, metalness: 0.5, roughness: 0.5 });
    const creaseLeft = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.02, 0.02), creaseMat);
    creaseLeft.position.set(0.8, 0.025, 0.25);
    creaseLeft.userData.isBonnet = true;
    this.bonnetGroup.add(creaseLeft);
    this.interactiveMeshes.push(creaseLeft);

    const creaseRight = creaseLeft.clone();
    creaseRight.position.z = -0.25;
    creaseRight.userData.isBonnet = true;
    this.bonnetGroup.add(creaseRight);
    this.interactiveMeshes.push(creaseRight);
  }

  addFirstAidPin(id, name, localPos, hexColor) {
    const pinGroup = new THREE.Group();

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.06, 0.09, 24),
      new THREE.MeshBasicMaterial({ color: hexColor, side: THREE.DoubleSide })
    );
    ring.rotateX(Math.PI / 2);
    ring.userData.firstAidPin = pinGroup;
    pinGroup.add(ring);
    this.interactiveMeshes.push(ring);

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    sphere.userData.firstAidPin = pinGroup;
    pinGroup.add(sphere);
    this.interactiveMeshes.push(sphere);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.15, 8),
      new THREE.MeshBasicMaterial({ color: hexColor })
    );
    stem.position.y = 0.08;
    stem.userData.firstAidPin = pinGroup;
    pinGroup.add(stem);
    this.interactiveMeshes.push(stem);

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
  setVehicleModel(brand, modelId, oemHex, modelObj) {
    if (oemHex !== undefined) {
      this.currentPaintColor = oemHex;
      this.setCarPaint(oemHex);
    }
    this.activeBrand = brand;
    this.activeModelId = modelId;

    let bodyType = 'gt_sports';
    if (modelObj && modelObj.bodyType) {
      bodyType = modelObj.bodyType;
    } else if (modelId.includes('valmora') || modelId.includes('ferrari')) {
      bodyType = 'gt_sports';
    } else if (modelId.includes('prado') || modelId.includes('rx350') || modelId.includes('gle') || modelId.includes('g63') || modelId.includes('highlander') || modelId.includes('gx460') || modelId.includes('crv')) {
      bodyType = 'mercedes';
    } else {
      bodyType = 'sedan';
    }

    if (bodyType !== this.currentBodyType) {
      this.currentBodyType = bodyType;
      this.loadVehicleModel(bodyType);
    }

    // Rebuild engine bay with brand-specific mechanical components
    this.buildEngineComponents(brand, modelId);
  }

  /**
   * Rebuilds raycast interactive meshes list dynamically.
   * Engine components and roadside first-aid pins are only interactive when bonnet is open.
   */
  updateInteractiveMeshes() {
    this.interactiveMeshes = [];

    // 1. Separable components (wheels, glass) are always interactive
    this.separableComponents.forEach((comp) => {
      comp.object.traverse((child) => {
        if (child.isMesh) {
          child.userData.separableComp = comp;
          this.interactiveMeshes.push(child);
        }
      });
    });

    // 2. Bonnet is interactive
    if (this.bonnetGroup) {
      this.bonnetGroup.traverse((child) => {
        if (child.isMesh) {
          child.userData.isBonnet = true;
          this.interactiveMeshes.push(child);
        }
      });
    }

    // 3. Engine components and first-aid pins are ONLY interactive when bonnet is open!
    if (this.isBonnetOpen) {
      Object.values(this.firstAidPins).forEach((pin) => {
        pin.traverse((child) => {
          if (child.isMesh) {
            child.userData.firstAidPin = pin;
            this.interactiveMeshes.push(child);
          }
        });
      });
    }
  }

  /**
   * Toggles the physical 3D Bonnet open or closed
   */
  toggleBonnet() {
    return this.openBonnet(!this.isBonnetOpen);
  }

  openBonnet(open) {
    this.isBonnetOpen = open;
    this.isAutoCameraTargetActive = true;

    if (open) {
      this.engineBayGroup.visible = true;
      this.bonnetGroup.visible = true;
      this.currentCameraTarget = this.cameraTargets.bonnet_open;
      if (this.engineSpotlight) this.engineSpotlight.intensity = 5.0;

      // Animate bonnet swing upward ~60 degrees
      gsap.to(this.bonnetGroup.rotation, { z: -Math.PI / 3.0, duration: 0.8, ease: "power2.out" });
      gsap.to(this.bonnetGroup.position, { y: 0.72, x: 0.38, duration: 0.8, ease: "power2.out" });

      // Ghost the car body slightly so internal engine block & turbos are crystal clear
      this.bodyMaterials.forEach(mat => {
        mat.transparent = true;
        mat.opacity = 0.45;
      });
    } else {
      // Smooth close animation
      gsap.to(this.bonnetGroup.rotation, { z: 0, duration: 0.6, ease: "power2.in" });
      gsap.to(this.bonnetGroup.position, { y: 0.64, x: 0.35, duration: 0.6, ease: "power2.in" });

      // Restore solid OEM paint
      this.bodyMaterials.forEach(mat => {
        mat.transparent = false;
        mat.opacity = 1.0;
      });

      setTimeout(() => {
        if (!this.isBonnetOpen) {
          this.engineBayGroup.visible = false;
          this.bonnetGroup.visible = false;
        }
      }, 620);

      this.currentCameraTarget = this.cameraTargets.exterior;
      if (this.engineSpotlight) this.engineSpotlight.intensity = 0;
    }

    this.updateInteractiveMeshes();
    return this.isBonnetOpen;
  }

  focusFirstAidComponent(componentId) {
    this.activePin = componentId;
    this.openBonnet(true);

    const targetKey = this.cameraTargets[componentId] ? componentId : 'bonnet_open';
    this.currentCameraTarget = this.cameraTargets[targetKey];
    this.isAutoCameraTargetActive = true;

    if (this.engineSpotlight) {
      this.engineSpotlight.intensity = 5.0;
    }
  }

  setCameraView(viewName) {
    this.activePin = null;
    this.isAutoCameraTargetActive = true;

    if (viewName === 'engine') {
      this.openBonnet(true);
      this.currentCameraTarget = this.cameraTargets.bonnet_open;
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
      this.isAutoCameraTargetActive = true;
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
    if (window.ResizeObserver && this.container) {
      this._resizeObserver = new ResizeObserver(() => this.handleResize());
      this._resizeObserver.observe(this.container);
    }
    window.addEventListener('resize', () => this.handleResize());

    const dom = this.renderer.domElement;

    // Pointer move for Raycasting & Tooltip
    dom.addEventListener('pointermove', (e) => {
      const rect = dom.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, this.camera);
      const intersects = this.raycaster.intersectObjects(this.interactiveMeshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        dom.style.cursor = 'pointer';

        if (hit.userData.separableComp) {
          const comp = hit.userData.separableComp;
          this.tooltipEl.textContent = `🔍 ${comp.label} (Click to ${comp.isSeparated ? 'Lock Assembly' : 'Separate & Inspect'})`;
          this.tooltipEl.style.display = 'block';
          this.tooltipEl.style.left = `${e.clientX + 14}px`;
          this.tooltipEl.style.top = `${e.clientY + 14}px`;
        } else if (hit.userData.isBonnet) {
          this.tooltipEl.textContent = `⚙️ Sculpted Aluminium Bonnet (Click to ${this.isBonnetOpen ? 'Close' : 'Open'} Engine Bay)`;
          this.tooltipEl.style.display = 'block';
          this.tooltipEl.style.left = `${e.clientX + 14}px`;
          this.tooltipEl.style.top = `${e.clientY + 14}px`;
        } else if (hit.userData.firstAidPin) {
          const pin = hit.userData.firstAidPin;
          this.tooltipEl.textContent = `🚑 ${pin.userData.name} (Click for Roadside Triage)`;
          this.tooltipEl.style.display = 'block';
          this.tooltipEl.style.left = `${e.clientX + 14}px`;
          this.tooltipEl.style.top = `${e.clientY + 14}px`;
        }
      } else {
        dom.style.cursor = 'default';
        if (this.tooltipEl) this.tooltipEl.style.display = 'none';
      }
    });

    // Pointer down for Drag vs Click discrimination
    dom.addEventListener('pointerdown', (e) => {
      this.pointerDownPos = { x: e.clientX, y: e.clientY, time: performance.now() };
    });

    // Pointer up for SolidWorks CAD Click-to-Separate
    dom.addEventListener('pointerup', (e) => {
      const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
      const elapsed = performance.now() - this.pointerDownPos.time;

      // Only treat as click if pointer didn't drag to orbit
      if (dist < 6 && elapsed < 400) {
        const rect = dom.getBoundingClientRect();
        this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactiveMeshes, false);

        if (intersects.length > 0) {
          const hit = intersects[0].object;

          // 1. Separable Component Click (Wheels, Glass Canopy)
          if (hit.userData.separableComp) {
            const comp = hit.userData.separableComp;
            comp.isSeparated = !comp.isSeparated;

            const targetPos = comp.isSeparated 
              ? comp.restPos.clone().add(comp.separationVector) 
              : comp.restPos.clone();

            gsap.to(comp.object.position, {
              x: targetPos.x,
              y: targetPos.y,
              z: targetPos.z,
              duration: 0.85,
              ease: comp.isSeparated ? 'power2.out' : 'power2.inOut'
            });

            this.showInspectToast(
              comp.isSeparated 
                ? `🔍 Separated ${comp.label} for SolidWorks CAD inspection.` 
                : `🔒 Re-seated ${comp.label} into factory assembly.`
            );
          }
          // 2. Bonnet Click
          else if (hit.userData.isBonnet) {
            const open = this.toggleBonnet();
            this.showInspectToast(
              open 
                ? '⚙️ Bonnet opened: Inspecting real-world engine & first-aid triage checkpoints.' 
                : '⚙️ Bonnet closed.'
            );
          }
          // 3. First-Aid Pin Click
          else if (hit.userData.firstAidPin) {
            const pin = hit.userData.firstAidPin;
            this.focusFirstAidComponent(pin.userData.id);
            this.showInspectToast(`🚑 First-Aid Checkpoint: ${pin.userData.name}`, '🚑');

            window.dispatchEvent(new CustomEvent('firstAidTriageTriggered', {
              detail: { componentId: pin.userData.id, name: pin.userData.name }
            }));
          }
        }
      }
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Camera & OrbitControls Navigation
    if (this.controls) {
      this.controls.update();
    }

    if (this.isAutoCameraTargetActive && this.currentCameraTarget) {
      this.camera.position.lerp(this.currentCameraTarget.pos, 0.055);
      this.currentLookAt.lerp(this.currentCameraTarget.lookAt, 0.055);
      if (this.controls) {
        this.controls.target.lerp(this.currentCameraTarget.lookAt, 0.055);
      } else {
        this.camera.lookAt(this.currentLookAt);
      }
    }

    // 3D Physical Bonnet Upward Swing (~60 degrees)
    const targetBonnetAngle = this.isBonnetOpen ? -Math.PI / 3.0 : 0;
    this.bonnetGroup.rotation.z += (targetBonnetAngle - this.bonnetGroup.rotation.z) * 0.08;

    // Kinematics Speedometer Sensation: Wheel Rotation, Road Stream & Suspension Heave
    if (this.currentSpeedKmh > 0.1) {
      const speedMps = this.currentSpeedKmh / 3.6;
      const wheelRadius = 0.35; // meters
      const deltaRotation = (speedMps / wheelRadius) * 0.016;

      this.wheels.forEach(wheel => {
        wheel.rotation.x += deltaRotation;
      });

      if (this.floorGrid) {
        this.floorGrid.position.z = (this.floorGrid.position.z + speedMps * 0.045) % 1.75;
      }

      // Subtle suspension vibration at speed
      const vibration = Math.sin(performance.now() * 0.035) * Math.min(0.015, (this.currentSpeedKmh / 140) * 0.01);
      this.carGroup.position.y = vibration;
    } else {
      this.carGroup.position.y = 0;
    }

    // Pothole Shock / High G-Force recoil
    if (this.targetGForce > 1.3) {
      const shock = (this.targetGForce - 1.0) * 0.06;
      this.carGroup.position.y -= shock;
      this.carGroup.rotation.z = (Math.random() - 0.5) * 0.035;
      this.targetGForce += (1.0 - this.targetGForce) * 0.09;
    } else {
      this.carGroup.rotation.z = 0;
    }

    // Auto-rotation
    if (this.autoRotate) {
      this.carGroup.rotation.y += 0.008;
    }

    // Pulsing holographic first-aid pins
    const time = performance.now() * 0.004;
    Object.keys(this.firstAidPins).forEach((key, i) => {
      const pin = this.firstAidPins[key];
      const scale = 1.0 + Math.sin(time + i * 1.5) * 0.25;
      pin.scale.set(scale, scale, scale);
    });

    this.renderer.render(this.scene, this.camera);
  }
}
