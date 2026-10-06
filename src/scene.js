import * as THREE from 'three';
import { PALETTES, makeFloorShader } from './effects.js';
import { inPocket } from './battle.js';

export function createScene(canvas, onFailure) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 1, .1, 80);
  const hemisphere = new THREE.HemisphereLight('#fff8e8', '#707c71', 1.15); scene.add(hemisphere);
  const light = new THREE.DirectionalLight('#fff4de', 2.8); light.position.set(-4, 9, 5); light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024); light.shadow.camera.left = -8; light.shadow.camera.right = 8; light.shadow.camera.top = 8; light.shadow.camera.bottom = -8; light.shadow.normalBias = .025; scene.add(light);
  const toonRamp = new THREE.DataTexture(new Uint8Array([48,48,48,255, 135,135,135,255, 255,255,255,255]), 3, 1, THREE.RGBAFormat);
  toonRamp.minFilter = toonRamp.magFilter = THREE.NearestFilter; toonRamp.needsUpdate = true;
  const materials = {
    shell: new THREE.MeshPhysicalMaterial({ color: PALETTES.premium.shell, roughness: .3, clearcoat: 1, clearcoatRoughness: .16 }),
    floor: new THREE.MeshPhysicalMaterial({ color: PALETTES.premium.floor, roughness: .42, clearcoat: .65, clearcoatRoughness: .25 }),
    trim: new THREE.MeshStandardMaterial({ color: PALETTES.premium.trim, roughness: .6 }),
    metal: new THREE.MeshStandardMaterial({ color: PALETTES.premium.metal, roughness: .29, metalness: .45 }),
    coral: new THREE.MeshToonMaterial({ color: PALETTES.premium.coral, gradientMap: toonRamp }),
    teal: new THREE.MeshToonMaterial({ color: PALETTES.premium.teal, gradientMap: toonRamp }),
  };
  const outlines = new Map(), outlineMaterial = new THREE.LineBasicMaterial({ color: '#293f37', transparent: true, opacity: .55 });
  const mesh = (geometry, material, parent = scene, x = 0, y = 0, z = 0) => {
    const object = new THREE.Mesh(geometry, material); object.position.set(x, y, z); object.castShadow = true; object.receiveShadow = true; parent.add(object);
    if (material.isMeshToonMaterial) { if (!outlines.has(geometry)) outlines.set(geometry, new THREE.EdgesGeometry(geometry, 35)); object.add(new THREE.LineSegments(outlines.get(geometry), outlineMaterial)); }
    return object;
  };
  mesh(new THREE.CylinderGeometry(5.65, 5.5, .32, 96), materials.shell, scene, 0, -.22, 0);
  mesh(new THREE.CylinderGeometry(5.13, 5.13, .07, 96), materials.floor, scene, 0, -.025, 0);
  const wallGeometry = new THREE.TorusGeometry(5.2, .3, 12, 64, 150 * Math.PI / 180);
  const wallGroup = new THREE.Group(); wallGroup.rotation.x = Math.PI / 2; wallGroup.position.y = .24; scene.add(wallGroup);
  [-75, 105].forEach(degrees => { const wall = mesh(wallGeometry, materials.shell, wallGroup); wall.rotation.z = degrees * Math.PI / 180; });
  const edgeGeometry = new THREE.TorusGeometry(5.52, .045, 6, 80, 150 * Math.PI / 180);
  [-75, 105].forEach(degrees => { const edge = mesh(edgeGeometry, materials.trim, wallGroup); edge.rotation.z = degrees * Math.PI / 180; });
  [-1, 1].forEach(direction => {
    mesh(new THREE.BoxGeometry(2.6, .22, 1.45), materials.shell, scene, 0, -.15, direction * 5.65);
    mesh(new THREE.BoxGeometry(1.9, .05, .9), materials.trim, scene, 0, -.01, direction * 5.75);
    for (let i = -2; i <= 2; i++) mesh(new THREE.BoxGeometry(.055, .015, .7), materials.metal, scene, i * .3, .03, direction * 5.75);
  });
  const tickGeometry = new THREE.BoxGeometry(.028, .014, .16);
  for (let i = 0; i < 48; i++) {
    const angle = i * Math.PI / 24;
    if (inPocket(Math.cos(angle), Math.sin(angle))) continue;
    const tick = mesh(tickGeometry, materials.trim, scene, Math.cos(angle) * 4.97, .016, Math.sin(angle) * 4.97); tick.rotation.y = -angle;
  }
  const badge = mesh(new THREE.TorusGeometry(.2, .018, 8, 32), materials.trim); badge.rotation.x = -Math.PI / 2; badge.position.y = .017;
  const floorMaterial = makeFloorShader();
  const effectFloor = mesh(new THREE.CircleGeometry(5.08, 80), floorMaterial); effectFloor.rotation.x = -Math.PI / 2; effectFloor.position.y = .025; effectFloor.castShadow = false; effectFloor.receiveShadow = false;
  const shadow = new THREE.MeshBasicMaterial({ color: '#273b33', transparent: true, opacity: .12, depthWrite: false });
  const topGeometry = {
    tip: new THREE.ConeGeometry(.065, .15, 16), core: new THREE.CylinderGeometry(.28, .14, .22, 24), shell: new THREE.CylinderGeometry(.38, .45, .15, 24),
    ring: new THREE.TorusGeometry(.42, .057, 10, 48), cap: new THREE.CylinderGeometry(.2, .26, .12, 24), center: new THREE.CylinderGeometry(.09, .09, .045, 20),
  };
  const bladeShape = new THREE.Shape(); bladeShape.moveTo(.14, -.1); bladeShape.lineTo(.54, -.08); bladeShape.lineTo(.46, .13); bladeShape.lineTo(.19, .18); bladeShape.closePath();
  const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, { depth: .095, bevelEnabled: true, bevelSize: .025, bevelThickness: .018, bevelSegments: 1, steps: 1 });
  const guardShape = new THREE.Shape(); guardShape.moveTo(.17, -.13); guardShape.lineTo(.45, -.17); guardShape.quadraticCurveTo(.56, 0, .45, .17); guardShape.lineTo(.17, .13); guardShape.closePath();
  const glideShape = new THREE.Shape(); glideShape.moveTo(.12, -.12); glideShape.quadraticCurveTo(.65, -.28, .48, .18); glideShape.quadraticCurveTo(.3, .32, .12, .12); glideShape.closePath();
  const extrude = shape => new THREE.ExtrudeGeometry(shape, { depth: .095, bevelEnabled: true, bevelSize: .02, bevelThickness: .018, bevelSegments: 2, steps: 1 });
  const designs = { strike: { blade: bladeGeometry, count: 6, cap: .85 }, guard: { blade: extrude(guardShape), count: 8, cap: 1.25 }, glide: { blade: extrude(glideShape), count: 3, cap: 1 } };
  const tops = ['coral', 'teal'].map((color, index) => {
    const root = new THREE.Group(), shell = new THREE.Group(); root.add(shell); scene.add(root); root.position.x = index ? 3 : -3;
    const tip = mesh(topGeometry.tip, materials.metal, shell, 0, .075, 0); tip.rotation.z = Math.PI;
    mesh(topGeometry.core, materials.trim, shell, 0, .19, 0);
    const ring = mesh(topGeometry.ring, materials.metal, shell, 0, .28, 0); ring.rotation.x = Math.PI / 2;
    const variants = Object.fromEntries(Object.entries(designs).map(([name, design]) => {
      const group = new THREE.Group(); shell.add(group); group.visible = name === (index ? 'guard' : 'strike');
      mesh(topGeometry.shell, materials[color], group, 0, .31, 0);
      for (let i = 0; i < design.count; i++) {
        const blade = mesh(design.blade, materials[color], group, 0, .33, 0); blade.rotation.set(-Math.PI / 2, 0, i * Math.PI * 2 / design.count);
      }
      const cap = mesh(topGeometry.cap, materials.metal, group, 0, .45, 0); cap.scale.set(design.cap, 1, design.cap);
      const center = mesh(topGeometry.center, materials[color], group, 0, .53, 0); center.scale.set(design.cap, 1, design.cap);
      return [name, group];
    }));
    const ringCap = mesh(new THREE.TorusGeometry(.14, .012, 6, 24), materials.trim, shell, 0, .515, 0); ringCap.rotation.x = Math.PI / 2;
    const contactShadow = mesh(new THREE.CircleGeometry(.55, 32), shadow); contactShadow.rotation.x = -Math.PI / 2; contactShadow.position.set(index ? 3 : -3, .018, 0); contactShadow.castShadow = false;
    return { root, shell, contactShadow, variants };
  });
  const aimMaterial = new THREE.MeshBasicMaterial({ color: PALETTES.premium.coral, transparent: true, opacity: .6 });
  const aimGroup = new THREE.Group(); scene.add(aimGroup);
  for (let i = 0; i < 5; i++) { const dot = mesh(new THREE.SphereGeometry(.035 + i * .005, 8, 6), aimMaterial, aimGroup, .65 + i * .25, .07, 0); dot.castShadow = false; }
  const arrow = mesh(new THREE.ConeGeometry(.12, .25, 3), aimMaterial, aimGroup, 2, .07, 0); arrow.rotation.z = -Math.PI / 2; arrow.castShadow = false;
  const particles = [];
  const particleGeometry = new THREE.SphereGeometry(.03, 6, 4), particleMaterial = new THREE.MeshBasicMaterial({ color: '#e7ab63' });
  for (let i = 0; i < 32; i++) { const object = mesh(particleGeometry, particleMaterial); object.visible = false; object.castShadow = false; particles.push({ object, age: 1, velocity: new THREE.Vector3() }); }
  let theme = 'premium', targetView = 'angled', view = 'angled', cameraStarted = 0, cameraFrom = new THREE.Vector3(), failure = false;
  const views = { angled: new THREE.Vector3(4, 12, 13), top: new THREE.Vector3(0, 18, .001) };
  camera.position.copy(views.angled); camera.lookAt(0, 0, 0);
  renderer.debug.onShaderError = () => {
    if (failure) return; failure = true;
    effectFloor.material = new THREE.MeshBasicMaterial({ color: '#83a78c', transparent: true, opacity: .08, depthWrite: false });
    onFailure('The custom shader could not compile. Basic materials are active.', false);
  };
  function setTheme(value) {
    theme = value; const palette = PALETTES[value];
    Object.entries(materials).forEach(([key, material]) => material.color.set(palette[key]));
    materials.metal.metalness = value === 'retro' ? .1 : .45;
    materials.shell.roughness = value === 'retro' ? .4 : .3;
    light.color.set(palette.light); floorMaterial.uniforms.uColorA.value.set(palette.coral); floorMaterial.uniforms.uColorB.value.set(palette.teal);
  }
  function resize() {
    const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    const dpr = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(1500000 / (rect.width * rect.height)));
    renderer.setPixelRatio(dpr); renderer.setSize(rect.width, rect.height, false); camera.aspect = rect.width / rect.height; camera.zoom = Math.min(1.07, camera.aspect * .94); camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
  const lost = event => { event.preventDefault(); onFailure('The 3D connection was interrupted. Retry to restore the arena.', true); };
  canvas.addEventListener('webglcontextlost', lost);
  return {
    setTheme,
    // ponytail: designs share arcade colliders and spin rules; variation is visual.
    setDesign(index, name) { Object.entries(tops[index].variants).forEach(([key, group]) => { group.visible = key === name; }); },
    setView(value, reduced) { view = value; targetView = value; cameraFrom.copy(camera.position); cameraStarted = .0001; if (reduced) { camera.position.copy(views[value]); camera.lookAt(0, 0, 0); cameraStarted = 0; } },
    aim(event, index) {
      const rect = canvas.getBoundingClientRect(), pointer = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      const ray = new THREE.Raycaster(); ray.setFromCamera(pointer, camera);
      const point = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
      if (!point) return 0;
      const angle = Math.atan2(point.z, point.x - (index ? 3 : -3));
      return index ? Math.atan2(Math.sin(angle - Math.PI), Math.cos(angle - Math.PI)) : angle;
    },
    impact(event, time, reduced) {
      const records = floorMaterial.uniforms.uImpacts.value; records.shift(); records.push(new THREE.Vector4(event.x, -event.z, time, event.strength));
      if (reduced) return;
      let count = 0;
      for (const particle of particles) { if (particle.age < .5) continue; const angle = count * Math.PI / 4; particle.age = 0; particle.object.position.set(event.x, .2, event.z); particle.velocity.set(Math.cos(angle) * 1.5, 1 + event.strength, Math.sin(angle) * 1.5); if (++count >= 8) break; }
    },
    reset() { particles.forEach(p => { p.age = 1; p.object.visible = false; }); floorMaterial.uniforms.uImpacts.value.forEach(record => record.set(0, 0, -10, 0)); },
    render(state, alpha, charge, aim, dt, reduced) {
      if (cameraStarted && !state.paused) {
        cameraStarted += dt;
        const progress = reduced ? 1 : Math.min(1, cameraStarted / .25), eased = progress * progress * (3 - 2 * progress);
        camera.position.lerpVectors(cameraFrom, views[targetView], eased); camera.lookAt(0, 0, 0); if (progress === 1) cameraStarted = 0;
      }
      state.tops.forEach((top, index) => {
        const x = state.phase === 'battling' ? THREE.MathUtils.lerp(top.previousX, top.x, alpha) : top.x, z = state.phase === 'battling' ? THREE.MathUtils.lerp(top.previousZ, top.z, alpha) : top.z;
        const model = tops[index]; model.root.position.set(x, .015, z); model.shell.rotation.y = top.rotation;
        const wobble = reduced || state.phase !== 'battling' ? 0 : Math.max(0, .4 - top.energy) * .35;
        model.shell.rotation.x = Math.sin(top.rotation * .4) * wobble; model.shell.rotation.z = Math.cos(top.rotation * .4) * wobble;
        model.contactShadow.position.set(x, .019, z);
        model.contactShadow.visible = Math.hypot(x, z) < 5.15;
      });
      aimGroup.visible = ['setupA', 'setupB'].includes(state.phase) && !state.paused;
      const index = state.phase === 'setupB' ? 1 : 0; aimGroup.position.set(index ? 3 : -3, 0, 0); aimGroup.rotation.y = -(aim + (index ? Math.PI : 0)); aimMaterial.color.set(index ? PALETTES[theme].teal : PALETTES[theme].coral);
      const uniforms = floorMaterial.uniforms; uniforms.uTime.value = state.time; uniforms.uCharge.value = charge; uniforms.uReduced.value = reduced ? 1 : 0;
      if (state.tops.length === 2) { uniforms.uTopA.value.set(state.tops[0].x, -state.tops[0].z); uniforms.uTopB.value.set(state.tops[1].x, -state.tops[1].z); uniforms.uEnergy.value.set(state.tops[0].energy, state.tops[1].energy); }
      particles.forEach(particle => {
        if (reduced) { particle.object.visible = false; return; }
        if (!state.paused && state.phase === 'battling') { particle.age += dt; particle.velocity.y -= dt * 5; particle.object.position.addScaledVector(particle.velocity, dt); }
        particle.object.visible = particle.age < .5; particle.object.scale.setScalar(Math.max(0, 1 - particle.age * 2));
      });
      renderer.render(scene, camera);
    },
    dispose() {
      observer.disconnect(); canvas.removeEventListener('webglcontextlost', lost);
      const geometries = new Set(), materialSet = new Set([floorMaterial]);
      scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) materialSet.add(object.material); });
      geometries.forEach(geometry => geometry.dispose()); materialSet.forEach(material => material.dispose()); toonRamp.dispose(); renderer.dispose();
    },
  };
}
