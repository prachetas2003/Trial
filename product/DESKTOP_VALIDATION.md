# Desktop preview validation

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
