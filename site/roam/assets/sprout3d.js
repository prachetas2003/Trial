import * as THREE from './vendor/three.module.js';
const { spring, ease, WINDOW } = window.BuildlingsMotion;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const joint = () => ({ value: 0, velocity: 0 });
const v = (x, y, z) => new THREE.Vector3(x, y, z);

function mesh(geometry, material, parent, position, scale) {
  const object = new THREE.Mesh(geometry, material);
  if (position) object.position.set(...position);
  if (scale) object.scale.set(...scale);
  parent.add(object); return object;
}
function curve(points, radius, material, parent) {
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => v(...p))), 16, radius, 6, false), material, parent);
}
function flexibleEar(parent, side, material, color, antenna = false) {
  const node = new THREE.Group(); node.position.set(side * .47, .69, .01); node.rotation.z = -side * .32; parent.add(node);
  const geometry = antenna ? new THREE.CylinderGeometry(.035, .047, .77, 10, 12) : new THREE.SphereGeometry(1, 18, 20);
  const position = geometry.attributes.position, indices = [], weights = [], colors = [];
  const light = new THREE.Color(color).lerp(new THREE.Color('#f0f7b8'), .38), dark = new THREE.Color(color);
  for (let i = 0; i < position.count; i++) {
    let y;
    if (antenna) { y = position.getY(i) + .385; position.setY(i, y); }
    else {
      const ny = position.getY(i); y = (ny + 1) * .44;
      position.setXYZ(i, position.getX(i) * .21 * (1 - .2 * ny), y, position.getZ(i) * .075);
    }
    const weight = clamp((y - .18) / .48, 0, 1);
    indices.push(0, 1, 0, 0); weights.push(1 - weight, weight, 0, 0);
    const c = dark.clone().lerp(light, clamp(1 - Math.abs(position.getX(i)) / .16, 0, 1) * .70);
    colors.push(c.r, c.g, c.b);
  }
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.computeVertexNormals();
  const earMaterial = material.clone(); earMaterial.color.set('#ffffff'); earMaterial.vertexColors = true;
  const skin = new THREE.SkinnedMesh(geometry, earMaterial), base = new THREE.Bone(), tip = new THREE.Bone();
  tip.position.y = .42; base.add(tip); skin.add(base); node.add(skin); skin.bind(new THREE.Skeleton([base, tip]));
  if (antenna) mesh(new THREE.SphereGeometry(.13, 18, 12), material, tip, [0, .35, 0]);
  return { node, tip, spring: joint(), side };
}
function createPet(data) {
  const root = new THREE.Group(), torso = new THREE.Group(); root.add(torso); torso.position.y = 1.07;
  const toy = new THREE.MeshPhysicalMaterial({ color: data.color, roughness: .66, metalness: 0, clearcoat: .13, clearcoatRoughness: .65 });
  const dark = new THREE.MeshStandardMaterial({ color: data.dark, roughness: .85 });
  const black = new THREE.MeshPhysicalMaterial({ color: '#23382d', roughness: .19, clearcoat: .9, clearcoatRoughness: .12 });
  const white = new THREE.MeshBasicMaterial({ color: '#fffef1' });
  const bodyGeometry = new THREE.SphereGeometry(1, 40, 28);
  const positions = bodyGeometry.attributes.position, bodyColors = [];
  const baseColor = new THREE.Color(data.color), bellyColor = baseColor.clone().lerp(new THREE.Color('#fff2bc'), .30);
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i), pear = 1 + .10 * (1 - y);
    positions.setXYZ(i, positions.getX(i) * .81 * pear, y * .93, positions.getZ(i) * .63 * pear);
    const belly = Math.exp(-((positions.getX(i) / .44) ** 2) - ((positions.getY(i) + .32) / .32) ** 2) * Math.max(0, positions.getZ(i) / .69) ** 6;
    const color = baseColor.clone().lerp(bellyColor, belly);
    bodyColors.push(color.r, color.g, color.b);
  }
  bodyGeometry.setAttribute('color', new THREE.Float32BufferAttribute(bodyColors, 3));
  const bodyMaterial = toy.clone(); bodyMaterial.color.set('#ffffff'); bodyMaterial.vertexColors = true;
  bodyGeometry.computeVertexNormals(); const body = mesh(bodyGeometry, bodyMaterial, torso); body.name = 'Sprout sculpted body';
  const ears = [flexibleEar(torso, -1, toy, data.color, data.id === 'orbit'), flexibleEar(torso, 1, toy, data.color, data.id === 'orbit')];
  const face = new THREE.Group(); face.position.set(0, .27, .65); torso.add(face);
  const eyes = [], happy = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group(); eye.position.set(side * .265, .14, .017); face.add(eye);
    mesh(new THREE.SphereGeometry(1, 20, 16), black, eye, [0, 0, 0], [.087, .115, .043]);
    mesh(new THREE.SphereGeometry(.022, 12, 8), white, eye, [-.025, .045, .037]);
    eyes.push(eye);
    const material = new THREE.MeshBasicMaterial({ color: '#23382d', transparent: true, opacity: 0, depthWrite: false });
    const arc = curve([[side * .265 - .073, .115, .066], [side * .265, .173, .066], [side * .265 + .073, .115, .066]], .018, material, face);
    happy.push(arc);
    const blush = new THREE.MeshStandardMaterial({ color: data.blush, roughness: 1, transparent: true, opacity: .42, depthWrite: false });
    mesh(new THREE.SphereGeometry(1, 18, 12), blush, face, [side * .405, -.09, -.04], [.12, .073, .032]);
  }
  const smile = curve([[-.115, -.13, .054], [-.066, -.187, .074], [0, -.203, .08], [.066, -.187, .074], [.115, -.13, .054]], .018, black, face);
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * .91, -.04, .25); torso.add(arm);
    mesh(new THREE.CapsuleGeometry(.115, .21, 5, 14), toy, arm, [0, -.16, .11]);
    mesh(new THREE.SphereGeometry(1, 18, 12), toy, arm, [0, -.33, .12], [.14, .14, .14]);
    arm.rotation.z = -side * .30; arms.push(arm);
  }
  const feet = [];
  for (const side of [-1, 1]) {
    const paw = new THREE.Group(); paw.position.set(side * .43, .13, .16); root.add(paw);
    mesh(new THREE.SphereGeometry(1, 24, 16), toy, paw, [0, 0, 0], [.24, .13, .29]);
    mesh(new THREE.SphereGeometry(1, 20, 12), dark, paw, [0, -.04, -.025], [.217, .078, .235]);
    feet.push({ paw, side, stance: false, anchorX: 0, anchorY: 0 });
  }
  return { root, torso, body, face, eyes, happy, smile, arms, feet, ears, reach: joint(), eyeX: joint(), eyeY: joint(), headX: joint(), headY: joint(), nextBlink: 3500, blinkStart: -10000 };
}

export class SproutScene {
  constructor(host, data) {
    this.host = host; this.lastTime = null; this.lastPhase = 'ground'; this.lastSparkle = 0; this.particles = [];
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); this.renderer.setSize(WINDOW.width, WINDOW.height, false);
    this.renderer.setClearColor(0x000000, 0); this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = .95;
    this.renderer.domElement.id = 'pet-canvas'; this.renderer.domElement.setAttribute('aria-label', `${data.name}, your 3D desktop companion`);
    host.append(this.renderer.domElement);
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(30, WINDOW.width / WINDOW.height, .1, 30);
    this.camera.position.set(0, 3.6, 9); this.camera.lookAt(0, 2.04, 0); this.camera.updateMatrixWorld();
    const ground = v(0, 0, 0).project(this.camera), raised = v(0, 1, 0).project(this.camera);
    this.footX = (ground.x + 1) * WINDOW.width / 2; this.footY = (1 - ground.y) * WINDOW.height / 2;
    this.pixelsPerUnit = (ground.y - raised.y) * WINDOW.height / 2;
    this.scene.add(new THREE.HemisphereLight('#fff9de', '#879865', 1.4));
    const key = new THREE.DirectionalLight('#fff4df', 2.4); key.position.set(-3, 5, 5); this.scene.add(key);
    const fill = new THREE.DirectionalLight('#d7e9ff', .75); fill.position.set(4, 1, 3); this.scene.add(fill);
    const rim = new THREE.DirectionalLight('#edffc5', 2.4); rim.position.set(2, 4, -4); this.scene.add(rim);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d'), gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(36,53,37,.38)'); gradient.addColorStop(.45, 'rgba(36,53,37,.17)'); gradient.addColorStop(1, 'rgba(36,53,37,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
    this.shadow = mesh(new THREE.PlaneGeometry(2.9, 1.8), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }), this.scene);
    this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = -.014;
    this.particleGeometry = new THREE.OctahedronGeometry(.052);
    this.particleMaterials = [new THREE.MeshBasicMaterial({ color: '#f7d66f', transparent: true }), new THREE.MeshBasicMaterial({ color: '#f5a3b0', transparent: true })];
    this.setPet(data);
    // Compile particle shaders before the first stroke. The warm-up meshes
    // stay outside the camera and never become visible desktop content.
    const warm = this.particleMaterials.map(material => mesh(this.particleGeometry, material, this.scene, [20, 20, 0]));
    this.renderer.compile(this.scene, this.camera);
    warm.forEach(object => this.scene.remove(object));
    this.renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); window.__buildlingsRenderer.contextLost = true; });
    this.renderer.domElement.addEventListener('webglcontextrestored', () => { window.__buildlingsRenderer.contextLost = false; });
    window.__buildlingsRenderer = { type: 'webgl2', rigged: true, flexibleEars: true, contextLost: false, pixelRatio: this.renderer.getPixelRatio(), canvasWidth: WINDOW.width, canvasHeight: WINDOW.height };
  }
  setPet(data) {
    if (this.pet) { this.scene.remove(this.pet.root); this.disposeGroup(this.pet.root); }
    this.pet = createPet(data); this.scene.add(this.pet.root); this.data = data;
    this.renderer.domElement.setAttribute('aria-label', `${data.name}, your 3D desktop companion`);
  }
  disposeGroup(group) {
    const materials = new Set(), geometries = new Set();
    group.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) materials.add(object.material); if (object.isSkinnedMesh) object.skeleton.dispose(); });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
  }
  emit(now) {
    for (let i = 0; i < 9; i++) {
      const object = new THREE.Mesh(this.particleGeometry, this.particleMaterials[i === 0 ? 1 : 0]);
      const angle = Math.random() * Math.PI * 2;
      object.position.set(Math.cos(angle) * .7, 1.5 + Math.sin(angle) * .55, .5);
      this.scene.add(object); this.particles.push({ object, born: now, x: object.position.x, y: object.position.y, vx: Math.cos(angle) * .65, vy: .65 + Math.random() * .55 });
    }
  }
  draw(frame, now) {
    const dt = this.lastTime === null ? 1 / 60 : clamp((now - this.lastTime) / 1000, 0, .06); this.lastTime = now;
    const p = this.pet, phase = frame.walkPhase, walk = clamp(frame.walkWeight, 0, 1), happy = clamp(frame.petWeight, 0, 1), reach = spring(p.reach, frame.reach, 18, dt);
    const breathing = Math.sin(now / 650) * .009 + Math.sin(now / 1270) * .003;
    p.root.position.y = frame.hop / this.pixelsPerUnit;
    p.torso.position.y = 1.07 + Math.abs(Math.sin(phase)) * .025 * walk - happy * .055 + reach * .055;
    p.torso.position.z = reach * .20;
    p.torso.scale.set(frame.scaleX * (1 + breathing + happy * .025), frame.scaleY * (1 - breathing * .5 - happy * .025), 1 + breathing);
    p.torso.rotation.z = -frame.lean * .10 + Math.sin(phase) * .025 * walk - reach * .055;
    p.torso.rotation.y = spring(p.headX, frame.lookX * .11 + frame.lean * .23, 6, dt);
    p.torso.rotation.x = -reach * .12 + frame.vy / 145 * .04;
    p.face.rotation.y = spring(p.eyeX, frame.lookX * .11, 20, dt);
    p.face.rotation.x = spring(p.eyeY, frame.lookY * .06, 20, dt);
    p.face.position.y = .27 + happy * .025;
    if (now > p.nextBlink && happy < .5) { p.blinkStart = now; p.nextBlink = now + 3500 + Math.random() * 5000; }
    const blinkT = (now - p.blinkStart) / 170, blink = blinkT >= 0 && blinkT <= 1 ? Math.sin(Math.PI * blinkT) : 0;
    p.eyes.forEach(eye => { eye.scale.y = Math.max(.02, (1 - blink * .97) * (1 - happy)); eye.position.x = (eye.position.x < 0 ? -.265 : .265) + frame.lookX * .016; });
    p.happy.forEach(eye => { eye.material.opacity = happy; eye.visible = happy > .01; });
    p.smile.scale.x = 1 + happy * .15;
    p.arms.forEach((arm, i) => {
      const side = i === 0 ? -1 : 1, step = Math.sin(phase + i * Math.PI);
      arm.rotation.z = -side * (.30 + happy * .12) + step * .15 * walk + (i === 1 ? -reach * .50 : reach * .08);
      arm.rotation.x = step * .19 * walk - (i === 1 ? reach * 1.32 : reach * .08);
      arm.position.z = .25 + (i === 1 ? reach * .16 : 0);
    });
    const air = frame.jumpPhase === 'air';
    p.feet.forEach((foot, i) => {
      const cycle = (phase / (Math.PI * 2) + i * .5) % 1;
      const stance = walk > .15 && !air && cycle < .60;
      const offsetX = foot.side * .43;
      if (stance && !foot.stance) {
        const speed = Math.hypot(frame.vx, frame.vy) || 1;
        foot.anchorX = frame.x + offsetX * this.pixelsPerUnit + frame.vx / speed * 15;
        foot.anchorY = frame.y + frame.vy / speed * 10;
      }
      if (stance) {
        foot.paw.position.x = clamp((foot.anchorX - frame.x) / this.pixelsPerUnit, offsetX - .28, offsetX + .28);
        foot.paw.position.y = .13 + clamp((frame.y - foot.anchorY) / this.pixelsPerUnit, -.05, .12);
      } else {
        const swing = ease(clamp((cycle - .60) / .40, 0, 1));
        foot.paw.position.x = offsetX + (swing - .5) * .24 * frame.lean * walk;
        foot.paw.position.y = .13 + Math.sin(Math.PI * swing) * .14 * walk + (air ? .10 : 0);
      }
      foot.paw.rotation.x = air ? -.22 : Math.sin(phase + i * Math.PI) * .07 * walk;
      foot.stance = stance;
    });
    for (const ear of p.ears) {
      // A damped secondary joint follows acceleration, gait, and landing impulses.
      const target = frame.lean * -.15 + Math.sin(phase + ear.side) * .055 * walk + happy * ear.side * .06 - reach * ear.side * .12;
      if (frame.jumpPhase === 'landing' && this.lastPhase !== 'landing') ear.spring.velocity += ear.side * 2.2;
      const substeps = Math.max(1, Math.ceil(dt * 120)), h = dt / substeps;
      for (let i = 0; i < substeps; i++) { ear.spring.velocity += ((target - ear.spring.value) * 110 - ear.spring.velocity * 8) * h; ear.spring.value += ear.spring.velocity * h; }
      ear.tip.rotation.z = clamp(ear.spring.value, -.45, .45);
      ear.tip.rotation.x = frame.anticipation * -.12 + frame.landing * .12;
      ear.node.rotation.z = -ear.side * .32 + frame.lookX * .05;
    }
    this.lastPhase = frame.jumpPhase;
    this.shadow.scale.setScalar(1 + frame.hop / 140); this.shadow.material.opacity = Math.exp(-frame.hop / 72);
    if (frame.sparkleId !== this.lastSparkle) { this.lastSparkle = frame.sparkleId; this.emit(now); }
    this.particles = this.particles.filter(particle => {
      const age = (now - particle.born) / 1000;
      if (age >= 1.05) { this.scene.remove(particle.object); return false; }
      particle.object.position.set(particle.x + particle.vx * age, particle.y + particle.vy * age + frame.hop / this.pixelsPerUnit, .5);
      particle.object.rotation.set(age * 2, age * 3, age * 2); particle.object.scale.setScalar(Math.sin(Math.PI * age / 1.05)); return true;
    });
    this.renderer.render(this.scene, this.camera);
    window.__buildlingsRenderer = { ...window.__buildlingsRenderer, particles: this.particles.length, calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles,
      petWeight: happy, reachWeight: reach, pawReach: p.arms[1].rotation.x, earBend: p.ears[0].tip.rotation.z, cameraPerspective: true, footX: this.footX, footY: this.footY };
  }
  dispose() {
    this.disposeGroup(this.pet.root); this.particleGeometry.dispose(); this.particleMaterials.forEach(m => m.dispose());
    this.shadow.geometry.dispose(); this.shadow.material.map.dispose(); this.shadow.material.dispose(); this.renderer.dispose();
  }
}
