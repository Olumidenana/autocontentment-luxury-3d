import * as THREE from 'three';

export class Scene3D {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    
    this.carGroup = new THREE.Group();
    this.dustSheet = null;
    this.wheels = [];
    this.engineGroup = null;
    this.diagnosticNodes = [];
    
    this.targetMouse = { x: 0, y: 0 };
    this.mouse = { x: 0, y: 0 };
    this.scrollProgress = 0;
    this.currentPaintColor = 0x0C813D; // AutoContentment Emerald Green
    this.bodyMaterials = [];
    
    this.init();
  }

  init() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Initial camera position (Cinematic 3/4 front view)
    this.camera.position.set(4.2, 1.6, 5.0);
    this.camera.lookAt(0, 0.4, 0);

    this.setupLighting();
    this.buildStudioFloor();
    this.buildCar();
    this.buildDustSheet();
    this.setupEvents();
    this.animate();
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    // Overhead Key Softbox
    const overheadKey = new THREE.RectAreaLight ? null : null; // fallback to directional
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0001;
    this.scene.add(keyLight);

    // Rim Backlight (accentuates curves and roofline)
    const rimLight = new THREE.DirectionalLight(0x40e0d0, 1.8);
    rimLight.position.set(-6, 4, -5);
    this.scene.add(rimLight);

    // Warm Gold Atelier Accent
    const goldAccent = new THREE.PointLight(0xffa500, 1.2, 15);
    goldAccent.position.set(0, 2.5, -3.5);
    this.scene.add(goldAccent);

    // Ground Bounce Light
    const groundBounce = new THREE.DirectionalLight(0x0C813D, 0.8);
    groundBounce.position.set(0, -4, 2);
    this.scene.add(groundBounce);
  }

  buildStudioFloor() {
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x080c10,
      roughness: 0.35,
      metalness: 0.6,
      envMapIntensity: 0.5
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.52;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Radial shadow contact patch
    const shadowGeo = new THREE.PlaneGeometry(4.8, 2.4);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.75
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, -0.51, 0);
    this.scene.add(shadow);
  }

  buildCar() {
    // Premium Metallic Clearcoat Car Paint
    const paintMaterial = new THREE.MeshPhysicalMaterial({
      color: this.currentPaintColor,
      metalness: 0.88,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      reflectivity: 0.95
    });
    this.bodyMaterials.push(paintMaterial);

    const carbonMaterial = new THREE.MeshStandardMaterial({
      color: 0x111315,
      roughness: 0.45,
      metalness: 0.8
    });

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0a1018,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.85,
      ior: 1.52,
      transparent: true,
      opacity: 0.88
    });

    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xe8eef5,
      metalness: 0.98,
      roughness: 0.08
    });

    // 1. Lower Chassis & Sculpted Sills
    const chassisGeo = new THREE.BoxGeometry(4.2, 0.45, 1.88);
    const chassis = new THREE.Mesh(chassisGeo, carbonMaterial);
    chassis.position.set(0, -0.15, 0);
    chassis.castShadow = true;
    this.carGroup.add(chassis);

    // 2. Sculpted Grand Tourer Main Body (Curved Aerodynamic Hood & Waistline)
    const bodyGeo = new THREE.CylinderGeometry(0.92, 0.98, 4.1, 16, 4);
    bodyGeo.rotateZ(Math.PI / 2);
    bodyGeo.scale(1, 0.52, 0.98);
    const body = new THREE.Mesh(bodyGeo, paintMaterial);
    body.position.set(0, 0.05, 0);
    body.castShadow = true;
    this.carGroup.add(body);

    // 3. Fastback Cockpit & Roof Canopy
    const cabinGeo = new THREE.CylinderGeometry(0.72, 0.86, 2.1, 16);
    cabinGeo.rotateZ(Math.PI / 2);
    cabinGeo.scale(1, 0.58, 0.85);
    const cabin = new THREE.Mesh(cabinGeo, glassMaterial);
    cabin.position.set(-0.25, 0.52, 0);
    cabin.castShadow = true;
    this.carGroup.add(cabin);

    // 4. Sloping Hood Panel (Cutaway capable for Engine Reveal)
    const hoodGeo = new THREE.BoxGeometry(1.5, 0.08, 1.4);
    this.hoodMesh = new THREE.Mesh(hoodGeo, paintMaterial.clone());
    this.hoodMesh.position.set(1.15, 0.28, 0);
    this.hoodMesh.rotation.z = -0.06;
    this.carGroup.add(this.hoodMesh);

    // 5. Front Aerodynamic Splitter & Grille
    const grilleGeo = new THREE.BoxGeometry(0.2, 0.32, 1.4);
    const grille = new THREE.Mesh(grilleGeo, carbonMaterial);
    grille.position.set(2.05, -0.12, 0);
    this.carGroup.add(grille);

    // AutoContentment Emblem on Grille
    const emblemGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16);
    emblemGeo.rotateZ(Math.PI / 2);
    const emblemMat = new THREE.MeshStandardMaterial({ color: 0x0C813D, metalness: 0.9, roughness: 0.1 });
    const emblem = new THREE.Mesh(emblemGeo, emblemMat);
    emblem.position.set(2.15, -0.06, 0);
    this.carGroup.add(emblem);

    // 6. LED Headlight Clusters with Volumetric Glow
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xc8f0ff });
    const leftLight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.35), headlightMat);
    leftLight.position.set(1.95, 0.18, 0.62);
    leftLight.rotation.y = -0.2;
    this.carGroup.add(leftLight);

    const rightLight = leftLight.clone();
    rightLight.position.z = -0.62;
    rightLight.rotation.y = 0.2;
    this.carGroup.add(rightLight);

    // 7. Full-Width Rear Neon Tail Bar
    const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xff1520 });
    const tailBar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 1.7), tailLightMat);
    tailBar.position.set(-2.08, 0.22, 0);
    this.carGroup.add(tailBar);

    // 8. Quad Titanium Exhaust Pipes
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.95, roughness: 0.15 });
    [-0.6, -0.45, 0.45, 0.6].forEach(zPos => {
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.25, 12), exhaustMat);
      tip.rotateZ(Math.PI / 2);
      tip.position.set(-2.12, -0.26, zPos);
      this.carGroup.add(tip);
    });

    // 9. Wheels & Brembo Brakes (4 corners)
    const wheelPositions = [
      { x: 1.35, z: 0.98, steer: true },
      { x: 1.35, z: -0.98, steer: true },
      { x: -1.35, z: 0.98, steer: false },
      { x: -1.35, z: -0.98, steer: false }
    ];

    wheelPositions.forEach(pos => {
      const wheelAssembly = this.createWheelAssembly(pos.steer);
      wheelAssembly.position.set(pos.x, -0.22, pos.z);
      this.carGroup.add(wheelAssembly);
      this.wheels.push(wheelAssembly);
    });

    // 10. Glowing Powertrain / V8 Engine Under the Hood
    this.buildEngine();

    // 11. Interactive Diagnostic Pulse Nodes
    this.buildDiagnosticNodes();

    this.carGroup.position.set(0, 0, 0);
    this.scene.add(this.carGroup);
  }

  createWheelAssembly(isFront) {
    const group = new THREE.Group();

    // Tire (Rubber)
    const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 24);
    tireGeo.rotateX(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x151618, roughness: 0.85, metalness: 0.1 });
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = true;
    group.add(tire);

    // Spoked Alloy Rim
    const rimGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.28, 16);
    rimGeo.rotateX(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd6dde5, metalness: 0.95, roughness: 0.12 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    group.add(rim);

    // Cross-Drilled Brake Rotor
    const rotorGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16);
    rotorGeo.rotateX(Math.PI / 2);
    const rotorMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.9, roughness: 0.3 });
    const rotor = new THREE.Mesh(rotorGeo, rotorMat);
    group.add(rotor);

    // AutoContentment Emerald Brake Caliper
    const caliperGeo = new THREE.BoxGeometry(0.08, 0.16, 0.12);
    const caliperMat = new THREE.MeshStandardMaterial({ color: 0x0C813D, metalness: 0.85, roughness: 0.2 });
    const caliper = new THREE.Mesh(caliperGeo, caliperMat);
    caliper.position.set(0.12, 0.1, 0);
    group.add(caliper);

    return group;
  }

  buildEngine() {
    this.engineGroup = new THREE.Group();

    // Engine Block
    const blockGeo = new THREE.BoxGeometry(0.85, 0.45, 0.65);
    const blockMat = new THREE.MeshStandardMaterial({ color: 0x242830, metalness: 0.9, roughness: 0.3 });
    const block = new THREE.Mesh(blockGeo, blockMat);
    this.engineGroup.add(block);

    // Red Valve Covers (V8 Configuration)
    const coverGeo = new THREE.BoxGeometry(0.75, 0.12, 0.24);
    const coverMat = new THREE.MeshStandardMaterial({ color: 0x990011, metalness: 0.7, roughness: 0.25 });
    const leftCover = new THREE.Mesh(coverGeo, coverMat);
    leftCover.position.set(0, 0.26, 0.22);
    leftCover.rotation.x = 0.25;
    this.engineGroup.add(leftCover);

    const rightCover = leftCover.clone();
    rightCover.position.z = -0.22;
    rightCover.rotation.x = -0.25;
    this.engineGroup.add(rightCover);

    // Twin Turbochargers
    const turboGeo = new THREE.TorusGeometry(0.12, 0.045, 12, 24);
    const turboMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.95, roughness: 0.15 });
    const leftTurbo = new THREE.Mesh(turboGeo, turboMat);
    leftTurbo.position.set(0.38, 0.1, 0.36);
    this.engineGroup.add(leftTurbo);

    const rightTurbo = leftTurbo.clone();
    rightTurbo.position.z = -0.36;
    this.engineGroup.add(rightTurbo);

    this.engineGroup.position.set(1.15, 0.02, 0);
    this.engineGroup.visible = true;
    this.carGroup.add(this.engineGroup);
  }

  buildDiagnosticNodes() {
    const nodes = [
      { id: 'engine', name: 'Twin-Turbo V8 Powertrain', pos: [1.15, 0.25, 0], color: 0x00ff88 },
      { id: 'transmission', name: '8-Speed Dual-Clutch & Solenoids', pos: [0.1, -0.05, 0], color: 0x00ccff },
      { id: 'suspension', name: 'Adaptive Double-Wishbone Struts', pos: [1.35, -0.05, 0.85], color: 0xffaa00 },
      { id: 'exhaust', name: 'Quad Titanium Active Exhaust', pos: [-2.0, -0.15, 0], color: 0xff3366 }
    ];

    nodes.forEach(data => {
      const ringGeo = new THREE.RingGeometry(0.08, 0.11, 24);
      ringGeo.rotateX(Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: data.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(...data.pos);
      ring.userData = data;

      const innerDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      innerDot.position.set(...data.pos);
      ring.add(innerDot);

      this.carGroup.add(ring);
      this.diagnosticNodes.push(ring);
    });
  }

  buildDustSheet() {
    // The dramatic Valmora satin sheet that billows and reveals the car on scroll
    const sheetGeo = new THREE.PlaneGeometry(5.2, 3.4, 32, 24);
    sheetGeo.rotateX(-Math.PI / 2);
    
    // Add initial draped curvature over the car chassis
    const pos = sheetGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      // Bell curve over cabin and hood
      const distFromCenter = Math.sqrt((x * 0.5) ** 2 + z ** 2);
      const elevation = Math.max(0, 0.95 - distFromCenter * 0.45);
      pos.setY(i, elevation);
    }
    sheetGeo.computeVertexNormals();

    const sheetMat = new THREE.MeshStandardMaterial({
      color: 0x1a212d, // Dark luxury satin drape
      roughness: 0.35,
      metalness: 0.4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.96
    });

    this.dustSheet = new THREE.Mesh(sheetGeo, sheetMat);
    this.dustSheet.position.set(0, 0.05, 0);
    this.scene.add(this.dustSheet);
  }

  setCarPaint(hexColor) {
    this.currentPaintColor = hexColor;
    this.bodyMaterials.forEach(mat => {
      mat.color.setHex(hexColor);
    });
    if (this.hoodMesh) {
      this.hoodMesh.material.color.setHex(hexColor);
    }
  }

  updateScroll(progress) {
    this.scrollProgress = progress;

    // 1. Dust Sheet Unveiling Stage (0% to 18% scroll)
    if (this.dustSheet) {
      if (progress < 0.22) {
        this.dustSheet.visible = true;
        const liftFactor = Math.min(1, progress / 0.18);
        this.dustSheet.position.y = 0.05 + liftFactor * 4.5;
        this.dustSheet.position.x = -liftFactor * 2.8;
        this.dustSheet.material.opacity = Math.max(0, 0.96 - liftFactor * 1.1);
        this.dustSheet.rotation.z = liftFactor * 0.3;
      } else {
        this.dustSheet.visible = false;
      }
    }

    // 2. Hood Cutaway Transparency for Engine Showcase (25% to 55% scroll)
    if (this.hoodMesh) {
      if (progress > 0.25 && progress < 0.55) {
        const t = (progress - 0.25) / 0.3;
        this.hoodMesh.material.transparent = true;
        this.hoodMesh.material.opacity = Math.max(0.15, 1.0 - Math.sin(t * Math.PI) * 0.85);
      } else {
        this.hoodMesh.material.transparent = false;
        this.hoodMesh.material.opacity = 1.0;
      }
    }

    // 3. Camera Choreography across the scroll sections
    if (progress <= 0.25) {
      // Stage 1: Front 3/4 Dramatic Orbit
      const t = progress / 0.25;
      this.camera.position.x = THREE.MathUtils.lerp(4.2, 3.2, t);
      this.camera.position.y = THREE.MathUtils.lerp(1.6, 1.2, t);
      this.camera.position.z = THREE.MathUtils.lerp(5.0, 3.6, t);
      this.carGroup.rotation.y = THREE.MathUtils.lerp(-0.25, 0.45, t);
    } else if (progress <= 0.55) {
      // Stage 2: Zoom into Engine & Front Powertrain
      const t = (progress - 0.25) / 0.3;
      this.camera.position.x = THREE.MathUtils.lerp(3.2, 2.2, t);
      this.camera.position.y = THREE.MathUtils.lerp(1.2, 1.4, t);
      this.camera.position.z = THREE.MathUtils.lerp(3.6, 1.8, t);
      this.carGroup.rotation.y = THREE.MathUtils.lerp(0.45, 1.15, t);
    } else if (progress <= 0.8) {
      // Stage 3: Orbit to Double-Wishbone & Brembo Caliper
      const t = (progress - 0.55) / 0.25;
      this.camera.position.x = THREE.MathUtils.lerp(2.2, 1.5, t);
      this.camera.position.y = THREE.MathUtils.lerp(1.4, 0.55, t);
      this.camera.position.z = THREE.MathUtils.lerp(1.8, 2.6, t);
      this.carGroup.rotation.y = THREE.MathUtils.lerp(1.15, 2.3, t);
    } else {
      // Stage 4: Rear Diffuser, Active Titanium Exhaust & Cockpit
      const t = (progress - 0.8) / 0.2;
      this.camera.position.x = THREE.MathUtils.lerp(1.5, -3.8, t);
      this.camera.position.y = THREE.MathUtils.lerp(0.55, 1.3, t);
      this.camera.position.z = THREE.MathUtils.lerp(2.6, 3.2, t);
      this.carGroup.rotation.y = THREE.MathUtils.lerp(2.3, 3.14, t);
    }

    this.camera.lookAt(0, 0.2, 0);
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

    // Touch support for mobile devices
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this.targetMouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
        this.targetMouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
      }
    }, { passive: true });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Spring damping for cursor tracking (matching the dog/monkey cursor responsiveness)
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05;
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05;

    // Subtle cursor parallax on vehicle & camera
    this.carGroup.rotation.z = this.mouse.x * 0.035;
    this.carGroup.rotation.x = -this.mouse.y * 0.025;

    // Spin wheels slightly when scrolling or animating
    const wheelSpin = this.scrollProgress * 25;
    this.wheels.forEach(w => {
      w.rotation.z = wheelSpin;
    });

    // Pulse diagnostic nodes
    const time = performance.now() * 0.003;
    this.diagnosticNodes.forEach((node, i) => {
      const scale = 1.0 + Math.sin(time + i * 1.5) * 0.18;
      node.scale.set(scale, scale, scale);
    });

    this.renderer.render(this.scene, this.camera);
  }
}
