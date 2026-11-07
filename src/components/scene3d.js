import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export class Scene3D {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    
    this.carModel = null;
    this.carGroup = new THREE.Group();
    this.bonnetMesh = null;
    this.engineBayGroup = new THREE.Group();
    this.wheels = [];
    this.bodyMaterials = [];
    this.firstAidPins = {};
    this.dustSheet = null;
    this.isBonnetOpen = false;
    this.autoRotate = false;
    this.activePin = null;

    // Camera targets for smooth cinematic fly-through
    this.cameraTargets = {
      exterior:    { pos: new THREE.Vector3(4.8, 1.8, 4.8), lookAt: new THREE.Vector3(0, 0.35, 0) },
      bonnet_open: { pos: new THREE.Vector3(1.8, 1.9, 0.9), lookAt: new THREE.Vector3(0.9, 0.45, 0) },
      battery:     { pos: new THREE.Vector3(1.4, 1.5, 0.75), lookAt: new THREE.Vector3(0.95, 0.52, 0.42) },
      coolant:     { pos: new THREE.Vector3(1.8, 1.3, 0.45), lookAt: new THREE.Vector3(1.35, 0.46, 0.32) },
      oil_dipstick:{ pos: new THREE.Vector3(1.5, 1.5, 0.15), lookAt: new THREE.Vector3(1.05, 0.52, 0.0) },
      brake_fluid: { pos: new THREE.Vector3(1.2, 1.5, -0.6), lookAt: new THREE.Vector3(0.75, 0.55, -0.38) },
      wheel:       { pos: new THREE.Vector3(1.6, 0.35, 1.6), lookAt: new THREE.Vector3(1.25, -0.15, 0.9) },
      xray:        { pos: new THREE.Vector3(4.0, 2.2, 4.0), lookAt: new THREE.Vector3(0, 0.35, 0) }
    };

    this.currentCameraTarget = this.cameraTargets.exterior;
    this.currentLookAt = new THREE.Vector3(0, 0.35, 0);
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
    this.loadRealCarModel();
    this.buildDetailedEngineBay();
    this.buildDustSheet();
    this.setupEvents();
    this.animate();
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambient);

    // Studio Key Overhead Light
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(6, 10, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0001;
    this.scene.add(keyLight);

    // Rim Lighting
    const rimLight = new THREE.DirectionalLight(0x0C813D, 2.4);
    rimLight.position.set(-6, 5, -6);
    this.scene.add(rimLight);

    // Front Grille Fill
    const frontFill = new THREE.DirectionalLight(0xffeedd, 1.5);
    frontFill.position.set(7, 1.5, 0);
    this.scene.add(frontFill);

    // Engine Bay Dedicated Inspection Spotlight
    this.engineSpotlight = new THREE.SpotLight(0xffffff, 0, 10, Math.PI / 4, 0.3);
    this.engineSpotlight.position.set(1.4, 4.0, 0);
    this.engineSpotlight.target.position.set(1.0, 0.4, 0);
    this.scene.add(this.engineSpotlight);
    this.scene.add(this.engineSpotlight.target);
  }

  buildStudioShowroom() {
    // Reflective Showroom Floor
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

  loadRealCarModel() {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/gltf/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      '/models/ferrari.glb',
      (gltf) => {
        this.carModel = gltf.scene;
        
        // Scale and orient the real car model
        this.carModel.scale.set(1.0, 1.0, 1.0);
        this.carModel.position.set(0, -0.5, 0);

        this.carModel.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            // Apply custom PBR clearcoat paint to the body
            if (child.name.includes('body') || child.material?.name === 'Body_Color') {
              const bodyPaint = new THREE.MeshPhysicalMaterial({
                color: this.currentPaintColor,
                metalness: 0.88,
                roughness: 0.14,
                clearcoat: 1.0,
                clearcoatRoughness: 0.05,
                reflectivity: 0.98
              });
              child.material = bodyPaint;
              this.bodyMaterials.push(bodyPaint);
              this.bonnetMesh = child;
            }

            // Real glass material
            if (child.name.includes('glass') || child.material?.name === 'Glass_Gray') {
              child.material = new THREE.MeshPhysicalMaterial({
                color: 0x0a1018,
                metalness: 0.1,
                roughness: 0.04,
                transmission: 0.9,
                ior: 1.52,
                transparent: true,
                opacity: 0.88
              });
            }

            // Wheels & Calipers
            if (child.name.includes('wheel')) {
              this.wheels.push(child);
            }
            if (child.name.includes('brakes') || child.material?.name === 'brakes') {
              child.material = new THREE.MeshStandardMaterial({
                color: 0x0C813D, // AutoContentment Emerald Caliper
                metalness: 0.85,
                roughness: 0.2
              });
            }
          }
        });

        this.carGroup.add(this.carModel);
        this.scene.add(this.carGroup);
        console.log("Real 3D Car Model Loaded Successfully!");
      },
      undefined,
      (error) => {
        console.error("Error loading real car GLB:", error);
      }
    );
  }

  buildDetailedEngineBay() {
    this.engineBayGroup.position.set(0.9, 0.05, 0);

    // 1. Engine Bay Inner Tub
    const tub = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.55, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x161a20, roughness: 0.75, side: THREE.BackSide })
    );
    tub.position.set(0, 0.1, 0);
    this.engineBayGroup.add(tub);

    // 2. Cast Aluminium Engine Block
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 0.48, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x2b313a, metalness: 0.92, roughness: 0.32 })
    );
    block.position.set(0, 0.12, 0);
    this.engineBayGroup.add(block);

    // 3. High-Flow Chrome Intake Plenum Runners
    const intake = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 0.15, 0.34),
      new THREE.MeshStandardMaterial({ color: 0xe6edf5, metalness: 0.98, roughness: 0.08 })
    );
    intake.position.set(0, 0.42, 0);
    this.engineBayGroup.add(intake);

    // 4. Red Valve Covers
    const coverGeo = new THREE.BoxGeometry(0.8, 0.14, 0.24);
    const coverMat = new THREE.MeshStandardMaterial({ color: 0x990014, metalness: 0.75, roughness: 0.25 });
    
    const leftCover = new THREE.Mesh(coverGeo, coverMat);
    leftCover.position.set(0, 0.36, 0.26);
    leftCover.rotation.x = 0.32;
    this.engineBayGroup.add(leftCover);

    const rightCover = leftCover.clone();
    rightCover.position.z = -0.26;
    rightCover.rotation.x = -0.32;
    this.engineBayGroup.add(rightCover);

    // 5. FIRST-AID COMPONENT: 12V Battery with Terminal Clamps
    const batteryGroup = new THREE.Group();
    const batteryBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.24, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x111316, roughness: 0.6 })
    );
    batteryGroup.add(batteryBox);

    // Positive (+) Red Terminal
    const posTerminal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.05, 12),
      new THREE.MeshBasicMaterial({ color: 0xff2233 })
    );
    posTerminal.position.set(0.06, 0.13, 0.09);
    batteryGroup.add(posTerminal);

    // Negative (-) Black Terminal
    const negTerminal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.05, 12),
      new THREE.MeshBasicMaterial({ color: 0x222222 })
    );
    negTerminal.position.set(0.06, 0.13, -0.09);
    batteryGroup.add(negTerminal);

    batteryGroup.position.set(-0.05, 0.32, 0.48);
    this.engineBayGroup.add(batteryGroup);
    this.addFirstAidPin('battery', '12V Car Battery & Terminals', [-0.05, 0.52, 0.48], '#ff2233');

    // 6. FIRST-AID COMPONENT: Radiator Cap & Coolant Expansion Tank
    const coolantGroup = new THREE.Group();
    const coolantTank = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.24, 0.2),
      new THREE.MeshPhysicalMaterial({ color: 0x99ddaa, transmission: 0.7, roughness: 0.2, transparent: true })
    );
    coolantGroup.add(coolantTank);

    // Yellow Radiator Cap (DO NOT OPEN WHEN HOT)
    const radCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.03, 16),
      new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.8, roughness: 0.2 })
    );
    radCap.position.set(0, 0.13, 0);
    coolantGroup.add(radCap);

    coolantGroup.position.set(0.5, 0.26, 0.38);
    this.engineBayGroup.add(coolantGroup);
    this.addFirstAidPin('coolant', 'Radiator Coolant Tank & Cap', [0.5, 0.48, 0.38], '#ffcc00');

    // 7. FIRST-AID COMPONENT: Engine Oil Dipstick & Filler Cap
    const oilDipstick = new THREE.Mesh(
      new THREE.TorusGeometry(0.035, 0.012, 8, 16),
      new THREE.MeshBasicMaterial({ color: 0xffa500 }) // Yellow Pull Ring
    );
    oilDipstick.position.set(0.12, 0.46, 0.02);
    this.engineBayGroup.add(oilDipstick);
    this.addFirstAidPin('oil_dipstick', 'Engine Oil Dipstick & Level Check', [0.12, 0.56, 0.02], '#ffa500');

    // 8. FIRST-AID COMPONENT: Brake Fluid Reservoir
    const brakeFluidTank = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.18, 0.16),
      new THREE.MeshPhysicalMaterial({ color: 0xffeeaa, transmission: 0.75, roughness: 0.2, transparent: true })
    );
    brakeFluidTank.position.set(-0.32, 0.4, -0.42);
    this.engineBayGroup.add(brakeFluidTank);
    this.addFirstAidPin('brake_fluid', 'Brake Fluid Reservoir', [-0.32, 0.54, -0.42], '#00ccff');

    this.carGroup.add(this.engineBayGroup);
  }

  addFirstAidPin(id, name, localPos, hexColor) {
    const pinGroup = new THREE.Group();

    // Beacon Ring
    const ringGeo = new THREE.RingGeometry(0.05, 0.08, 20);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: hexColor, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    pinGroup.add(ring);

    // Glowing Sphere
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    pinGroup.add(sphere);

    // Vertical Stem
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
    // Fade the car bonnet/body so the engine bay is completely visible inside!
    if (this.bonnetMesh) {
      this.bonnetMesh.material.transparent = open;
      this.bonnetMesh.material.opacity = open ? 0.18 : 1.0;
    }
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
            THREE.MathUtils.lerp(4.8, 3.2, t),
            THREE.MathUtils.lerp(1.8, 1.4, t),
            THREE.MathUtils.lerp(4.8, 3.6, t)
          ),
          lookAt: new THREE.Vector3(0, 0.35, 0)
        };
        this.openBonnet(false);
      } else if (progress <= 0.55) {
        const t = (progress - 0.25) / 0.3;
        this.currentCameraTarget = {
          pos: new THREE.Vector3(
            THREE.MathUtils.lerp(3.2, 1.8, t),
            THREE.MathUtils.lerp(1.4, 1.9, t),
            THREE.MathUtils.lerp(3.6, 0.9, t)
          ),
          lookAt: new THREE.Vector3(0.9, 0.45, 0)
        };
        this.openBonnet(t > 0.15);
      } else if (progress <= 0.8) {
        const t = (progress - 0.55) / 0.25;
        this.currentCameraTarget = {
          pos: new THREE.Vector3(
            THREE.MathUtils.lerp(1.8, 1.6, t),
            THREE.MathUtils.lerp(1.9, 0.35, t),
            THREE.MathUtils.lerp(0.9, 1.6, t)
          ),
          lookAt: new THREE.Vector3(1.25, -0.15, 0.9)
        };
        this.openBonnet(false);
      } else {
        const t = (progress - 0.8) / 0.2;
        this.currentCameraTarget = {
          pos: new THREE.Vector3(
            THREE.MathUtils.lerp(1.6, -4.2, t),
            THREE.MathUtils.lerp(0.35, 1.4, t),
            THREE.MathUtils.lerp(1.6, 3.0, t)
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

    // 1. Smooth Camera Fly-Through
    if (this.currentCameraTarget) {
      this.camera.position.lerp(this.currentCameraTarget.pos, 0.055);
      this.currentLookAt.lerp(this.currentCameraTarget.lookAt, 0.055);
      this.camera.lookAt(this.currentLookAt);
    }

    // 2. Continuous Showroom Rotation if active
    if (this.autoRotate) {
      this.carGroup.rotation.y += 0.008;
    }

    // 3. Pulse First Aid Beacon Pins
    const time = performance.now() * 0.004;
    Object.keys(this.firstAidPins).forEach((key, i) => {
      const pin = this.firstAidPins[key];
      const scale = 1.0 + Math.sin(time + i * 1.5) * 0.25;
      pin.scale.set(scale, scale, scale);
    });

    this.renderer.render(this.scene, this.camera);
  }
}
