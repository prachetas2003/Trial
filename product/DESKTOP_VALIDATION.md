# Marker-monkey preview validation — 0.4.0

Release: [desktop-preview-5](https://github.com/prachetas2003/Trial/releases/tag/desktop-preview-5)

[Windows workflow run](https://github.com/prachetas2003/Trial/actions/runs/38096696782)
passed fresh dependency installation, 38 core/motion/server checks, and all
8 native desktop checks before packaging and publishing. Global cursor strokes
were tested while Windows click-through remained enabled; a real click reached
the window underneath, and the transparent companion did not take focus.

Local validation passed 38 core/motion/server checks, 16 browser-companion
checks, and 11 marker-monkey playground checks. Browser checks inspect actual
rasterized ink, transparent face interiors, stable texture on identical poses,
white ink on dark screens, 2× pixel resolution, cursor reactions, gestures,
paused positions, resizing, and absence of external asset requests.

Eight native checks passed on an isolated Linux virtual display, including
transparent pixels, stationary native bounds during movement, clicks reaching
an underlying window, cursor reactions, and the enlarged reaching hand.
Linux cursor reaction checks temporarily enable mouse events; Windows must
retain click-through while testing global cursor strokes.

An extreme-pose artwork inspection covered walking phases, both turn
directions, and reaching. Visible ink remained inside the 320 × 370 canvas;
128-pixel travel margins reserve the tail and reaching hand on full-size displays.
Motion follows equivalent trajectories at 30, 60, 120, and 144 Hz within a
1.5-pixel test tolerance. This does not establish achieved frame rates on a
physical PC. Canvas pixel ratio is capped at 2×, and WebGL is not required.

The public ZIP was downloaded back from GitHub. Its SHA-256 matches the
published checksum; archive integrity and the versioned README were verified.
All 16 packaged desktop assets match the checked-in code after normalizing
Windows line endings, including the monkey artwork, renderer, and app icons.
Packaged application version: 0.4.0. Archive size: 163,452,309 bytes.

Published SHA-256: `1584872860841c681dc0076dff549f1afef3e95b6cc0121c8b3fe5efe71f369d`

This is an unsigned Windows 10/11 x64 preview. Physical-PC frame rates,
battery use, and mixed-DPI monitor transitions still need manual profiling.
The browser preview stays within its page.

---

# Earlier 3D desktop preview validation — 0.3.1

Release: [desktop-preview-4](https://github.com/prachetas2003/Trial/releases/tag/desktop-preview-4)

[Windows workflow run](https://github.com/prachetas2003/Trial/actions/runs/38093153606)
passed on GitHub's `windows-latest` runner, with fresh dependency installation,
38 core/motion/server checks and 8 native desktop checks. The native checks
verify genuine WebGL 2 rendering with thousands of triangles, transparent
pixels surrounding the character, stationary native window bounds during
roaming, global cursor strokes while click-through stays enabled, an actual
click reaching the window underneath, live chasing and jumping, and the
articulated reaching gesture. Native JavaScript error checks also passed.

Cloud browser validation passed 16 browser-companion checks and 9 3D
playground checks, including flexible-ear rendering, fractional transforms,
happy pose blending, 3D particles, smooth reaching interruption during petting,
anticipation and landing, motion switches, resizing, and absence of external
asset requests.

The motion model follows equivalent trajectories at 30, 60, 120, and 144 Hz
within a 1.5-pixel test tolerance. That verifies timing independence; it does
not establish achieved frame rates on every physical PC. The graphics canvas
is 320 × 370 CSS pixels, with device-pixel ratio capped at 1.5.

Linux virtual-display native checks passed with an explicit test-only software
graphics backend. Linux cursor reactions were checked with mouse events
temporarily enabled; Windows retained click-through during cursor stroking.
Windows 10/11 x64 is the supported release target. WebGL 2 support is required.

The published ZIP was downloaded back from GitHub and checked for checksum,
archive integrity, versioned README, and packaged source matching the verified
desktop code and local Three.js modules (normalizing Windows line endings).
Archive size: 163,315,284 bytes.

Published SHA-256: `7de6e5b8056eba92989c90c77f04fd894b4c4ad98eae498439f30e3211a57026`

The app is unsigned. Individual physical PCs, graphics drivers, battery
consumption, and mixed-DPI multi-monitor setups still need manual profiling.
The browser playground stays inside its page.

---

## Earlier 0.2.0 preview

Release: [desktop-preview-1](https://github.com/prachetas2003/Trial/releases/tag/desktop-preview-1)

[Windows workflow run](https://github.com/prachetas2003/Trial/actions/runs/38090302825)
completed successfully on GitHub's `windows-latest` runner:

- Fresh `npm ci` with pinned Electron 44.7.0.
- 31 core, motion, bounds, and server tests.
- Native window transparency, shadow/focus settings, and autonomous movement.
- Captured bitmap contained both visible artwork and transparent surroundings.
- Actual global cursor strokes emitted particles while click-through stayed enabled.
- A click through the pet reached a test window underneath without focusing the pet.
- Chasing and hopping produced live renderer frames without JavaScript errors.
- Windows packaging, ZIP creation, artifact upload, and public release upload.

Cloud browser checks passed: 16 companion checks and 6 movement-playground
checks covering roaming, strokes, particles, selection, jumping, motion
switches, transparent hit testing, and viewport resizing. Cloud native tests
also passed, but Linux cursor reactions were checked with mouse events
temporarily enabled; Windows retained click-through during cursor strokes.

The published ZIP was downloaded back from GitHub, checked against its
published SHA-256, and verified for ZIP integrity and expected app/README files.
Its packaged desktop source matched the checked-in source after normalizing
Windows checkout line endings.

File: `Buildlings-Windows-x64.zip` (162,886,475 bytes)

SHA-256: `383f8f1f272b092cc4be85a59d64197d0dea4d107755661c57ae8c65bbd597b2`

The preview is unsigned. Native validation used a hosted Windows runner;
individual Windows 10/11 PCs, graphics drivers, and mixed-DPI monitor setups
have not been manually tested. Linux is not a supported release because
Electron's X11 global cursor cache does not reliably update through ignored
mouse events. The browser preview cannot draw outside its page.
