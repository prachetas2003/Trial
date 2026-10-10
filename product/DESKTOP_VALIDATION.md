# 3D desktop preview validation — 0.3.0

Release: [desktop-preview-3](https://github.com/prachetas2003/Trial/releases/tag/desktop-preview-3)

[Windows workflow run](https://github.com/prachetas2003/Trial/actions/runs/38092827778)
passed on GitHub's `windows-latest` runner, with fresh dependency installation,
38 core/motion/server checks and 8 native desktop checks. The native checks
verify genuine WebGL 2 rendering with thousands of triangles, transparent
pixels surrounding the character, stationary native window bounds during
roaming, global cursor strokes while click-through stays enabled, an actual
click reaching the window underneath, live chasing and jumping, and the
articulated reaching gesture. Native JavaScript error checks also passed.

Cloud browser validation passed 16 browser-companion checks and 9 3D
playground checks, including flexible-ear rendering, fractional transforms,
happy pose blending, 3D particles, reaching and recovery, anticipation and
landing, motion switches, resizing, and absence of external asset requests.

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
Archive size: 163,315,116 bytes.

Published SHA-256: `5fd0ad4cc528588229570d7a6b0f1891081d0f167b298c09a2265b09020ee34a`

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
