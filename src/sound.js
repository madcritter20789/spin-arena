export function createSound() {
  let context, enabled = false, hum, gain, lastTick = -1, disposed = false;
  async function activate() {
    if (disposed) return false;
    try {
      context ??= new AudioContext();
      if (!hum) { hum = context.createOscillator(); gain = context.createGain(); hum.type = 'sine'; gain.gain.value = 0; hum.frequency.value = 70; hum.connect(gain).connect(context.destination); hum.start(); }
      await context.resume(); return true;
    } catch { enabled = false; return false; }
  }
  function tone(frequency, duration, volume) {
    if (!enabled || !context || context.state !== 'running') return;
    const oscillator = context.createOscillator(), envelope = context.createGain(), now = context.currentTime;
    oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(frequency, now); oscillator.frequency.exponentialRampToValueAtTime(frequency * .4, now + duration);
    envelope.gain.setValueAtTime(volume, now); envelope.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(envelope).connect(context.destination); oscillator.start(); oscillator.stop(now + duration);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }
  return {
    async toggle() { enabled = !enabled; if (enabled && !await activate()) enabled = false; if (!enabled) { if (gain) gain.gain.value = 0; await context?.suspend(); } return enabled; },
    enabled: () => enabled,
    gesture() { if (enabled) void activate(); },
    event(type) {
      if (type === 'pull') tone(480, .04, .025);
      if (type === 'launch') tone(220, .18, .06);
      if (type === 'impact' && context && context.currentTime - lastTick > .08) { lastTick = context.currentTime; tone(720, .07, .035); }
      if (type === 'finish') tone(360, .25, .035);
    },
    update(spin, active, paused) {
      if (!context || !enabled || disposed) return;
      if (paused) { if (gain) gain.gain.value = 0; if (context.state === 'running') void context.suspend(); return; }
      if (active && context.state === 'suspended') void context.resume().catch(() => {});
      hum.frequency.setTargetAtTime(55 + spin * 60, context.currentTime, .12); gain.gain.setTargetAtTime(active ? .012 * spin : 0, context.currentTime, .08);
    },
    dispose() { disposed = true; if (hum) { hum.stop(); hum.disconnect(); gain.disconnect(); } void context?.close(); },
  };
}
