# Mischief movement and top-bar validation — 0.6.0

Release: [desktop-preview-7](https://github.com/prachetas2003/Trial/releases/tag/desktop-preview-7)

The [Windows workflow](https://github.com/prachetas2003/Trial/actions/runs/38115534453)
passed for source commit `90b7849`: fresh installation, 54 unit/server checks,
15 native desktop checks, packaging, archive creation, checksum generation,
and public release upload all succeeded.

New native Windows checks use real pointer moves, presses and releases. They
verify dragging with body/leg swing, settling after release, no keyboard-focus
stealing, default body capture over another focused window, and clicks passing
through empty overlay areas. They also verify edge dragging and saved margin
position, retrieval, continuous chase beyond the occasional-chase timeout,
toggling chase off, opening the focus corner from the top timer, the top
“I’m staying” button, controls remaining visible while the monkey is completely
hidden, one completion audio playback, glowing clickable highlights, and the
saved session summary. Existing transparency, art, petting, gestures, timer,
thought capture and disk-recovery checks also pass.

Local validation passed the same 54 unit/server checks, 16 original browser
checks, 11 marker-monkey playground checks, the focus browser suite, and seven
new overlay browser flows. These cover more frequent automatic quotes, timer
updates, choice-button cooldown, temporary retrieval during focus, real DOM
pointer capture and drag, physical swing, margin switching, persistent chase,
hiding, one completion sound, highlight acknowledgement, preserved session
choices, and layouts at 320, 390 and 768 pixels. Unit checks cover session-only
presence overrides, return/hiding preferences, persistent chase and restart,
invalid preferences, completion versus early ending, drag bounds and settling,
all four margins, and chase persistence beyond its former timeout.

Fifteen checks also passed on an isolated Linux display. The Linux test supplies
the coordinates of real XTest moves to supplement Electron’s cached global
cursor API; it does not establish Windows behavior. Body capture over another
focused window is asserted on Windows. Linux remains an unsupported release.

The public ZIP was downloaded back and verified against its published SHA-256,
archive CRCs, versioned README and quote references. Application version is
0.6.0. All 22 tracked packaged desktop files match the tested source, including
the local completion WAV; text comparisons normalize Windows line endings.
All 18 checked live website/preview assets match the tested local files.
Pages commit: `adfd7542d7bdf4f47c10d7258845433d3a90b48a`.

Archive: `Buildlings-Windows-x64.zip` — 163,537,917 bytes.

SHA-256: `edcf1b95392b247cc7f13dea122359fd87ed6b0da9e24512c1824bd2d557e04c`

The automated audio check verifies that local playback starts once; perceived
volume depends on the computer’s audio settings. Physical-PC smoothness,
battery use, and mixed-DPI monitor transitions still need manual profiling.
This is an unsigned Windows 10/11 x64 preview. Sessions, thoughts and preferences
remain local. The browser preview keeps a separate browser copy of data.

---

# Mischief focus companion validation — 0.5.0

Release: [desktop-preview-6](https://github.com/prachetas2003/Trial/releases/tag/desktop-preview-6)

The [Windows workflow](https://github.com/prachetas2003/Trial/actions/runs/38111841874)
completed successfully for source commit `bc901e5`. Fresh dependency installation,
46 core/focus/motion/server tests, 10 native desktop checks, packaging, archive
creation, checksum generation, and public release upload passed.

The native checks cover transparent pixels, click-through to an underlying
window, absence of focus stealing by the pet, global Windows cursor stroking,
chasing, jumping, reaching, focus-window controls, attributed speech bubbles,
edge presence, thought capture, closing the focus window while retaining the
session, disk persistence, paused restart recovery, and exactly one timer
completion. The Windows test keeps click-through enabled during cursor strokes.

Local checks passed the same 46 tests, 16 existing browser-companion checks,
11 marker-monkey playground checks, the new focus browser flows, and 10 native
checks on an isolated Linux display. Linux pointer-reaction checks enable mouse
events temporarily; they do not establish Windows global-pointer behavior.

Focus browser checks exercise configurable session lengths, the countdown,
choice counting and duplicate-click cooldown, exact quote/name rendering,
quote click-through, timer pause, safe thought text, reload recovery,
completion summaries, break timers, edge peeking, bubble bounds, complete hiding,
returning to wandering, thought review/removal, and layouts down to 320 pixels.
Unit tests also verify nonrepeating quote decks across restarts and the
four-session long-break cycle beyond the history retention limit.

The public Windows ZIP was downloaded back and verified for SHA-256, archive
CRCs, the versioned README, quote references, and application version 0.5.0.
All 19 packaged desktop files match the tested source after normalizing Windows
line endings. The 14 live browser preview files match the local tested files.

Archive: `Buildlings-Windows-x64.zip` — 163,474,392 bytes.

SHA-256: `560731940cbcea9741c5c7a9fa3d7b928519b65419e3ca449b7b31cfd06c7ef5`

This is an unsigned Windows 10/11 x64 preview. Physical-PC frame rates,
battery use, and mixed-DPI monitor transitions still need manual profiling.
Timer time records a running session; recorded choices are not a measured
attention or discipline score. Data stays locally in the app-data folder.
The browser preview stores its own separate data and stays within its page.

---

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
