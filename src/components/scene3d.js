import * as THREE from 'three';

export class Scene3D {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    
    this.carGroup = new THREE.Group();
    this.wheels = [];
    this.hoodGroup = new THREE.Group();
    this.engineGroup = new THREE.Group();
    this.diagnosticNodes = [];
    this.dustSheet = null;
    this.isHoodOpen = false;
    this.autoRotate = false;
    this.currentView = 'exterior';
    
    this.targetMouse = { x: 0, y: 0 };
    this.mouse = { x: 0, y: 0 };
    this.currentPaintColor = 0x0C813D; // AutoContentment Emerald
    this.bodyMaterials = [];
    
    // Target camera positions for smooth view transitions
    this.cameraTargets = {
      exterior: { pos: new THREE.Vector3(4.8, 1.6, 4.8), lookAt: new THREE.Vector3(0, 0.3, 0) },
      engine:   { pos: new THREE.Vector3(2.1, 1.7, 0.9), lookAt: new THREE.Vector3(1.1, 0.3, 0) },
      wheel:    { pos: new THREE.Vector3(1.8, 0.3, 1.8), lookAt: new THREE.Vector3(1.3, -0.1, 0.9) },
      rear:     { pos: new THREE.Vector3(-4.4, 1.4, 3.2), lookAt: new THREE.Vector3(0, 0.2, 0) },
      xray:     { pos: new THREE.Vector3(3.8, 2.2, 4.0), lookAt: new THREE.Vector3(0, 0.2, 0) }
    };
    this.currentLookAt = new THREE.Vector3(0, 0.3, 0);

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

    // Initial camera position
    const ext = this.cameraTargets.exterior;
    this.camera.position.copy(ext.pos);
    this.camera.lookAt(ext.lookAt);

    this.setupLighting();
    this.buildStudioFloor();
    this.buildRealisticCar();
    this.buildDetailedEngine();
    this.buildDustSheet();
    this.setupEvents();
    this.animate();
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);

    // Overhead Key Softbox
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
    keyLight.position.set(6, 9, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0001;
    this.scene.add(keyLight);

    // Rim Backlight (accentuates curves and roofline)
    const rimLight = new THREE.DirectionalLight(0x0C813D, 2.0);
    rimLight.position.set(-6, 5, -6);
    this.scene.add(rimLight);

    // Warm Gold Atelier Accent
    const goldAccent = new THREE.PointLight(0xffcc66, 1.5, 18);
    goldAccent.position.set(0, 3, -3.5);
    this.scene.add(goldAccent);

    // Front Grille Fill
    const frontFill = new THREE.DirectionalLight(0xddeeff, 1.2);
    frontFill.position.set(7, 1, 0);
    this.scene.add(frontFill);
  }

  buildStudioFloor() {
    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x070a0e,
      roughness: 0.25,
      metalness: 0.65
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.52;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Subtle Radial Grid Lines on Floor
    const gridHelper = new THREE.PolarGridHelper(12, 16, 8, 32, 0x0C813D, 0x1f2937);
    gridHelper.position.y = -0.51;
    gridHelper.material.opacity = 0.25;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);

    // Contact Patch Shadow
    const shadowGeo = new THREE.PlaneGeometry(5.2, 2.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.8
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, -0.505, 0);
    this.scene.add(shadow);
  }

  buildRealisticCar() {
    // 1. Car Paint Material (Physical Clearcoat)
    const paintMat = new THREE.MeshPhysicalMaterial({
      color: this.currentPaintColor,
      metalness: 0.85,
      roughness: 0.16,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      reflectivity: 0.95
    });
    this.bodyMaterials.push(paintMat);

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x12151a,
      roughness: 0.45,
      metalness: 0.85
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0d141f,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.88,
      ior: 1.52,
      transparent: true,
      opacity: 0.85
    });

    // 2. Main Chassis Tub
    const chassisGeo = new THREE.BoxGeometry(4.3, 0.45, 1.95);
    const chassis = new THREE.Mesh(chassisGeo, carbonMat);
    chassis.position.set(0, -0.16, 0);
    chassis.castShadow = true;
    this.carGroup.add(chassis);

    // 3. Lower Front Splitter & Rear Diffuser
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 1.92), carbonMat);
    splitter.position.set(2.15, -0.32, 0);
    this.carGroup.add(splitter);

    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.14, 1.88), carbonMat);
    diffuser.position.set(-2.15, -0.28, 0);
    this.carGroup.add(diffuser);

    // 4. Aerodynamic Sculpted Body (Smooth GT Waistline)
    const bodyGeo = new THREE.CylinderGeometry(0.95, 1.0, 4.2, 24, 6);
    bodyGeo.rotateZ(Math.PI / 2);
    bodyGeo.scale(1, 0.48, 0.98);
    const mainBody = new THREE.Mesh(bodyGeo, paintMat);
    mainBody.position.set(0, 0.06, 0);
    mainBody.castShadow = true;
    this.carGroup.add(mainBody);

    // 5. Cabin Glasshouse & Sloping Fastback Roof
    const cabinGeo = new THREE.CylinderGeometry(0.72, 0.88, 2.2, 16);
    cabinGeo.rotateZ(Math.PI / 2);
    cabinGeo.scale(1, 0.58, 0.86);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(-0.25, 0.52, 0);
    cabin.castShadow = true;
    this.carGroup.add(cabin);

    // 6. Hinged Hood System (Smoothly Opens to Reveal Engine Bay!)
    // Pivot is located at the cowl near the windshield (x = 0.4, y = 0.28)
    this.hoodGroup.position.set(0.4, 0.28, 0);
    const hoodLidGeo = new THREE.BoxGeometry(1.65, 0.06, 1.55);
    const hoodLid = new THREE.Mesh(hoodLidGeo, paintMat);
    hoodLid.position.set(0.82, 0, 0);
    hoodLid.rotation.z = -0.05;
    hoodLid.castShadow = true;
    this.hoodGroup.add(hoodLid);
    this.carGroup.add(this.hoodGroup);

    // 7. AutoContentment Signature Front Grille & Emblem
    const grilleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.38, 1.45), carbonMat);
    grilleMesh.position.set(2.1, -0.08, 0);
    this.carGroup.add(grilleMesh);

    // AutoContentment Emerald Shield Badge
    const badgeGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16);
    badgeGeo.rotateZ(Math.PI / 2);
    const badgeMat = new THREE.MeshStandardMaterial({ color: 0x0C813D, metalness: 0.9, roughness: 0.1 });
    const badge = new THREE.Mesh(badgeGeo, badgeMat);
    badge.position.set(2.2, -0.02, 0);
    this.carGroup.add(badge);

    // 8. Projector LED Headlights & DRL Lightbars
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xc8f0ff });
    [-0.65, 0.65].forEach(zPos => {
      const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.32), headlightMat);
      headlight.position.set(2.0, 0.16, zPos);
      headlight.rotation.y = zPos > 0 ? -0.22 : 0.22;
      this.carGroup.add(headlight);
    });

    // 9. Full-Width LED Neon Tail Bar
    const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xff1e28 });
    const tailBar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 1.76), tailLightMat);
    tailBar.position.set(-2.14, 0.24, 0);
    this.carGroup.add(tailBar);

    // 10. Quad Titanium Exhaust Pipes
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x2b3846, metalness: 0.95, roughness: 0.15 });
    [-0.62, -0.46, 0.46, 0.62].forEach(zPos => {
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.28, 16), exhaustMat);
      tip.rotateZ(Math.PI / 2);
      tip.position.set(-2.18, -0.26, zPos);
      this.carGroup.add(tip);
    });

    // 11. Wheels with Rubber Tires & Emerald Brembo Calipers
    const wheelPositions = [
      { x: 1.38, z: 1.0, isFront: true },
      { x: 1.38, z: -1.0, isFront: true },
      { x: -1.38, z: 1.0, isFront: false },
      { x: -1.38, z: -1.0, isFront: false }
    ];

    wheelPositions.forEach(pos => {
      const wheelAssembly = this.createRealisticWheel(pos.isFront);
      wheelAssembly.position.set(pos.x, -0.22, pos.z);
      this.carGroup.add(wheelAssembly);
      this.wheels.push(wheelAssembly);
    });

    this.carGroup.position.set(0, 0, 0);
    this.scene.add(this.carGroup);
  }

  createRealisticWheel(isFront) {
    const group = new THREE.Group();

    // Treaded Rubber Tire
    const tireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 24);
    tireGeo.rotateX(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x16181b, roughness: 0.9, metalness: 0.1 });
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = true;
    group.add(tire);

    // Alloy Concave Rim
    const rimGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.29, 16);
    rimGeo.rotateX(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd6dde5, metalness: 0.95, roughness: 0.12 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    group.add(rim);

    // 10 Spokes
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.03), rimMat);
      spoke.position.set(Math.cos(angle) * 0.13, Math.sin(angle) * 0.13, 0.12);
      spoke.rotation.z = angle;
      group.add(spoke);
    }

    // Ventilated Cross-Drilled Brake Rotor
    const rotorGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.04, 16);
    rotorGeo.rotateX(Math.PI / 2);
    const rotorMat = new THREE.MeshStandardMaterial({ color: 0x8a99a8, metalness: 0.92, roughness: 0.28 });
    const rotor = new THREE.Mesh(rotorGeo, rotorMat);
    group.add(rotor);

    // AutoContentment Emerald Brembo Caliper
    const caliperGeo = new THREE.BoxGeometry(0.09, 0.18, 0.12);
    const caliperMat = new THREE.MeshStandardMaterial({ color: 0x0C813D, metalness: 0.88, roughness: 0.2 });
    const caliper = new THREE.Mesh(caliperGeo, caliperMat);
    caliper.position.set(0.12, 0.1, 0.02);
    group.add(caliper);

    return group;
  }

  buildDetailedEngine() {
    this.engineGroup = new THREE.Group();

    // 1. Cast Aluminium Engine Block
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.52, 0.72),
      new THREE.MeshStandardMaterial({ color: 0x22262e, metalness: 0.92, roughness: 0.32 })
    );
    this.engineGroup.add(block);

    // 2. High-Flow Intake Plenum (Center Chrome Runners)
    const intakePlenum = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.14, 0.32),
      new THREE.MeshStandardMaterial({ color: 0xdde4ec, metalness: 0.96, roughness: 0.12 })
    );
    intakePlenum.position.set(0, 0.32, 0);
    this.engineGroup.add(intakePlenum);

    // 3. V8 Red Valve Covers (Right & Left Banks)
    const coverGeo = new THREE.BoxGeometry(0.86, 0.15, 0.26);
    const coverMat = new THREE.MeshStandardMaterial({ color: 0xa00018, metalness: 0.75, roughness: 0.25 });
    
    const leftCover = new THREE.Mesh(coverGeo, coverMat);
    leftCover.position.set(0, 0.28, 0.26);
    leftCover.rotation.x = 0.3;
    this.engineGroup.add(leftCover);

    const rightCover = leftCover.clone();
    rightCover.position.z = -0.26;
    rightCover.rotation.x = -0.3;
    this.engineGroup.add(rightCover);

    // 4. Front Serpentine Belt & Alternator Pulley System
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x111315, roughness: 0.85 });
    const pulleyMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.95 });

    const crankPulley = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16), pulleyMat);
    crankPulley.rotateZ(Math.PI / 2);
    crankPulley.position.set(0.52, -0.08, 0);
    this.engineGroup.add(crankPulley);

    const altPulley = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16), pulleyMat);
    altPulley.rotateZ(Math.PI / 2);
    altPulley.position.set(0.52, 0.16, 0.24);
    this.engineGroup.add(altPulley);

    // 5. Twin Gold Turbochargers
    const turboGeo = new THREE.TorusGeometry(0.14, 0.055, 14, 24);
    const turboMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.95, roughness: 0.18 });

    const leftTurbo = new THREE.Mesh(turboGeo, turboMat);
    leftTurbo.position.set(0.42, 0.1, 0.44);
    this.engineGroup.add(leftTurbo);

    const rightTurbo = leftTurbo.clone();
    rightTurbo.position.z = -0.44;
    this.engineGroup.add(rightTurbo);

    // 6. Interactive Glowing Engine Diagnostic Nodes
    const engineNodes = [
      { id: 'vvt', name: 'VVT Variable Valve Cam Phaser', pos: [0.38, 0.35, 0.26], color: 0x00ff88 },
      { id: 'solenoid', name: 'Oil Control Solenoid & Pressure Sensor', pos: [0.1, 0.38, 0], color: 0x00ccff },
      { id: 'turbo', name: 'Twin Turbocharger Wastegate Actuator', pos: [0.42, 0.12, 0.44], color: 0xffaa00 },
      { id: 'belt', name: 'Serpentine Accessory Belt Drive', pos: [0.54, 0.02, 0.12], color: 0xff3366 }
    ];

    engineNodes.forEach(node => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.06, 0.09, 20),
        new THREE.MeshBasicMaterial({ color: node.color, side: THREE.DoubleSide })
      );
      ring.rotateX(Math.PI / 2);
      ring.position.set(...node.pos);

      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      dot.position.set(...node.pos);
      ring.add(dot);

      this.engineGroup.add(ring);
      this.diagnosticNodes.push(ring);
    });

    this.engineGroup.position.set(1.22, 0.02, 0);
    this.carGroup.add(this.engineGroup);
  }

  buildDustSheet() {
    // The cinematic Valmora satin dust sheet
    const sheetGeo = new THREE.PlaneGeometry(5.4, 3.6, 32, 24);
    sheetGeo.rotateX(-Math.PI / 2);
    
    // Initial drape curvature
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
      color: 0x141a24,
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

  setCameraView(viewName) {
    this.currentView = viewName;
    const target = this.cameraTargets[viewName] || this.cameraTargets.exterior;

    // Handle hood opening when viewing engine
    if (viewName === 'engine') {
      this.openHood(true);
    } else {
      this.openHood(false);
    }

    // Handle X-Ray transparency
    if (viewName === 'xray') {
      this.setXRayMode(true);
    } else {
      this.setXRayMode(false);
    }
  }

  openHood(open) {
    this.isHoodOpen = open;
  }

  setXRayMode(enable) {
    this.bodyMaterials.forEach(mat => {
      mat.transparent = enable;
      mat.opacity = enable ? 0.25 : 1.0;
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

    // 2. Camera Choreography across the scroll progress if in exterior view
    if (this.currentView === 'exterior') {
      if (progress <= 0.25) {
        // Hero Unveil Angle
        const t = progress / 0.25;
        this.camera.position.x = THREE.MathUtils.lerp(4.8, 3.4, t);
        this.camera.position.y = THREE.MathUtils.lerp(1.6, 1.3, t);
        this.camera.position.z = THREE.MathUtils.lerp(4.8, 3.8, t);
        this.carGroup.rotation.y = THREE.MathUtils.lerp(-0.25, 0.45, t);
        this.openHood(false);
      } else if (progress <= 0.55) {
        // Zoom into Engine Bay & Open Hood!
        const t = (progress - 0.25) / 0.3;
        this.camera.position.x = THREE.MathUtils.lerp(3.4, 2.1, t);
        this.camera.position.y = THREE.MathUtils.lerp(1.3, 1.7, t);
        this.camera.position.z = THREE.MathUtils.lerp(3.8, 1.0, t);
        this.carGroup.rotation.y = THREE.MathUtils.lerp(0.45, 0.85, t);
        this.openHood(t > 0.2);
      } else if (progress <= 0.8) {
        // Zoom to Wheel & Brembo Caliper
        const t = (progress - 0.55) / 0.25;
        this.camera.position.x = THREE.MathUtils.lerp(2.1, 1.8, t);
        this.camera.position.y = THREE.MathUtils.lerp(1.7, 0.35, t);
        this.camera.position.z = THREE.MathUtils.lerp(1.0, 1.9, t);
        this.carGroup.rotation.y = THREE.MathUtils.lerp(0.85, 2.1, t);
        this.openHood(false);
      } else {
        // Rear Active Aero & Exhaust
        const t = (progress - 0.8) / 0.2;
        this.camera.position.x = THREE.MathUtils.lerp(1.8, -4.2, t);
        this.camera.position.y = THREE.MathUtils.lerp(0.35, 1.4, t);
        this.camera.position.z = THREE.MathUtils.lerp(1.9, 3.2, t);
        this.carGroup.rotation.y = THREE.MathUtils.lerp(2.1, 3.14, t);
        this.openHood(false);
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

    // 1. Smoothly interpolate camera position and lookAt if a dedicated view is selected
    const target = this.cameraTargets[this.currentView];
    if (target && this.currentView !== 'exterior') {
      this.camera.position.lerp(target.pos, 0.06);
      this.currentLookAt.lerp(target.lookAt, 0.06);
      this.camera.lookAt(this.currentLookAt);
    }

    // 2. Hood Opening Animation (Smooth upward swing on pivot)
    const targetHoodAngle = this.isHoodOpen ? -Math.PI / 4.2 : 0;
    this.hoodGroup.rotation.z += (targetHoodAngle - this.hoodGroup.rotation.z) * 0.08;

    // 3. Auto-rotation or mouse parallax
    if (this.autoRotate) {
      this.carGroup.rotation.y += 0.008;
    } else {
      this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05;
      this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05;
      this.carGroup.rotation.z = this.mouse.x * 0.035;
      this.carGroup.rotation.x = -this.mouse.y * 0.025;
    }

    // 4. Pulse Engine Diagnostic Nodes
    const time = performance.now() * 0.003;
    this.diagnosticNodes.forEach((node, i) => {
      const scale = 1.0 + Math.sin(time + i * 1.5) * 0.2;
      node.scale.set(scale, scale, scale);
    });

    this.renderer.render(this.scene, this.camera);
  }
}
