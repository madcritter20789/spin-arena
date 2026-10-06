import './style.css';
import { createBattle, boundAim, clamp, SETTINGS } from './battle.js';
import { createScene } from './scene.js';
import { mountRim, mountAtmosphere } from './effects.js';
import { createSound } from './sound.js';

const $ = id => document.getElementById(id), stage = $('stage'), handle = $('ripcord');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const audio = createSound(), listeners = [];
let battle, scene, rim, atmosphere, raf, closed = false, failed = false, aim = 0, theme = 'premium', pointer = null, holdPointer = null, pull = 0, keyStarted = null, energy = 0, last = 0, accumulator = 0, lastRim = 0, lastUi = 0;
const on = (element, event, callback, options) => { element.addEventListener(event, callback, options); listeners.push(() => element.removeEventListener(event, callback, options)); };
const ready = () => battle && !failed;
const settingUp = () => ready() && !battle.state.paused && ['setupA', 'setupB'].includes(battle.state.phase);
const charge = () => keyStarted === null ? pull : clamp((performance.now() - keyStarted) / 1000);
function cancelPull() { pointer = null; holdPointer = null; keyStarted = null; pull = 0; }
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
  const explanation = { 'Spin-out': 'A top ran out of spin.', 'Ring-out': 'A top left through an exit pocket.', 'Spin remaining': 'Time’s up. Remaining spin decides the round.' }[result.reason] || 'Both tops reached the finish together.';
  overlay(result.reason.toUpperCase(), winner, `${explanation} ${battle.state.hits} ${battle.state.hits === 1 ? 'clash' : 'clashes'}.`, 'Battle again ↗', 'again');
  if ([document.body, stage, handle, hold].includes(document.activeElement)) $('overlay-action').focus({ preventScroll: true });
  $('status').textContent = `${winner} ${result.reason}. ${battle.state.hits} ${battle.state.hits === 1 ? 'clash' : 'clashes'}.`;
}
function commitPull() {
  if (!settingUp()) { cancelPull(); return; }
  const power = charge(); cancelPull();
  if (power < .08) { $('status').textContent = 'Launch cancelled. Hold a little longer or pull the ripcord farther.'; sync(); return; }
  audio.gesture(); audio.event('pull');
  const first = battle.state.phase === 'setupA';
  battle.configureLaunch(aim, power); aim = 0; energy = power;
  if (battle.state.phase === 'countdown' && matchMedia('(max-width: 700px)').matches) stage.scrollIntoView({ block: 'center', behavior: motion.matches ? 'instant' : 'smooth' });
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
const hold = $('hold-launch');
on(hold, 'pointerdown', event => {
  if (!settingUp() || pointer || keyStarted !== null || event.button !== 0) return;
  event.preventDefault(); hold.focus({ preventScroll: true }); hold.setPointerCapture(event.pointerId);
  holdPointer = event.pointerId; keyStarted = performance.now(); audio.gesture(); audio.event('pull');
});
on(hold, 'pointerup', event => { if (holdPointer === event.pointerId) commitPull(); });
on(hold, 'pointercancel', cancelPull); on(hold, 'lostpointercapture', cancelPull); on(hold, 'blur', cancelPull);
on($('aim'), 'input', () => { if (settingUp()) aim = boundAim(Number($('aim').value) * Math.PI / 180); });
function keyboardDown(event) {
  if (!['stage', 'ripcord', 'hold-launch'].includes(event.target.id)) return;
  if (event.code === 'Escape') { cancelPull(); return; }
  if (event.code === 'Space' || (event.code === 'Enter' && event.target === hold)) { event.preventDefault(); if (settingUp() && !event.repeat && !pointer && keyStarted === null) { keyStarted = performance.now(); audio.gesture(); audio.event('pull'); } }
  if (['ArrowLeft', 'ArrowRight'].includes(event.code)) { event.preventDefault(); if (settingUp() && keyStarted === null) aim = boundAim(aim + (event.code === 'ArrowLeft' ? -.06 : .06)); }
}
on(stage, 'keydown', keyboardDown); on(handle, 'keydown', keyboardDown); on(hold, 'keydown', keyboardDown);
function keyboardUp(event) { if (event.code === 'Space' || (event.code === 'Enter' && event.target === hold)) { event.preventDefault(); if (keyStarted !== null && holdPointer === null) commitPull(); } }
on(stage, 'keyup', keyboardUp); on(handle, 'keyup', keyboardUp); on(hold, 'keyup', keyboardUp);
on(stage, 'focusout', cancelPull); on(handle, 'blur', cancelPull);
on($('mode'), 'change', reset);
['design-a', 'design-b'].forEach((id, index) => on($(id), 'change', () => {
  if (!settingUp() || battle.state.launches[index]) return;
  cancelPull(); scene.setDesign(index, $(id).value);
  $('status').textContent = `${index ? 'Teal' : 'Coral'} design changed to ${$(id).selectedOptions[0].textContent}.`;
}));
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
  hold.disabled = !setup; $('aim').disabled = !setup || pointer !== null || keyStarted !== null;
  ['design-a', 'design-b'].forEach((id, index) => { $(id).disabled = !setup || !!state?.launches[index]; });
  $('aim').value = String(Math.round(aim * 180 / Math.PI)); $('aim-value').textContent = `${Math.round(aim * 180 / Math.PI)}°`;
  stage.dataset.phase = state?.phase || 'loading';
  $('pause').ariaPressed = String(state?.paused || false); $('pause').innerHTML = state?.paused ? '<span aria-hidden="true">▷</span> Resume' : '<span aria-hidden="true">Ⅱ</span> Pause';
  handle.style.transform = `translateX(${power * 140}px)`;
  $('charge-meter').firstElementChild.style.transform = `scaleX(${power})`; $('charge-meter').setAttribute('aria-valuenow', String(Math.round(power * 100))); $('pull-value').textContent = `${Math.round(power * 100)}%`;
  hold.classList.toggle('charging', keyStarted !== null);
  hold.style.setProperty('--charge', power.toFixed(2));
  const teal = state?.phase === 'setupB';
  document.querySelector('.launch-dock').dataset.top = teal ? 'teal' : 'coral';
  document.querySelector('.play-steps').style.setProperty('--active', teal ? 'var(--teal)' : 'var(--coral)');
  $('dock-label').textContent = teal ? 'SECOND LAUNCH / TEAL' : 'YOUR LAUNCH / CORAL';
  handle.style.background = teal ? 'var(--teal)' : 'var(--coral)';
  hold.style.setProperty('--launch-color', teal ? 'var(--teal)' : 'var(--coral)');
  hold.firstChild.textContent = `Hold to ${state?.mode === 'both' ? 'stage' : 'launch'}`;
  handle.ariaLabel = `Pull ripcord to ${state?.mode === 'both' ? 'stage' : 'launch'} ${teal ? 'teal' : 'coral'}`;
  $('top-b-label').textContent = `02 / TEAL${state?.mode === 'cpu' ? ' · CPU' : ''}`;
  if (state) {
    const labels = { setupA: 'Aim coral to begin', setupB: 'Coral staged · aim teal', countdown: 'Ready… let it rip!', battling: 'Last top spinning wins', finished: state.result?.reason };
    $('phase-label').textContent = state.paused ? 'PAUSED. MOMENTUM SAVED.' : labels[state.phase];
    $('round-label').textContent = state.phase === 'battling' ? `${Math.max(0, 20 - state.time).toFixed(1)}s / SPIN REMAINING` : state.paused ? 'Round paused' : state.phase === 'setupB' ? 'Coral staged · teal next' : state.phase === 'finished' ? 'Round complete' : 'Ready to launch';
    const activeStep = state.phase === 'setupA' ? 0 : state.phase === 'setupB' ? 1 : 2;
    ['step-a', 'step-b', 'step-battle'].forEach((id, index) => {
      $(id).classList.toggle('complete', index < activeStep);
      if (index === activeStep) $(id).setAttribute('aria-current', 'step'); else $(id).removeAttribute('aria-current');
    });
    $('step-b').lastElementChild.textContent = state.mode === 'cpu' ? 'CPU is ready' : 'Prepare teal';
    $('dock-title').textContent = state.paused ? 'Take your time.' : state.phase === 'battling' ? 'Let them battle.' : state.phase === 'countdown' ? 'Here we go!' : state.phase === 'finished' ? 'One more round?' : teal ? 'Teal, you’re up.' : 'Make your move.';
    $('mode-hint').textContent = state.phase === 'finished' ? 'Use Battle again in the arena to replay.' : state.phase === 'battling' ? 'Spin-out or ring-out ends the round.' : state.mode === 'cpu' ? 'The CPU launches with you.' : teal ? `Coral is staged at ${Math.round(state.launches[0].power * 100)}% power.` : 'Stage coral first, then prepare teal.';
    $('power-hint').textContent = power >= .99 ? 'Full power! Release when ready.' : power >= .08 ? `Release to ${state.mode === 'both' ? 'stage' : 'launch'} at ${Math.round(power * 100)}% power.` : 'Hold for power. Release to launch.';
    $('hit-label').textContent = `${String(state.hits).padStart(2, '0')} CLASHES`;
    state.tops.forEach((top, index) => {
      const letter = index ? 'b' : 'a', percent = Math.round(top.energy * 100), staged = !!state.launches[index] && ['setupA', 'setupB', 'countdown'].includes(state.phase);
      $('spin-' + letter).textContent = ['setupA', 'setupB'].includes(state.phase) ? staged ? 'STAGED' : 'READY' : `${percent}%`;
      $('meter-' + letter).setAttribute('aria-valuenow', String(percent)); $('meter-' + letter).firstElementChild.style.transform = `scaleX(${top.energy})`;
    });
    $('instructions').textContent = state.paused ? 'Momentum saved. Resume when you’re ready.' : state.phase === 'battling' ? 'Watch the clash. Last top spinning wins.' : state.phase === 'countdown' ? 'Both tops are ready. Let it rip!' : state.phase === 'finished' ? 'Ready for a rematch? Battle again.' : teal ? 'Set teal’s direction, then hold to stage.' : 'Tap the arena or use the slider to aim.';
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
    if (timestamp - lastRim >= 1000 / 30) { rim?.update(Math.max(charge(), energy), state.paused || document.hidden, motion.matches, theme, winner); atmosphere?.update(Math.max(charge(), energy), state.paused || document.hidden, motion.matches, theme); lastRim = timestamp; }
  }
  if (timestamp - lastUi >= 1000 / 30) { sync(); lastUi = timestamp; }
  raf = requestAnimationFrame(frame);
}
async function initialize() {
  try {
    scene = createScene($('scene'), failure); scene.setTheme(theme);
    scene.setDesign(0, $('design-a').value); scene.setDesign(1, $('design-b').value);
    atmosphere = mountAtmosphere($('paper-background'), $('paper-surface'));
    battle = await createBattle(); battle.reset($('mode').value);
    if (closed) { battle.dispose(); scene.dispose(); return; }
    mountRim($('paper-rim')).then(result => { if (closed) result.dispose(); else rim = result; });
    $('overlay').hidden = true; sync(); raf = requestAnimationFrame(frame);
  } catch (error) { failure('The 3D arena could not start. Check WebGL support and retry.', true); }
}
function dispose() { closed = true; cancelAnimationFrame(raf); listeners.forEach(remove => remove()); scene?.dispose(); rim?.dispose(); atmosphere?.dispose(); battle?.dispose(); audio.dispose(); }
on(window, 'pagehide', event => { if (!event.persisted) dispose(); else { cancelPull(); if (ready()) pause(true); } });
if (import.meta.hot) import.meta.hot.dispose(dispose);
void initialize();
