import RAPIER from '@dimforge/rapier3d-compat';

export const SETTINGS = { radius: 5.2, exitRadius: 5.9, topRadius: .45, timestep: 1 / 120, maxTime: 20, drain: .045, centerForce: .9, orbitForce: .65, impactCooldown: .12 };
export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const boundAim = angle => clamp(angle, -65 * Math.PI / 180, 65 * Math.PI / 180);
export const inPocket = (x, z) => Math.abs(x) <= Math.abs(z) * Math.tan(Math.PI / 12);
export const contactDamage = speed => .015 + Math.min(.12, .008 * speed * speed);
let initialized;

export function resolveRound(tops, time) {
  const eliminated = tops.map(top => Math.hypot(top.x, top.z) >= SETTINGS.exitRadius && inPocket(top.x, top.z) ? 'Ring-out' : top.energy <= .08 ? 'Spin-out' : null);
  if (eliminated[0] && eliminated[1]) return { winner: null, reason: 'Double finish' };
  if (eliminated[0] || eliminated[1]) return { winner: eliminated[0] ? 1 : 0, reason: eliminated[0] || eliminated[1] };
  if (time >= SETTINGS.maxTime) return { winner: Math.abs(tops[0].energy - tops[1].energy) < .02 ? null : tops[0].energy > tops[1].energy ? 0 : 1, reason: 'Spin remaining' };
  return null;
}

export async function createBattle() {
  initialized ??= RAPIER.init({});
  await initialized;
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  world.timestep = SETTINGS.timestep;
  const queue = new RAPIER.EventQueue(true);
  const state = { phase: 'setupA', mode: 'cpu', paused: false, time: 0, countdown: 0, hits: 0, tops: [], launches: [null, null], result: null, events: [] };
  let lastImpact = -1;
  for (let index = 0; index < 36; index++) {
    const angle = index * Math.PI / 18;
    if (inPocket(Math.cos(angle), Math.sin(angle))) continue;
    const half = angle / 2;
    world.createCollider(RAPIER.ColliderDesc.cuboid(.16, .55, .48).setTranslation(Math.cos(angle) * 5.2, .4, Math.sin(angle) * 5.2).setRotation({ x: 0, y: -Math.sin(half), z: 0, w: Math.cos(half) }).setRestitution(.8).setFriction(.08));
  }
  function spawn() {
    state.tops.forEach(top => world.removeRigidBody(top.body));
    state.tops = [-3, 3].map((x, index) => {
      // ponytail: upright, plane-constrained colliders; physical tipping belongs in the single-top realism experiment.
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, .28, 0).enabledTranslations(true, false, true).lockRotations().setLinearDamping(.16).setCcdEnabled(true).setCanSleep(false));
      const collider = world.createCollider(RAPIER.ColliderDesc.cylinder(.22, .45).setMass(1).setRestitution(.8).setFriction(.05).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), body);
      return { body, collider, x, z: 0, previousX: x, previousZ: 0, energy: 1, rotation: 0, index };
    });
  }
  function reset(mode = state.mode) {
    state.phase = 'setupA'; state.mode = mode; state.paused = false; state.time = 0; state.countdown = 0; state.hits = 0; state.launches = [null, null]; state.result = null; state.events = []; lastImpact = -1;
    queue.drainCollisionEvents(() => {}); spawn();
  }
  function configureLaunch(angle, power, cpu = { angle: (Math.random() - .5) * .75, power: .65 + Math.random() * .2 }) {
    if (state.paused || !['setupA', 'setupB'].includes(state.phase)) return false;
    const index = state.phase === 'setupA' ? 0 : 1;
    state.launches[index] = { angle: boundAim(angle), power: clamp(power) };
    state.events.push({ type: 'staged', index });
    if (state.mode === 'both' && index === 0) { state.phase = 'setupB'; return true; }
    if (state.mode === 'cpu') state.launches[1] = { angle: boundAim(cpu.angle), power: clamp(cpu.power) };
    state.phase = 'countdown'; state.countdown = .7;
    return true;
  }
  function start() {
    if (state.paused || state.phase !== 'countdown' || !state.launches.every(Boolean)) return false;
    state.phase = 'battling'; state.time = 0; lastImpact = -1;
    state.tops.forEach((top, index) => {
      const launch = state.launches[index], angle = launch.angle + (index ? Math.PI : 0), speed = 2 + launch.power * 3;
      top.body.setLinvel({ x: Math.cos(angle) * speed, y: 0, z: Math.sin(angle) * speed }, true);
      // ponytail: spin energy is an arcade scalar, not angular momentum; replace only after validating realistic tip contact.
      top.energy = .65 + launch.power * .35;
    });
    state.events.push({ type: 'launch' }); return true;
  }
  function step(dt = SETTINGS.timestep) {
    if (state.paused) return;
    if (state.phase === 'countdown') { state.countdown -= dt; if (state.countdown <= 0) start(); return; }
    if (state.phase !== 'battling') return;
    state.time += dt; world.timestep = dt;
    const velocities = state.tops.map(top => top.body.linvel());
    state.tops.forEach(top => {
      top.previousX = top.x; top.previousZ = top.z;
      const radius = Math.hypot(top.x, top.z);
      // Do not pull a top back after it has entered an exit pocket.
      if (radius < 4.8) {
        top.body.resetForces(true);
        top.body.addForce({ x: -top.x * SETTINGS.centerForce - top.z * SETTINGS.orbitForce * top.energy, y: 0, z: -top.z * SETTINGS.centerForce + top.x * SETTINGS.orbitForce * top.energy }, true);
      } else top.body.resetForces(true);
      top.energy = Math.max(0, top.energy - SETTINGS.drain * dt);
      top.rotation += (12 + top.energy * 35) * dt;
    });
    world.step(queue);
    queue.drainCollisionEvents((a, b, started) => {
      if (!started) return;
      const isTop = handle => state.tops.some(top => top.collider.handle === handle);
      if (!isTop(a) || !isTop(b) || state.time - lastImpact < SETTINGS.impactCooldown) return;
      lastImpact = state.time;
      const speed = Math.hypot(velocities[0].x - velocities[1].x, velocities[0].z - velocities[1].z), damage = contactDamage(speed);
      state.tops.forEach(top => { top.energy = Math.max(0, top.energy - damage); });
      state.hits++;
      const p = state.tops[0].body.translation(), q = state.tops[1].body.translation();
      state.events.push({ type: 'impact', x: (p.x + q.x) / 2, z: (p.z + q.z) / 2, strength: clamp(speed / 6) });
    });
    state.tops.forEach(top => { const position = top.body.translation(); top.x = position.x; top.z = position.z; });
    const result = resolveRound(state.tops, state.time);
    if (result) { state.result = result; state.phase = 'finished'; state.events.push({ type: 'finish', ...result }); }
  }
  reset();
  return { state, configureLaunch, start, step, reset, setPaused(value) { state.paused = value; }, events() { return state.events.splice(0); }, dispose() { queue.free(); world.free(); } };
}
