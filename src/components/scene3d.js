import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

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

    // CAD Disassembly / Exploded View System (SolidWorks & Mercedes Tech Exhibition Style)
    this.disassemblyProgress = 0.0;
    this.targetDisassemblyProgress = 0.0;
    this.isExploded = false;
    this.explodedParts = [];
    this.cadLeaderLines = null;
    this.cadLinePositions = null;

    // DRACO & GLTF Loaders for High-Fidelity 3D Car Models
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/gltf/');
    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(dracoLoader);

    this.textureLoader = new THREE.TextureLoader();
    this.currentEngineImageUrl = '/images/engines/engine_mercedes_v6.jpg';
    this.currentCarImageUrl = '/images/cars/mercedes_e350.jpg';

    this.cameraTargets = {
      exterior:    { pos: new THREE.Vector3(5.2, 1.8, 5.2), lookAt: new THREE.Vector3(0, 0.35, 0) },
      exploded:    { pos: new THREE.Vector3(5.8, 3.6, 5.8), lookAt: new THREE.Vector3(0, 0.75, 0) },
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
    this.isAutoCameraTargetActive = true;
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

    // OrbitControls for Full 360° Studio Inspection (SolidWorks / Blender CAD feel)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 18.0;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.02; // Studio ground barrier
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

    // Load initial authentic Mercedes 3D model
    this.loadVehicleModel('mercedes');
    this.buildEngineComponents();
    this.buildBonnetMesh();
    this.buildCadLeaderLines();
    this.buildDustSheet();
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

    const shadowGeo = new THREE.PlaneGeometry(5.4, 2.8);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.85 });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, -0.505, 0);
    this.scene.add(shadow);
  }

  /**
   * Loads high-detail production 3D vehicle models (Mercedes, Executive Sedan, Sports GT)
   * and prepares every sub-mesh for real-time CAD exploded disassembly kinematics.
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

    console.log(`Loading 3D CAD model: ${modelPath}`);

    this.gltfLoader.load(modelPath, (gltf) => {
      // Clear previous car model from chassis group
      while (this.chassisMeshGroup.children.length > 0) {
        this.chassisMeshGroup.remove(this.chassisMeshGroup.children[0]);
      }
      this.bodyMaterials = [];
      this.wheels = [];
      this.explodedParts = [];

      const model = gltf.scene;
      model.scale.set(scale, scale, scale);
      model.position.set(0, posY, 0);
      model.rotation.y = rotationY;

      // Identify major structural nodes & assign CAD Disassembly Vectors
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          const matName = child.material && child.material.name ? child.material.name.toLowerCase() : '';
          const nodeName = child.name ? child.name.toLowerCase() : '';

          // 1. Identify OEM Paint Panels
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
            // High-luster AMG alloy rims
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
          } else if (matName.includes('brake') || nodeName.includes('brake') || nodeName.includes('caliper')) {
            if (child.material) {
              child.material.color = new THREE.Color(0xdc2626); // Brembo Red Calipers
              child.material.metalness = 0.8;
              child.material.roughness = 0.25;
            }
          }
        }
      });

      // Spatial & Semantic CAD Disassembly Mapping across model hierarchy
      model.traverse((child) => {
        // Only target objects with transform capability that are sub-assemblies or meshes
        if (child.isMesh || (child.isGroup && child.children.length > 0 && child.parent === model || child.name.includes('Wheel') || child.name.includes('Door') || child.name.includes('Hood'))) {
          const name = (child.name || '').toLowerCase();
          const box = new THREE.Box3().setFromObject(child);
          const center = new THREE.Vector3();
          box.getCenter(center);

          let explodeVec = new THREE.Vector3(0, 0, 0);
          let deltaRotZ = 0;

          const isWheel = name.includes('wheel') || name.includes('rim') || name.includes('tire') || name.includes('brake');
          const isDoor = name.includes('door') || (Math.abs(center.z) > 0.65 && center.y > 0.1 && Math.abs(center.x) < 0.9);
          const isHood = name.includes('hood') || name.includes('bonnet');
          const isEngine = name.includes('engine');

          if (isWheel) {
            // Wheels and brake assemblies shoot laterally outward (±Z)
            const zSide = center.z >= 0 ? 1 : -1;
            const xOffset = center.x > 0 ? 0.2 : -0.2;
            explodeVec.set(xOffset, 0, zSide * 1.75);
          } else if (isDoor) {
            // Doors glide outward laterally and slightly upward
            const zSide = center.z >= 0 ? 1 : -1;
            explodeVec.set(0, 0.45, zSide * 1.45);
          } else if (isHood) {
            // Hood pulls forward and lifts high
            explodeVec.set(0.75, 2.2, 0);
            deltaRotZ = -0.35;
          } else if (isEngine) {
            // Engine remains anchored at center focal point
            explodeVec.set(0, 0.1, 0);
          } else if (center.y > 0.35 && Math.abs(center.x) < 0.9) {
            // Roof, glass greenhouse, roof pillars elevate straight up
            explodeVec.set(0, 2.2, 0);
          } else if (center.y < -0.15 && Math.abs(center.z) < 0.6) {
            // Underbody chassis, belly pan, exhaust drop downward
            explodeVec.set(0, -0.65, 0);
          } else if (center.x > 1.1) {
            // Front bumper & grille slide forward
            explodeVec.set(1.4, 0.35, 0);
          } else if (center.x < -1.1) {
            // Rear bumper & diffuser slide backward
            explodeVec.set(-1.4, 0.35, 0);
          }

          if (explodeVec.lengthSq() > 0.01) {
            this.explodedParts.push({
              object: child,
              restPos: child.position.clone(),
              explodeVec: explodeVec,
              restRot: child.rotation.clone(),
              deltaRotZ: deltaRotZ
            });
          }
        }
      });

      this.chassisMeshGroup.add(model);
      console.log(`Loaded 3D vehicle model ${modelPath} successfully! Mapped ${this.explodedParts.length} CAD exploded sub-assemblies.`);
      
      // Update CAD leader line geometry for the new model
      this.updateCadLeaderLineVertices();
    }, undefined, (err) => {
      console.error(`Error loading model ${modelPath}:`, err);
    });
  }

  /**
   * Builds CAD Technical Leader & Drafting Lines (SolidWorks / Blender Exploded Assembly style)
   * Connects separated mechanical components to their resting chassis mounts with glowing dashed lines.
   */
  buildCadLeaderLines() {
    if (this.cadLeaderLines) {
      this.scene.remove(this.cadLeaderLines);
    }

    const lineCount = 14;
    const positions = new Float32Array(lineCount * 6); // 2 vertices per line (x, y, z)
    this.cadLinePositions = positions;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    });

    this.cadLeaderLines = new THREE.LineSegments(geometry, material);
    this.scene.add(this.cadLeaderLines);
  }

  updateCadLeaderLineVertices() {
    if (!this.cadLinePositions || !this.cadLeaderLines) return;

    // Define 14 mechanical anchor points connecting chassis to exploded components
    const anchors = [
      // 4 Wheel Hubs -> Exploded Wheel Centers
      { from: [1.2, 0.0, 0.72], toVec: [0.2, 0, 1.75] },
      { from: [-1.2, 0.0, 0.72], toVec: [-0.2, 0, 1.75] },
      { from: [1.2, 0.0, -0.72], toVec: [0.2, 0, -1.75] },
      { from: [-1.2, 0.0, -0.72], toVec: [-0.2, 0, -1.75] },

      // 4 Roof Pillars -> Elevated Roof Shell
      { from: [0.4, 0.45, 0.55], toVec: [0, 2.2, 0] },
      { from: [-0.6, 0.45, 0.55], toVec: [0, 2.2, 0] },
      { from: [0.4, 0.45, -0.55], toVec: [0, 2.2, 0] },
      { from: [-0.6, 0.45, -0.55], toVec: [0, 2.2, 0] },

      // 2 Doors -> Lateral Door Skins
      { from: [0.0, 0.25, 0.75], toVec: [0, 0.45, 1.45] },
      { from: [0.0, 0.25, -0.75], toVec: [0, 0.45, -1.45] },

      // Bonnet Hinge -> Lifted Hood
      { from: [0.35, 0.64, 0], toVec: [0.75, 2.2, 0] },

      // Front Fascia -> Front Bumper
      { from: [1.8, 0.0, 0], toVec: [1.4, 0.35, 0] },

      // Rear Fascia -> Rear Diffuser
      { from: [-1.8, 0.0, 0], toVec: [-1.4, 0.35, 0] },

      // Underbody Belly Pan -> Dropped Skid Plate
      { from: [0.0, -0.3, 0], toVec: [0, -0.65, 0] }
    ];

    const s = this.disassemblyProgress;
    const pos = this.cadLinePositions;

    anchors.forEach((a, idx) => {
      const i = idx * 6;
      // Fixed base mount point
      pos[i]     = a.from[0];
      pos[i + 1] = a.from[1];
      pos[i + 2] = a.from[2];

      // Dynamic exploded point moving along explosion vector
      pos[i + 3] = a.from[0] + a.toVec[0] * s;
      pos[i + 4] = a.from[1] + a.toVec[1] * s;
      pos[i + 5] = a.from[2] + a.toVec[2] * s;
    });

    this.cadLeaderLines.geometry.attributes.position.needsUpdate = true;
    this.cadLeaderLines.material.opacity = Math.min(0.85, s * 1.25);
  }

  /**
   * Constructs the Ultra-Detailed V8/V6 Mechanical Engine Bay under the hood
   * with complete SolidWorks CAD exhibition fidelity.
   */
  buildEngineComponents() {
    while (this.engineBayGroup.children.length > 0) {
      this.engineBayGroup.remove(this.engineBayGroup.children[0]);
    }
    this.firstAidPins = {};

    this.engineBayGroup.position.set(1.2, 0.0, 0);

    // 1. Engine Bay Structural Tub & Firewall
    const tubMat = new THREE.MeshStandardMaterial({ color: 0x111620, roughness: 0.85, side: THREE.BackSide });
    const tub = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.72, 1.58), tubMat);
    tub.position.set(0, 0.16, 0);
    this.engineBayGroup.add(tub);

    // 2. High-Strength Die-Cast Aluminum Engine Crankcase & Block
    const blockMat = new THREE.MeshStandardMaterial({ color: 0x2b3340, metalness: 0.92, roughness: 0.28 });
    const block = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.50, 0.74), blockMat);
    block.position.set(0, 0.12, 0);
    this.engineBayGroup.add(block);

    // Deep Oil Pan Sump
    const sumpMat = new THREE.MeshStandardMaterial({ color: 0x141820, metalness: 0.8, roughness: 0.35 });
    const sump = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.15, 0.55), sumpMat);
    sump.position.set(0, -0.16, 0);
    this.engineBayGroup.add(sump);

    // 3. Dual Angled Valve Covers (V-Configuration) with Embossed AMG Badging
    const valveCoverMat = new THREE.MeshStandardMaterial({ color: 0x18202c, metalness: 0.88, roughness: 0.18 });
    const leftValve = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.15, 0.28), valveCoverMat);
    leftValve.position.set(0, 0.40, 0.27);
    leftValve.rotation.x = 0.38;
    this.engineBayGroup.add(leftValve);

    const rightValve = leftValve.clone();
    rightValve.position.z = -0.27;
    rightValve.rotation.x = -0.38;
    this.engineBayGroup.add(rightValve);

    // Valve Cover Hex Bolts
    const boltMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });
    const boltGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.02, 6);
    for (let x = -0.38; x <= 0.38; x += 0.25) {
      const b1 = new THREE.Mesh(boltGeo, boltMat);
      b1.position.set(x, 0.48, 0.38);
      this.engineBayGroup.add(b1);

      const b2 = new THREE.Mesh(boltGeo, boltMat);
      b2.position.set(x, 0.48, -0.38);
      this.engineBayGroup.add(b2);
    }

    // 4. Polished Chrome Dual Intake Plenum Runners & Twin Throttle Bodies
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.98, roughness: 0.06 });
    const plenum = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.15, 0.34), chromeMat);
    plenum.position.set(0, 0.48, 0);
    this.engineBayGroup.add(plenum);

    // Twin Intake Runners (Curved Chrome Tubes)
    for (let x = -0.3; x <= 0.3; x += 0.2) {
      const runnerGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.24, 12);
      runnerGeo.rotateZ(Math.PI / 4);
      const runnerL = new THREE.Mesh(runnerGeo, chromeMat);
      runnerL.position.set(x, 0.44, 0.16);
      this.engineBayGroup.add(runnerL);

      const runnerR = runnerL.clone();
      runnerR.position.z = -0.16;
      runnerR.rotation.z = -Math.PI / 4;
      this.engineBayGroup.add(runnerR);
    }

    // 5. Twin Turbochargers & Stainless Exhaust Manifolds
    const turboMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const turboGeo = new THREE.TorusGeometry(0.08, 0.04, 12, 24, Math.PI * 1.5);
    const turboL = new THREE.Mesh(turboGeo, turboMat);
    turboL.position.set(-0.25, 0.22, 0.46);
    turboL.rotation.y = Math.PI / 2;
    this.engineBayGroup.add(turboL);

    const turboR = turboL.clone();
    turboR.position.z = -0.46;
    this.engineBayGroup.add(turboR);

    // 6. Front Serpentine Belt & Pulley System (Crank, Alternator, Water Pump)
    const pulleyMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.15 });
    const crankPulley = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 20), pulleyMat);
    crankPulley.rotation.z = Math.PI / 2;
    crankPulley.position.set(0.55, 0.05, 0);
    this.engineBayGroup.add(crankPulley);

    const altPulley = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16), pulleyMat);
    altPulley.rotation.z = Math.PI / 2;
    altPulley.position.set(0.55, 0.32, 0.25);
    this.engineBayGroup.add(altPulley);

    const pumpPulley = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.04, 16), pulleyMat);
    pumpPulley.rotation.z = Math.PI / 2;
    pumpPulley.position.set(0.55, 0.28, -0.22);
    this.engineBayGroup.add(pumpPulley);

    // Alternator Casing with Copper Wire
    const altBody = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.16, 16), pulleyMat);
    altBody.rotation.z = Math.PI / 2;
    altBody.position.set(0.44, 0.32, 0.25);
    this.engineBayGroup.add(altBody);

    // 7. Polished Strut Tower Brace Bar across Engine Bay
    const braceGeo = new THREE.CylinderGeometry(0.024, 0.024, 1.54, 16);
    braceGeo.rotateX(Math.PI / 2);
    const brace = new THREE.Mesh(braceGeo, chromeMat);
    brace.position.set(-0.14, 0.54, 0);
    this.engineBayGroup.add(brace);

    // 8. Aluminum Radiator Core & Electric Cooling Fan Shroud
    const radCoreMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.4 });
    const radCore = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 1.25), radCoreMat);
    radCore.position.set(0.72, 0.20, 0);
    this.engineBayGroup.add(radCore);

    const fanShroudMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    const fan1 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 24), fanShroudMat);
    fan1.rotation.z = Math.PI / 2;
    fan1.position.set(0.64, 0.20, 0.28);
    this.engineBayGroup.add(fan1);

    const fan2 = fan1.clone();
    fan2.position.z = -0.28;
    this.engineBayGroup.add(fan2);

    // 9. FIRST-AID 3D COMPONENT: 12V AGM Starter Battery & Terminals
    const batteryGroup = new THREE.Group();
    const batteryBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.30, 0.40),
      new THREE.MeshStandardMaterial({ color: 0x0f141c, roughness: 0.65 })
    );
    batteryGroup.add(batteryBox);

    const posTerminal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 0.07, 16),
      new THREE.MeshBasicMaterial({ color: 0xdc2626 })
    );
    posTerminal.position.set(0.08, 0.17, 0.12);
    batteryGroup.add(posTerminal);

    const negTerminal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 0.07, 16),
      new THREE.MeshBasicMaterial({ color: 0x1e293b })
    );
    negTerminal.position.set(0.08, 0.17, -0.12);
    batteryGroup.add(negTerminal);

    batteryGroup.position.set(-0.08, 0.35, 0.55);
    this.engineBayGroup.add(batteryGroup);
    this.addFirstAidPin('battery', '12V Battery & Terminals', [-0.08, 0.58, 0.55], '#dc2626');

    // 10. FIRST-AID 3D COMPONENT: Radiator Cap & Coolant Tank
    const coolantGroup = new THREE.Group();
    const coolantTank = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.30, 0.26),
      new THREE.MeshPhysicalMaterial({ color: 0xa7f3d0, transmission: 0.75, roughness: 0.18, transparent: true })
    );
    coolantGroup.add(coolantTank);

    const radCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.045, 16),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.88, roughness: 0.12 })
    );
    radCap.position.set(0, 0.17, 0);
    coolantGroup.add(radCap);

    coolantGroup.position.set(0.60, 0.32, 0.46);
    this.engineBayGroup.add(coolantGroup);
    this.addFirstAidPin('coolant', 'Radiator Coolant Tank & Cap', [0.60, 0.55, 0.46], '#f59e0b');

    // 11. FIRST-AID 3D COMPONENT: Engine Oil Dipstick Loop
    const dipstickGroup = new THREE.Group();
    const oilDipstick = new THREE.Mesh(
      new THREE.TorusGeometry(0.045, 0.015, 12, 24),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    dipstickGroup.add(oilDipstick);

    const dipstickTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.45, 12),
      chromeMat
    );
    dipstickTube.position.y = -0.25;
    dipstickGroup.add(dipstickTube);

    dipstickGroup.position.set(0.14, 0.55, 0.04);
    this.engineBayGroup.add(dipstickGroup);
    this.addFirstAidPin('oil_dipstick', 'Engine Oil Dipstick & Level Check', [0.14, 0.65, 0.04], '#fbbf24');

    // 12. FIRST-AID 3D COMPONENT: Brake Fluid Master Cylinder Reservoir
    const brakeFluidTank = new THREE.Mesh(
      new THREE.BoxGeometry(0.20, 0.24, 0.22),
      new THREE.MeshPhysicalMaterial({ color: 0xfef08a, transmission: 0.78, roughness: 0.18, transparent: true })
    );
    brakeFluidTank.position.set(-0.40, 0.45, -0.48);
    this.engineBayGroup.add(brakeFluidTank);

    const brakeCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3 })
    );
    brakeCap.position.set(-0.40, 0.58, -0.48);
    this.engineBayGroup.add(brakeCap);

    this.addFirstAidPin('brake_fluid', 'Brake Master Cylinder Reservoir', [-0.40, 0.65, -0.48], '#3b82f6');
  }

  /**
   * Constructs the Sculpted 3D Bonnet (Hood) with aerodynamic crease lines & hinge pivot
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
   * Sets Disassembly Progress (0.0 = Assembled, 1.0 = Fully Exploded CAD Scatter)
   */
  setDisassemblyProgress(progress) {
    this.targetDisassemblyProgress = Math.max(0, Math.min(1.0, progress));
    this.isExploded = this.targetDisassemblyProgress > 0.05;

    if (this.isExploded) {
      this.isAutoCameraTargetActive = true;
      this.currentCameraTarget = this.cameraTargets.exploded;
    } else if (!this.isBonnetOpen) {
      this.isAutoCameraTargetActive = true;
      this.currentCameraTarget = this.cameraTargets.exterior;
    }
    return this.isExploded;
  }

  /**
   * Toggles CAD Exploded View Mode
   */
  toggleExplodedCAD() {
    if (this.targetDisassemblyProgress > 0.05) {
      this.setDisassemblyProgress(0.0);
    } else {
      this.setDisassemblyProgress(1.0);
    }
    return this.isExploded;
  }

  /**
   * Toggles the physical 3D Bonnet open or closed
   */
  toggleBonnet() {
    this.isBonnetOpen = !this.isBonnetOpen;
    this.isAutoCameraTargetActive = true;

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
    this.isAutoCameraTargetActive = true;

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
    } else if (viewName === 'exploded') {
      this.setDisassemblyProgress(1.0);
    } else {
      this.openBonnet(false);
      this.setDisassemblyProgress(0.0);
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

    if (!this.isBonnetOpen && !this.isExploded) {
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
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // 1. Smoothly interpolate CAD Disassembly Progress
    if (Math.abs(this.targetDisassemblyProgress - this.disassemblyProgress) > 0.001) {
      this.disassemblyProgress += (this.targetDisassemblyProgress - this.disassemblyProgress) * 0.085;
      
      // Update positions of all mapped exploded sub-parts
      const s = this.disassemblyProgress;
      this.explodedParts.forEach(part => {
        part.object.position.copy(part.restPos).addScaledVector(part.explodeVec, s);
        if (part.deltaRotZ) {
          part.object.rotation.z = part.restRot.z + part.deltaRotZ * s;
        }
      });

      // Update 3D Bonnet elevation during explosion
      this.bonnetGroup.position.set(
        0.35 + 0.45 * s,
        0.64 + 2.0 * s,
        0
      );

      // Update CAD Leader line vectors & opacity
      this.updateCadLeaderLineVertices();
    }

    // 2. Camera & OrbitControls Navigation
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

    // 3. 3D Physical Bonnet Upward Swing (~60 degrees)
    const targetBonnetAngle = this.isBonnetOpen ? -Math.PI / 3.0 : 0;
    this.bonnetGroup.rotation.z += (targetBonnetAngle - this.bonnetGroup.rotation.z) * 0.08;

    // 4. Auto-rotation
    if (this.autoRotate) {
      this.carGroup.rotation.y += 0.008;
    }

    // 5. Pulsing holographic first-aid pins
    const time = performance.now() * 0.004;
    Object.keys(this.firstAidPins).forEach((key, i) => {
      const pin = this.firstAidPins[key];
      const scale = 1.0 + Math.sin(time + i * 1.5) * 0.25;
      pin.scale.set(scale, scale, scale);
    });

    this.renderer.render(this.scene, this.camera);
  }
}
