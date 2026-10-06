# Spin Arena

[Play](https://madcritter20789.github.io/spin-arena/) · [Source](https://github.com/madcritter20789/spin-arena)

Two original sculpted tops, one stadium, and a tactile ripcord. Aim in the arena or use the direction slider. Pull right and release, or hold the launch button and release. Play versus the CPU or stage both launches yourself. Coral and teal share the same simulation. Choose Premium Toy or Retro Plastic, angled or top camera, and optional synthesized sound (off initially).

## Technologies used

| Technology | Version | What it does in this project |
|---|---|---|
| HTML and CSS | Native browser features | Page structure, responsive layout, mobile controls, focus styles, spin meters, and theme colors. |
| JavaScript | ES modules | Connects input, game rules, rendering, sound, and the user interface. No React or UI framework is required. |
| Three.js | `0.186.1` | Renders the 3D stadium and tops, lights, shadows, camera views, particles, and custom materials. Raycasting converts a tap or pointer position into a launch direction. |
| `@dimforge/rapier3d-compat` | `0.21.0` | Runs the collision simulation using its bundled WebAssembly module. Handles top-to-top contact, stadium walls, bouncing, damping, and continuous collision detection. |
| `@paper-design/shaders` | `0.0.81` | Renders the dithered page background, gradient arena backdrop, and reactive arena border using WebGL shaders. The cloned repository supplied the integration reference. |
| Vite | `8.3.3` | Provides the development server, hot reload, production bundling, and local production preview. |
| Web Audio API | Native browser feature | Generates launch sounds, collision ticks, and a quiet spin hum without downloaded audio files. Sound starts muted. |
| Node.js | `24` in CI | Runs development tooling and the assertion-based physics checks. |
| GitHub Actions and Pages | Repository workflow | Installs dependencies, runs tests, builds the app, and publishes the static website. |

Exact package versions are recorded in `package.json` and `package-lock.json`. The application runs entirely in the browser: no backend, database, login, or external game API is needed.

## Run

Node 24 is used for development and CI. Dependencies and lockfile are pinned.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Run these commands from the `beyblade-battle` directory. `npm ci` installs the locked dependencies. The development server is at `http://127.0.0.1:5174/`; the production preview is at `http://127.0.0.1:4174/`. The build creates the static website in `dist/`. `npm test` runs the real Rapier physics and battle-rule checks.

## How to play

1. Select **Versus CPU** or **Launch both**.
2. Tap the arena, move the pointer, or adjust the **Direction** slider to aim.
3. Drag the ripcord right and release, or hold **Hold to launch** and release. More pull or hold time gives more power.
4. In **Launch both**, configure coral first, then teal. Both tops launch together after the second launch is staged. In CPU mode, the opponent chooses its launch settings automatically.
5. The round ends when a top loses its spin, exits through a pocket, or the 20-second limit is reached. Select **Battle again** to replay.

Arrow keys aim while the arena, ripcord, or hold button is focused. Hold Space to pull; release to commit. The hold button also supports Enter. Escape, returning the ripcord to its start, pointer cancellation, and losing focus cancel. Pause preserves the round; Reset resumes with fresh tops. Hiding the tab pauses and cancels an unfinished pull.

## Implementation

Vanilla JavaScript, Three.js 0.186.1, Rapier 0.21.0, Paper Shaders 0.0.81, and Vite 8.3.3. Geometry is procedural; no downloaded models or image assets. `src/battle.js` owns rules and Rapier collisions, `src/scene.js` owns geometry/rendering, and `src/main.js` owns input and UI. Native Web Audio supplies quiet synthetic effects.

### 3D models and materials

The tops are built in code from cylinders, cones, torus rings, and six repeated extruded blade shapes. Both use shared geometry, with coral and teal accents. The stadium combines a circular floor, molded rails, and two exit pockets. A hemisphere light and a directional light provide lighting and shadows.

Premium Toy and Retro Plastic reuse the same scene. Switching themes updates material colors, lighting, CSS, and shader palettes without restarting the round. Camera buttons choose an angled or top-down view.

### Battle physics

This is an arcade toy: upright cylinder bodies, separate spin energy, and center/orbit forces. It does not simulate gyroscopic motion. Tuning constants are together in `SETTINGS`. Physics runs at 120 Hz with a 50 ms accumulator cap and interpolated display transforms. Contact starts drain bounded spin energy. Both eliminations are resolved together; rounds end by spin-out, pocket ring-out, or remaining spin at 20 seconds.

The CPU selects its initial aim and power only. After launch, both tops use the same simulation. Physical body rotation is locked; the visible spinning and low-energy wobble are driven separately by the remaining spin energy.

### Shader effects

The custom Three.js floor shader draws radial markings, charge feedback, top halos, and four bounded collision rings. Tops use `MeshToonMaterial` with a generated three-band nearest-filtered gradient and shared edge outlines. The stadium uses clear-coated `MeshPhysicalMaterial` for molded plastic highlights.

| Effect | How it is made | Visible purpose |
|---|---|---|
| Dithered background | Paper **Dithering** | Gives the page a subtle printed, retro texture. |
| Arena backdrop | Paper **MeshGradient** | Adds soft blended colors behind the stadium and responds to interaction. |
| Reactive border | Paper **PulsingBorder** | Responds to launch power, collisions, and the winner's color. |
| Stadium markings and energy | Three.js `ShaderMaterial` with custom GLSL | Draws radial lines, power feedback, energy halos, and expanding impact rings. |
| Toon-shaded tops | Three.js `MeshToonMaterial` with a generated gradient texture | Produces distinct light/shadow bands for a stylized toy appearance. |
| Glossy plastic stadium | Three.js `MeshPhysicalMaterial` | Adds clear-coat highlights to the molded housing and floor. |

Paper's separate renderers now provide three effects: a static **Dithering** page background (300,000 pixels), a reactive **MeshGradient** arena backdrop (250,000 pixels), and **PulsingBorder** feedback (400,000 pixels). Uniforms and sizing follow the cloned library's presets. The rim uses decoded noise. Updates are limited to 30 Hz; decorative animation stops at rest, pause, and reduced motion. Three.js caps DPR at 1.5 and resolution at 1.5 million pixels; particles are pooled at 32. Reduced motion also removes decorative wobble, rings, particles, and camera animation. Resource disposal covers renderers, gradient textures, meshes, observers, listeners, audio, and physics.

### Responsive controls and fallback

Desktop keeps launch controls beside the arena. Phones use a stacked layout, larger ripcord targets, full-width hold controls, and a fixed safe-area-aware utility bar. Mobile launch scrolls the battle into view and hides inactive setup controls until replay. The direction slider and both launch methods share the same rules and cancellation paths.

Paper failure uses CSS feedback while retaining the floor shader. Custom shader compilation failure is reported and uses basic materials; that fallback does not satisfy the full shader criterion. WebGL/physics initialization failure or 3D context loss displays Retry.

## Project files

| File | Responsibility |
|---|---|
| `index.html` | Page structure, labels, controls, and accessible status/result elements. |
| `src/main.js` | Input handling, UI state, launch flow, pause/reset, and the main animation loop. |
| `src/battle.js` | Rapier world, colliders, launch parameters, spin energy, collisions, and finish rules. |
| `src/scene.js` | Three.js renderer, procedural geometry, materials, lighting, cameras, and particles. |
| `src/effects.js` | Theme palettes, custom floor GLSL, and the three Paper shader integrations. |
| `src/sound.js` | Synthesized sound effects, audio activation, muting, and cleanup. |
| `src/style.css` | Desktop/mobile layouts, visual styling, focus states, and reduced-motion styles. |
| `test.mjs` | Runnable Node assertions using the real Rapier module. |
| `checks/browser.html` | Browser interaction, responsive layout, shader, fallback, and timing checks. |
| `.github/workflows/pages.yml` | Tests, production build, and GitHub Pages deployment. |
| `vercel.json` | Alternative static deployment configuration. |
| `.gitignore` and `.gitattributes` | Exclude local/generated files and the disc launcher; standardize text line endings. |
| `public/` | Preserved Paper Shaders license and attribution notices. |

## Verification — October 6, 2026

The UI/shader update adds a repeatable browser check at `http://127.0.0.1:5174/checks/browser.html` after `npm run dev`. Append `?width=320&reduced&fallback` for the smallest layout, injected reduced motion, and a forced Paper-rim texture failure. These are test-only browser scenarios; the main toy contains no test controls. The harness is not part of the production build.

- Updated desktop check passed: all three Paper shader canvases, custom floor shader, aim slider, hold-button launch/cancellation, both modes, touch-pointer cancellation/outside release, pause, theme/camera preservation, reset, bounded canvas count, hidden-tab pause, and Retry. Updated desktop RAF intervals: median 8.3 ms / p95 8.4 ms over 180 frames on in-app Chromium.
- Updated 320-pixel iframe viewport with reduced motion and forced rim failure passed the same checks, including overflow and 44-pixel targets. Frame intervals: median 8.3 ms / p95 8.5 ms. This is browser emulation, not a physical-phone measurement.
- Actual mouse interaction in a 390 × 844 emulated browser viewport verified the larger hold/release button, automatic battle framing, and fixed Pause control. This remains desktop browser input, not physical touch hardware.

- `npm test` passes with the real Rapier WASM module: charge/aim bounds, staged launches, opposing directions, collision reversal, bounded damage, spin-out, ring-out, simultaneous elimination, timeout, pause, reset.
- Production build passes. Rapier's bundled WASM makes the main bundle approximately 5 MB / 1.85 MB gzip; the build reports a size advisory.
- GitHub Pages CI passed installation, tests, build, and deployment. The live URL loaded without application warnings/errors; both shader paths were active. Actual live ripcord drags staged coral then launched teal at 64% power; pause, theme and camera changes preserved the round. Production preview also produced a ring-out result and replay control.
- Tested Windows Codex in-app Chromium: actual mouse ripcord drag, CPU launch, and both shader paths. Browser integration checks exercised keyboard staging of both tops, Escape/blur cancellation, synthetic touch-pointer cancellation and outside-track release, pause, theme/camera preservation, reset, ten repeated resets without additional canvases, hidden-tab pause, and context-loss Retry.
- Desktop battle RAF intervals: median 8.4 ms, 95th percentile 16.9 ms over 180 frames. These are observed frame intervals, not a GPU benchmark or guarantee on other hardware.
- A 320-pixel browser viewport passed overflow and 44-pixel target checks. Injected reduced-motion preference and failed texture decoding passed the same interaction checks. Reduced-motion/fallback run: median 8.3 ms, 95th percentile 8.5 ms. This is viewport emulation, not physical mobile-device performance.
- Physical phones, Safari, audible sound balance, exhaustive GPU-resource counts, and hardware-specific shader compilation failures remain unverified. Touch checks used synthetic PointerEvents; actual touch hardware remains to be tested.

GitHub Pages CI runs the assertion check and build before publication. `vercel.json` retains the static deployment configuration; GitHub Pages is used because the previous Vercel team deployment reached its fair-use limit.

## Submission note

Spin Arena turns a familiar spinning-top battle into a small tactile web toy. The ripcord makes launch power tangible, while Paper presentation shaders and Three.js material effects make the arena responsive and expressive. Shared original geometry, two considered material palettes, and a bounded arcade simulation keep the scope compact. The source and live build are reproducible without a backend. The suggested six-hour budget is a target, not a claim of measured completion time; the assignment's 72-hour start time was unspecified.

## Next explorations

A longer polish pass (approximately 10–12 hours total effort) can refine molded seams, pockets, lighting, contact effects, sound balance, restrained trails, and a separate inspection view using OrbitControls. First test physical phones and Safari, then tune quality from measurements. Keep two modes and the existing rules.

Experimental realistic physics belongs on a separate branch, starting with one top: unlocked translation/rotation, gravity, a concave stadium, compound tip/body colliders, calibrated mass/inertia/center of mass, real angular velocity, contact friction, and damping. Compare tilted launches, precession, wobble, slowdown, and settling with recorded physical references. Sweep timestep and solver/contact settings before adding the second top. Promote it only after repeatable stability and collision validation; this arcade version remains the submission.

## Licenses

Paper Shaders license and attribution notices are preserved in `public/PAPER-SHADERS-LICENSE.txt` and `public/PAPER-SHADERS-NOTICE.txt`. Three.js and Rapier retain their MIT/Apache-2.0 dependency notices in their installed packages. Original designs use the public name Spin Arena and no branded assets.
