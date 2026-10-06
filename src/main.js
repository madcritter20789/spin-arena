import './style.css';
import { createBattle, boundAim, clamp, SETTINGS } from './battle.js';
import { createScene } from './scene.js';
import { mountRim } from './effects.js';
import { createSound } from './sound.js';

const $ = id => document.getElementById(id), stage = $('stage'), handle = $('ripcord');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const audio = createSound(), listeners = [];
let battle, scene, rim, raf, closed = false, failed = false, aim = 0, theme = 'premium', pointer = null, pull = 0, keyStarted = null, energy = 0, last = 0, accumulator = 0, lastRim = 0, lastUi = 0;
const on = (element, event, callback, options) => { element.addEventListener(event, callback, options); listeners.push(() => element.removeEventListener(event, callback, options)); };
const ready = () => battle && !failed;
const settingUp = () => ready() && !battle.state.paused && ['setupA', 'setupB'].includes(battle.state.phase);
const charge = () => keyStarted === null ? pull : clamp((performance.now() - keyStarted) / 1000);
function cancelPull() { pointer = null; keyStarted = null; pull = 0; }
function overlay(kicker, title, note, action, type) {
  $('overlay-kicker').textContent = kicker; $('overlay-title').textContent = title; $('overlay-note').textContent = note;
  $('overlay-action').textContent = action || ''; $('overlay-action').hidden = !action; $('overlay-action').dataset.action = type || ''; $('overlay').hidden = false;
}
function failure(message, fatal) {
  $('status').textContent = message;
  if (!fatal) { stage.dataset.shaderFallback = 'true'; return; }
  failed = true; cancelPull(); battle?.setPaused(true); audio.update(0, false, true);
  overlay('A SMALL INTERRUPTION', 'Let’s try that again.', message, 'Retry ↗', 'retry'); sync();
}
function reset() {
  if (!ready()) return;
  cancelPull(); battle.reset($('mode').value); scene.reset(); aim = 0; energy = 0; accumulator = 0; last = 0;
  $('overlay').hidden = true; $('status').textContent = 'Fresh round. Aim coral and pull the ripcord.'; sync();
}
function pause(value) {
  if (!ready()) return;
  cancelPull(); battle.setPaused(value); accumulator = 0; last = 0;
  if (value) overlay('TAKING A BREATHER', 'Hold that thought.', 'Your battle will be right here.', 'Keep playing ↗', 'resume');
  else { $('overlay').hidden = true; if (battle.state.phase === 'finished') showResult(); }
  audio.update(0, false, value); rim?.update(energy, value, motion.matches, theme, battle.state.result?.winner ?? null); sync();
}
function showResult() {
  const result = battle.state.result, winner = result.winner === null ? 'A perfect tie.' : result.winner === 0 ? 'Coral takes the arena.' : 'Teal takes the arena.';
  overlay(result.reason.toUpperCase(), winner, `${battle.state.hits} ${battle.state.hits === 1 ? 'clash' : 'clashes'}. There’s always one more round.`, 'Battle again ↗', 'again');
  $('status').textContent = `${winner} ${result.reason}. ${battle.state.hits} clashes.`;
}
function commitPull() {
  if (!settingUp()) { cancelPull(); return; }
  const power = charge(); cancelPull();
  if (power < .08) { sync(); return; }
  audio.gesture(); audio.event('pull');
  const first = battle.state.phase === 'setupA';
  battle.configureLaunch(aim, power); aim = 0; energy = power;
  $('status').textContent = battle.state.phase === 'setupB' ? `Coral staged at ${Math.round(power * 100)} percent power. Now aim and launch teal.` : `Launch confirmed at ${Math.round(power * 100)} percent power. Both tops launch together.`;
  if (first && battle.state.phase === 'setupB') handle.ariaLabel = 'Pull ripcord to stage teal';
  sync();
}
function aimPointer(event) { if (settingUp() && pointer === null && keyStarted === null) aim = boundAim(scene.aim(event, battle.state.phase === 'setupB' ? 1 : 0)); }
on(stage, 'pointerdown', event => { if (event.button !== 0 || !settingUp()) return; stage.focus({ preventScroll: true }); aimPointer(event); });
on(stage, 'pointermove', aimPointer);
on(handle, 'pointerdown', event => {
  if (!settingUp() || pointer || keyStarted !== null || event.button !== 0) return;
  event.preventDefault(); handle.focus({ preventScroll: true }); handle.setPointerCapture(event.pointerId);
  pointer = { id: event.pointerId, x: event.clientX }; pull = 0; audio.gesture(); audio.event('pull');
});
on(handle, 'pointermove', event => { if (pointer?.id === event.pointerId) pull = clamp((event.clientX - pointer.x) / 140); });
on(handle, 'pointerup', event => { if (pointer?.id === event.pointerId) commitPull(); });
on(handle, 'pointercancel', cancelPull); on(handle, 'lostpointercapture', cancelPull);
function keyboardDown(event) {
  if (!['stage', 'ripcord'].includes(event.target.id)) return;
  if (event.code === 'Escape') { cancelPull(); return; }
  if (event.code === 'Space') { event.preventDefault(); if (settingUp() && !event.repeat && !pointer && keyStarted === null) { keyStarted = performance.now(); audio.gesture(); audio.event('pull'); } }
  if (['ArrowLeft', 'ArrowRight'].includes(event.code)) { event.preventDefault(); if (settingUp() && keyStarted === null) aim = boundAim(aim + (event.code === 'ArrowLeft' ? -.06 : .06)); }
}
on(stage, 'keydown', keyboardDown); on(handle, 'keydown', keyboardDown);
function keyboardUp(event) { if (event.code === 'Space') { event.preventDefault(); if (keyStarted !== null) commitPull(); } }
on(stage, 'keyup', keyboardUp); on(handle, 'keyup', keyboardUp);
on(stage, 'focusout', cancelPull); on(handle, 'blur', cancelPull);
on($('mode'), 'change', reset);
on($('theme'), 'change', () => { theme = $('theme').value; document.body.dataset.theme = theme; scene?.setTheme(theme); rim?.update(energy, battle?.state.paused || false, motion.matches, theme, battle?.state.result?.winner ?? null); });
['angled', 'top'].forEach(view => on($(view), 'click', () => { scene?.setView(view, motion.matches); $('angled').ariaPressed = String(view === 'angled'); $('top').ariaPressed = String(view === 'top'); }));
on($('reset'), 'click', reset); on($('pause'), 'click', () => pause(!battle.state.paused));
on($('overlay-action'), 'click', () => {
  const action = $('overlay-action').dataset.action;
  if (action === 'retry') location.reload();
  if (action === 'again') { reset(); stage.focus(); }
  if (action === 'resume') { pause(false); stage.focus(); }
});
on($('sound'), 'click', async () => { const enabled = await audio.toggle(); $('sound').ariaPressed = String(enabled); $('sound').innerHTML = `<span aria-hidden="true">♪</span> Sound ${enabled ? 'on' : 'off'}`; if (enabled) audio.event('pull'); });
on(window, 'blur', cancelPull);
on(document, 'visibilitychange', () => { cancelPull(); if (document.hidden && ready() && !battle.state.paused) pause(true); last = 0; accumulator = 0; });
on(motion, 'change', () => { if (scene) scene.setView($('top').ariaPressed === 'true' ? 'top' : 'angled', motion.matches); });

function sync() {
  const state = battle?.state, power = charge(), setup = settingUp();
  handle.disabled = !setup; $('reset').disabled = !ready(); $('pause').disabled = !ready(); $('mode').disabled = !ready() || ['countdown', 'battling'].includes(state?.phase);
  $('pause').ariaPressed = String(state?.paused || false); $('pause').innerHTML = state?.paused ? '<span aria-hidden="true">▷</span> Resume' : '<span aria-hidden="true">Ⅱ</span> Pause';
  handle.style.transform = `translateX(${power * 140}px)`;
  $('charge-meter').firstElementChild.style.transform = `scaleX(${power})`; $('charge-meter').setAttribute('aria-valuenow', String(Math.round(power * 100))); $('pull-value').textContent = `${Math.round(power * 100)}% POWER`;
  const teal = state?.phase === 'setupB';
  $('dock-label').textContent = teal ? 'SECOND LAUNCH / TEAL' : 'YOUR LAUNCH / CORAL';
  handle.style.background = teal ? 'var(--teal)' : 'var(--coral)';
  handle.ariaLabel = `Pull ripcord to ${state?.mode === 'both' ? 'stage' : 'launch'} ${teal ? 'teal' : 'coral'}`;
  $('top-b-label').textContent = `02 / TEAL${state?.mode === 'cpu' ? ' · CPU' : ''}`;
  if (state) {
    const labels = { setupA: 'AIM CORAL. PULL THE RIPCORD.', setupB: 'CORAL IS STAGED. YOUR TURN, TEAL.', countdown: '3, 2, 1… LET IT RIP.', battling: 'A LITTLE MOMENTUM. A LITTLE MAYHEM.', finished: state.result?.reason.toUpperCase() };
    $('phase-label').textContent = state.paused ? 'PAUSED. MOMENTUM SAVED.' : labels[state.phase];
    $('round-label').textContent = state.phase === 'battling' ? `${Math.max(0, 20 - state.time).toFixed(1)}s / SPIN REMAINING` : state.phase === 'setupB' ? 'CORAL STAGED / TEAL UP NEXT' : 'READY FOR A LITTLE RIVALRY';
    $('hit-label').textContent = `${String(state.hits).padStart(2, '0')} CLASHES`;
    state.tops.forEach((top, index) => {
      const letter = index ? 'b' : 'a', percent = Math.round(top.energy * 100), staged = !!state.launches[index] && ['setupA', 'setupB', 'countdown'].includes(state.phase);
      $('spin-' + letter).textContent = ['setupA', 'setupB'].includes(state.phase) ? staged ? 'STAGED' : 'READY' : `${percent}%`;
      $('meter-' + letter).setAttribute('aria-valuenow', String(percent)); $('meter-' + letter).firstElementChild.style.transform = `scaleX(${top.energy})`;
    });
    $('instructions').textContent = state.paused ? 'Momentum saved. Resume when you’re ready.' : state.phase === 'battling' ? 'Two tops. One arena. Enjoy the happy collisions.' : state.phase === 'countdown' ? 'Both launch settings are locked. Here we go.' : state.phase === 'finished' ? 'One more round? Pull a fresh start.' : 'Aim in the arena. Pull right. Let it rip.';
  }
  stage.style.setProperty('--energy', Math.max(power, energy).toFixed(2));
}
function frame(timestamp) {
  if (closed) return;
  const dt = last ? Math.min((timestamp - last) / 1000, .05) : 0; last = timestamp;
  if (ready()) {
    const state = battle.state;
    if (!state.paused && !document.hidden) {
      accumulator = Math.min(.05, accumulator + dt);
      while (accumulator >= SETTINGS.timestep) { battle.step(); accumulator -= SETTINGS.timestep; }
      energy = Math.max(0, energy - dt * 1.5);
    }
    for (const event of battle.events()) {
      if (event.type === 'launch') { energy = 1; audio.event('launch'); }
      if (event.type === 'impact') { energy = Math.max(.6, energy); scene.impact(event, state.time, motion.matches); audio.event('impact'); }
      if (event.type === 'finish') { energy = .75; audio.event('finish'); showResult(); }
    }
    const winner = state.result?.winner ?? null;
    scene.render(state, state.paused ? 1 : accumulator / SETTINGS.timestep, charge(), aim, dt, motion.matches);
    audio.update((state.tops[0].energy + state.tops[1].energy) / 2, state.phase === 'battling', state.paused || document.hidden);
    if (timestamp - lastRim >= 1000 / 30) { rim?.update(Math.max(charge(), energy), state.paused || document.hidden, motion.matches, theme, winner); lastRim = timestamp; }
  }
  if (timestamp - lastUi >= 1000 / 30) { sync(); lastUi = timestamp; }
  raf = requestAnimationFrame(frame);
}
async function initialize() {
  try {
    scene = createScene($('scene'), failure); scene.setTheme(theme);
    battle = await createBattle(); battle.reset($('mode').value);
    if (closed) { battle.dispose(); scene.dispose(); return; }
    mountRim($('paper-rim')).then(result => { if (closed) result.dispose(); else rim = result; });
    $('overlay').hidden = true; sync(); raf = requestAnimationFrame(frame);
  } catch (error) { failure('The 3D arena could not start. Check WebGL support and retry.', true); }
}
function dispose() { closed = true; cancelAnimationFrame(raf); listeners.forEach(remove => remove()); scene?.dispose(); rim?.dispose(); battle?.dispose(); audio.dispose(); }
on(window, 'pagehide', event => { if (!event.persisted) dispose(); else { cancelPull(); if (ready()) pause(true); } });
if (import.meta.hot) import.meta.hot.dispose(dispose);
void initialize();
