# Spin Arena

[Play](https://madcritter20789.github.io/spin-arena/) · [Source](https://github.com/madcritter20789/spin-arena)

Two original sculpted tops, one stadium, and a tactile ripcord. Aim in the arena, pull right, and release. Play versus the CPU or stage both launches yourself. Coral and teal share the same simulation. Choose Premium Toy or Retro Plastic, angled or top camera, and optional synthesized sound (off initially).

## Run

Node 24 is used for development and CI. Dependencies and lockfile are pinned.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Arrow keys aim while the arena or ripcord is focused. Hold Space to pull; release to commit. Escape, returning the handle to its start, pointer cancellation, and losing focus cancel. Pause preserves the round; Reset resumes with fresh tops. Hiding the tab pauses and cancels an unfinished pull.

## Implementation

Vanilla JavaScript, Three.js 0.186.1, Rapier 0.21.0, Paper Shaders 0.0.81, and Vite 8.3.3. Geometry is procedural; no downloaded models or image assets. `src/battle.js` owns rules and Rapier collisions, `src/scene.js` owns geometry/rendering, and `src/main.js` owns input and UI. Native Web Audio supplies quiet synthetic effects.

This is an arcade toy: upright cylinder bodies, separate spin energy, and center/orbit forces. It does not simulate gyroscopic motion. Tuning constants are together in `SETTINGS`. Physics runs at 120 Hz with a 50 ms accumulator cap and interpolated display transforms. Contact starts drain bounded spin energy. Both eliminations are resolved together; rounds end by spin-out, pocket ring-out, or remaining spin at 20 seconds.

The custom Three.js floor shader draws radial markings, charge feedback, top halos, and four bounded collision rings. Paper's separate `PulsingBorder` renderer provides a reactive presentation rim, with decoded noise and complete sizing uniforms. Its updates are limited to 30 Hz, animation stops at rest/pause, and its resolution is capped at 400,000 pixels. Three.js caps DPR at 1.5 and resolution at 1.5 million pixels; particles are pooled at 32. Reduced motion removes decorative wobble, rings, particles, and camera animation. Resource disposal covers renderers, meshes, observers, listeners, audio, and physics.

Paper failure uses CSS feedback while retaining the floor shader. Custom shader compilation failure is reported and uses basic materials; that fallback does not satisfy the full shader criterion. WebGL/physics initialization failure or 3D context loss displays Retry.

## Verification — October 6, 2026

- `npm test` passes with the real Rapier WASM module: charge/aim bounds, staged launches, opposing directions, collision reversal, bounded damage, spin-out, ring-out, simultaneous elimination, timeout, pause, reset.
- Production build passes. Rapier's bundled WASM makes the main bundle approximately 5 MB / 1.85 MB gzip; the build reports a size advisory.
- Tested Windows Codex in-app Chromium: actual mouse ripcord drag, CPU launch, and both shader paths. Browser integration checks exercised keyboard staging of both tops, Escape/blur cancellation, synthetic touch-pointer cancellation and outside-track release, pause, theme/camera preservation, reset, ten repeated resets without additional canvases, hidden-tab pause, and context-loss Retry.
- Desktop battle RAF intervals: median 8.4 ms, 95th percentile 16.9 ms over 180 frames. These are observed frame intervals, not a GPU benchmark or guarantee on other hardware.
- A 320-pixel browser viewport passed overflow and 44-pixel target checks. Injected reduced-motion preference and failed texture decoding passed the same interaction checks. Reduced-motion/fallback run: median 8.3 ms, 95th percentile 8.5 ms. This is viewport emulation, not physical mobile-device performance.
- Physical phones, Safari, audible sound balance, exhaustive GPU-resource counts, and hardware-specific shader compilation failures remain unverified. Touch checks used synthetic PointerEvents; actual touch hardware remains to be tested.

GitHub Pages CI runs the assertion check and build before publication. `vercel.json` retains the static deployment configuration; GitHub Pages is used because the previous Vercel team deployment reached its fair-use limit.

## Submission note

Spin Arena turns a familiar spinning-top battle into a small tactile web toy. The ripcord makes launch power tangible, while two responsive shader layers make each clash visible. Shared original geometry, two considered material palettes, and a bounded arcade simulation keep the scope compact. The source and live build are reproducible without a backend. The suggested six-hour budget is a target, not a claim of measured completion time; the assignment's 72-hour start time was unspecified.

## Next explorations

A longer polish pass (approximately 10–12 hours total effort) can refine molded seams, pockets, lighting, contact effects, sound balance, restrained trails, and a separate inspection view using OrbitControls. First test physical phones and Safari, then tune quality from measurements. Keep two modes and the existing rules.

Experimental realistic physics belongs on a separate branch, starting with one top: unlocked translation/rotation, gravity, a concave stadium, compound tip/body colliders, calibrated mass/inertia/center of mass, real angular velocity, contact friction, and damping. Compare tilted launches, precession, wobble, slowdown, and settling with recorded physical references. Sweep timestep and solver/contact settings before adding the second top. Promote it only after repeatable stability and collision validation; this arcade version remains the submission.

## Licenses

Paper Shaders license and attribution notices are preserved in `public/PAPER-SHADERS-LICENSE.txt` and `public/PAPER-SHADERS-NOTICE.txt`. Three.js and Rapier retain their MIT/Apache-2.0 dependency notices in their installed packages. Original designs use the public name Spin Arena and no branded assets.
