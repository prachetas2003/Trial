# Visible startup, milestone visibility and desktop recovery — 0.9.1

Source: `c4d1a88`. Windows workflow:
https://github.com/prachetas2003/Trial/actions/runs/38708027052

The previous version could launch without a discoverable entry point when saved
settings hid the timer and monkey. Launch now opens the Focus controls even in
that state, preserving the user's saved overlay switches. Native startup tests
launch with everything hidden and use the visible controls to restore the bar.
Normal enabled timer visibility and native top-bar controls remain covered.

Milestones could originate beyond a screen margin while the monkey peeked,
and focus shading appeared above the small particles. Origins now stay inside
the work area, pieces are larger and last about two seconds, and a brief
percentage label appears above the edge shading. Browser tests measure particle
bounds at all four margins with a 60% monkey, exercise real 25/50/75 thresholds,
verify click-through, switches/reduced motion and complete cleanup. Counts stay
10 local pieces per milestone and 14 local plus 34 screen pieces at completion.

The original power handler merely sent a motion-clock reset to an existing
window. Sleep/lock now pauses, releases input, stops polling and hides old
surfaces. Wake/unlock coalesces paired events, refreshes displays and replaces
the overlay and controls, restoring the panel only if it was visible. The timer
stays paused. Four simulated native sleep/wake cycles preserve elapsed time,
notes and visibility. Sleep rebuilds do not consume the crash-recovery budget.
A genuinely blocked renderer (20-second long task) is replaced by heartbeat
recovery, and an actually crashed controls renderer is replaced and usable.
A healthy minute resets the overlay crash budget; repeated crash loops are bounded.

Windows now uses software composition by default for this Canvas2D companion;
Safe Mode additionally limits drawing to 30 fps and 1x resolution. Normal drawing
is capped at 60 fps. Display geometry is cached between display-change events.
The main process controls native hit testing instead of accepting competing
renderer toggles. Windows checks verify hardware composition is disabled on a
normal launch and retain the Safe Mode and existing native-interaction tests.

The video regression runs a separate headed Chromium browser with a local VP8
video under the native app, uses real OS pointer clicks on pause/resume/tuck plus
panel slider changes, verifies decoded frame progress/colour, and samples the actual
Windows desktop pixels after each interaction. The Windows pixel assertions
passed. Local Xvfb has no compositing window manager, so those pixel assertions
are explicitly unrun there; local decoding/input checks passed.

Limitations: simulated power events are not physical laptop sleep. A local VP8
clip is not YouTube hardware video decoding. The user's particular GPU/driver
and white-video root cause remain unconfirmed. Software composition is a
compatibility mitigation, not evidence of reproducing that original fault.
FocusShield code/version is unchanged (0.8.0); no extension reinstall is needed.

The Windows workflow passed every step: fresh install, **75 unit/server checks**,
**20 native interaction checks**, **seven stability checks**, **five startup/wake
groups**, **four panel/scroll groups**, **six polish groups**, **two video groups**,
**eight extension groups**, packaging, checksum generation and public release.
Local validation passed the 75 unit/server checks, 20 native checks, seven
stability checks, four startup/wake groups, four panel groups, six polish groups
and video decoding/input checks. Windows-only graphics and desktop pixel
assertions were verified by the Windows workflow, not by uncomposited Xvfb.

Release: [desktop-preview-22](https://github.com/prachetas2003/Trial/releases/tag/desktop-preview-22).
The public ZIP was downloaded back, SHA256 and CRC verified. It reports 0.9.1;
all 26 tracked desktop files in the ASAR match source. The Safe Mode launcher,
quote references and all 11 unchanged FocusShield files match. Archive size:
**163,576,102 bytes**. SHA256:
`8d20b5cf7f15dd459982d08de6d61c358d3d279d734c5afe7584d1063405aaaa`.

After deployment, all 20 checked live website/preview assets match source.
Pages commit: `7cdb015`. Download links point to the verified release above.

---

# Synchronized focus, themed bubbles and celebrations — 0.9.0

Release: [desktop-preview-21](https://github.com/prachetas2003/Trial/releases/tag/desktop-preview-21)

The [Windows workflow](https://github.com/prachetas2003/Trial/actions/runs/38325157479)
passed for source `6a19cbd`: fresh install, **75 unit/server checks**, **20 native
interaction checks**, **seven native stability checks**, **four panel/browser
groups**, **five focus-polish groups**, **eight real-browser extension groups**,
packaging, checksum generation and release upload. All workflow steps passed.

Native stability alternates real toolbar clicks and panel clicks through twelve
pause/resume transitions, comparing both clocks and pause labels after each
transition. It then resumes and verifies the monkey physically arrives at its
edge target. Windows keeps both native windows visible, exercising its real
always-on-top input routing. The isolated Xvfb desktop lacks a window manager,
so its Linux test temporarily uncovers the toolbar; Windows has no such shim.
Existing render-crash recovery, saved-data, software graphics and native input
checks remain active. Unit checks cover twenty cycles, stale-state rejection,
hover/petting during edge travel and non-repeating milestone checkpoints.

Both timer views receive one versioned snapshot per action/tick; older packets
cannot replace newer state. The panel avoids background throttling. Resume
restores auto-peeking unless continuous chase or explicit hiding is selected.
Edge return has priority over cursor hover/petting. Manual retrieval remains
available during a running session and auto-peek can be disabled separately.

Browser polish verifies immediate agreement after mixed timer controls, bubble
width reducing with monkey size, readable minimum text, light/dark/automatic
backgrounds, a still-focused Presence dropdown updating after toolbar pause/resume,
coverage up to 280px, ordered Developer mode / Load unpacked /
FocusShield selection / pairing instructions, and preset/custom explanations.
Milestone confetti is local (10 pieces) at 25%, 50%, 75%. Completed focus returns
the monkey by default and plays 14 local plus 34 screen pieces, removed within
2.4 seconds. No full-screen canvas or blurred shadow layer is used. Pieces are
click-through. Celebration-off and reduced-motion acknowledgement are checked;
fully silent existing settings migrate with celebrations off. Early Finish and
breaks do not trigger completion confetti. Milestones persist through recovery.

Local validation passed: 75 unit/server checks, 20 native interaction checks,
seven native stability checks, four panel/browser groups, five polish groups,
five focus groups, seven overlay groups and two quote groups. Screenshots include
`test-results/completion-confetti.png` and `test-results/scaled-dark-bubble.png`.
Safe Mode and all v0.8.2 recovery measures remain included. The underlying cause
of the earlier user's machine-specific startup freeze remains unconfirmed.

The public ZIP was downloaded back. SHA256 and CRC checks passed. It includes
the Safe Mode launcher, matching quote references and all 11 FocusShield files.
The ASAR reports 0.9.0 and all **26 tracked desktop files** match tested source.
FocusShield remains 0.8.0; already updated installed extensions stay compatible.

Archive size: **163,574,873 bytes**. SHA256:
`f0f75fa13e340ec8e3284f867bce61afe0adea555231731af396bc2a36227ec7`.

After deployment, all 20 checked live website/preview assets match source.
Pages commit: `c91c427`. The preview cache key refreshes the final focused-control
fix, and download links point to the verified final release above.

---

# Native timer repair, recovery and Safe Mode — 0.8.2

Release: [desktop-preview-19](https://github.com/prachetas2003/Trial/releases/tag/desktop-preview-19)

The reported user machine froze immediately after startup; its screenshot
background was black, but its desktop was not covered. The user also reported
that Ctrl+Alt+F did not open controls. The complete startup freeze was not
reproduced on the available machine. Its exact cause remains unconfirmed.

A separate, concrete v0.8.1 regression was reproduced directly from the
previously published and checksum-verified app ASAR: setting `showHud:false`
produced `hidden:true`, but computed `display:flex` and actual visible native
timer artwork. The native click-through gate correctly excluded a hidden HUD,
leaving that visible bar unclickable. The 0.8.1 edge-CSS rewrite had removed
`#timer-bar[hidden]` along with hover and compact-layout rules. These rules are
restored. Native tests now wait for rendered invisibility rather than merely
checking the hidden attribute. The screenshot alone does not establish that
this preference was the user's setting or explain the failed keyboard shortcut.

The [Windows workflow](https://github.com/prachetas2003/Trial/actions/runs/38320111876)
passed for source `5fc401f`: fresh installation, **71 unit/server checks**,
**20 native interaction checks**, **six native stability checks**, **four
panel/browser check groups**, **eight extension check groups**, packaging,
checksum generation and release upload. Every step passed.

The stability suite restores a session matching the reported timer state
(Paused, 22:31, five choices), hides/restores the timer, and uses actual OS mouse
input to resume-and-count, pause and open controls. The focus shortcut must be
registered and concurrent panel-open requests must render the requested view.
It verifies that 150 preference changes coalesce into one atomic file write,
checks the active native overlay centre is transparent, injects a paint failure
and checks controls remain usable, then forcefully crashes the renderer and
checks a fresh overlay and accessible controls. A new Safe Mode launch must
report software GPU compositing, a 1x canvas, working real mouse controls,
and preserved notes and session choices. These tests ran on Windows as well
as the isolated Linux test desktop. Registration is checked; physical keyboard
activation on the reported user's machine has not been verified.

The repair uses asynchronous/coalesced atomic writes and flushes queued writes
on quit. Timer bounds are refreshed without depending on ResizeObserver.
Four 64px gradient strips replace the full-screen composited shadow, and the
timer backdrop blur is removed. Direct Pause/Resume and Resume & stay controls
and visible failure messages address silent controls. Paint failures preserve
HUD reporting; renderer failure gets a new native surface and pauses focus.
The tray includes manual restart and local diagnostics. Diagnostics contain
technical events and graphics/screen information, not thoughts, quotes or URLs.

Local checks also passed: 71 unit/server checks, 20 native checks, six native
stability checks, four panel/browser groups, seven overlay groups and two
quote groups. Safe Mode disables hardware acceleration before app readiness
and limits character painting to 30 fps; physics remains independent of paint.

The public ZIP was downloaded back. SHA256 and archive CRCs passed; the Safe
Mode launcher exists and contains the expected launch flag, quote references
match, and all 11 unchanged FocusShield files match source. ASAR version is
0.8.2, and all 25 tracked desktop files match. The included extension stays
0.8.0; existing updated copies remain compatible.

Archive size: **163,571,493 bytes**. SHA256:
`f5528401144d391a1c824bfc07e527f24b34e337eaccbc27e1145e802291ff02`.

The live website and preview were verified after deployment: all 19 checked
assets match source. Pages commit: `f652ff1`. Download links point to the verified
replacement release.

---

# Calmer focus edges and repaired controls — 0.8.1

Release: [desktop-preview-18](https://github.com/prachetas2003/Trial/releases/tag/desktop-preview-18)

The [Windows workflow](https://github.com/prachetas2003/Trial/actions/runs/38220378898)
passed for source `a7a9cc8`: fresh installation, **68 unit/server checks**,
**20 native Windows checks**, **four panel/browser check groups**, **eight
real-browser extension check groups**, packaging, checksum generation and
release upload. Every workflow step passed.

The panel regressions switch Quotes on after Deep Focus, observe automatic
speech during the session, verify silence after switching off, check pause
retrieval/resume tucking, exercise automatic Light/Dark and manual theme
selection, and confirm there is no moving edge animation. They also verify
unchanged Appearance controls receive no DOM mutations over five seconds of periodic state updates,
and a 200-tab picker accepts wheel scrolling without resetting its position.
The panel fits 320px, 390px and 768px. Existing timer-opacity, scaled dragging,
visibility, notes, preset, saved-preference and blocking checks remain active.

Native Windows checks additionally verify automatic speech after a silent
preset and the tucked monkey's pause/resume transition. Real pointer dragging
must move the body, produce a leg-swing peak above the same threshold across
the gesture, release capture and settle. Sampling the whole pendulum motion
replaces a timing-sensitive final-frame check without removing its assertion.

Local checks passed: 68 unit/server checks, 20 native virtual-display checks,
four panel/browser groups, five focus groups, seven overlay groups and two
quote groups. Linux checks use the documented isolated test desktop; the
Windows workflow supplies actual Windows interaction evidence.

The public ZIP was downloaded back and verified against the published SHA256,
including archive CRCs, versioned README, quote reference additions and all
11 unchanged FocusShield files. The extracted ASAR reports version 0.8.1 and
all 24 tracked desktop files match the tested source. FocusShield remains
0.8.0 and does not need reinstallation when the user's existing copy is current.

Archive size: **163,568,472 bytes**. SHA256:
`94447b48208f91a11687a4918da73bc69c20db72dfa266c48b90088b97ee4cb0`.

The live website and preview were verified after deployment: **all 19 checked
assets match the tested source**. Pages commit: `eccca99`. Download links point
to the verified release above.

---

# Confirmed tab locks and quick controls — 0.8.0

Release: [desktop-preview-16](https://github.com/prachetas2003/Trial/releases/tag/desktop-preview-16)

The [Windows workflow](https://github.com/prachetas2003/Trial/actions/runs/38190947589)
passed for source `4f37054`: fresh installation, **65 unit/server checks**,
**19 native Windows checks**, **eight real-browser extension check groups**,
packaging, checksum generation and release upload. Every workflow step passed.

The browser regression creates tabs before installing the extension through
Chrome's unpacked-extension API. The already-open locked tab preserves its
unfinished input and is confirmed protected by the local app. Its fixture
rejects inline styles/scripts and requires Trusted Types with no HTML policies;
protection uses browser-injected CSS and DOM construction without HTML sinks.
The confirmed cover fills the viewport. Network-rule receipts alone, mismatched
URLs and stale document generations cannot confirm a lock. Older extensions
are released and excluded from the modern tab picker to prevent conflicts.

Additional extension checks cover website/Shorts/Reels navigation, link hiding,
SPA routes, Save for later, individual locks, strict workspaces, new tabs,
approving additional tabs, approved work websites, precedence of global blocks,
emergency pause, restored new tabs, end/break release and disconnect cleanup.
The fixture server is local HTTPS; only its test certificate's SPKI is trusted
by the isolated browser. No test trust configuration ships in the application.
The cloud's managed system browser still prohibits unpacked extensions;
Windows CI verifies that workflow instead.

Local unit, focus, overlay, quote, quick-panel and native virtual-display checks
passed. The quick-panel checks exercise direct visibility controls, anchored
resizing, timer background opacity while text remains opaque, palette/brightness,
persistence, Reset, the timer settings button and widths of 320/390/768 pixels.
Native Windows checks add real mouse capture on the smaller monkey, the direct
Appearance route, tray timer restoration and session-only glow colour. The
Linux virtual-display run retains the cursor-cache accommodation below.

Downloaded public ZIP verification:

- **163,567,745 bytes**; all ZIP CRCs passed.
- SHA-256: `91a3f312c2332018cc168ded713c6c7a8809f292ebff64af56ab947fab13cf6a`.
- The application version and root instructions are 0.8.0.
- All **24 tracked desktop files** in app.asar and all **11 FocusShield files**
  match the tested source, normalizing only Windows text line endings.
- Binary assets match exactly; both quotation reference files are included.

Pages deployment `1d7e54a59f48c93c2db316a5b1635a33ba62a2d0` matches all
**19 checked live website/preview assets**, including the new controls and
versioned shared policy. Both website download links point to preview 16.
The preview demonstrates settings/visuals; browser blocking needs the native
app and updated extension. Saved notes/session data remain on the device.

The supported target remains Windows 10/11 x64 with the updated extension in
paired Chrome/Edge profiles. Protected browser pages cannot be covered. Feature
selectors may need maintenance as sites change; controlled fixtures do not
prove the current live-site DOM. Perceived sound, motion and glow still need a
physical-computer check. The release instructions cover updating the extension
in place or replacing/re-pairing it.

---

# Focus Shield and mode validation — 0.7.0

Release: [desktop-preview-14](https://github.com/prachetas2003/Trial/releases/tag/desktop-preview-14)

The [Windows workflow](https://github.com/prachetas2003/Trial/actions/runs/38179254649)
passed for source commit `c4ea5ab`: fresh installation, 60 unit/server checks,
18 native Windows checks, installation of the browser runtime, six extension
check groups, packaging and public release upload. All workflow steps succeeded.

The native checks verify transparent rendering, drag/click-through, saved focus
state, completion audio, the 12-second quote cadence, blocker-only visibility,
the master quote switch, disconnected-start and work-tab guards, authenticated
browser connection and tab selection through the actual panel.

The extension runs in real Chromium with controlled local HTTPS fixtures and
DNS mappings for its feature hosts. Only the fixture certificate's SPKI is
trusted by the test browser; this configuration is absent from shipping.
Checks exercise the actual popup pairing flow, live tab inventory, existing
page covers, declarative network redirects, Save for later, Shorts/Reels paths,
Shorts-link hiding, SPA navigation, individual tab locks, strict workspaces,
new-tab restrictions, approval of an additional tab, emergency pause, form
preservation, end/break release and disconnection cleanup. Work permissions
include a browser-session identity to prevent reused tab IDs inheriting a
previous browser session's permissions.

Local unit, focus-browser, overlay-browser, quote-browser, new focus-panel and
18 native virtual-display checks passed. The panel check covers presets,
independent preferences, a silent visible monkey, a fully hidden timer bar,
session-only click-through amber edges, website validation, restart persistence
and widths of 320, 390 and 768 pixels. The cloud's managed system browser does
not permit unpacked extensions, and its Playwright CDN download was denied;
Windows CI supplied and verified that runtime instead. Linux native checks
retain the pointer-cache accommodation described in the older records below.

The public ZIP was downloaded back and verified:

- Size: **163,559,946 bytes**.
- SHA-256: `25820b81b9fda578e405e67186ad7b723300e4d2cd6e667f6bfcbb24cf187e9a`.
- ZIP CRCs passed. The application version and root instructions are 0.7.0.
- All **24 tracked desktop files** in `app.asar` match the tested source,
  normalizing only Windows text line endings. Binary assets match exactly.
- All ten included FocusShield files match the extension source. The quotation
  references and additional source notes are present.

The live Pages deployment `7a15f9a892a0d37c1c65ff953156984f34e7ca5c` matches
all **19 checked website/preview assets**, including the new shared policy,
focus panel, renderer, quote bank, HUD and sound. The website clearly labels
blocking as an app-and-extension feature; it demonstrates settings and visuals.

The extension supports voluntary restrictions in installed/paired Chrome/Edge
profiles. Chrome internal/protected pages cannot be covered. Website feature
selectors may need maintenance as those sites change; controlled fixtures do
not establish current live-site DOM compatibility. Perceived audio, motion and
edge glow still require a physical-computer check.

---

# Balanced quote bank and cadence validation — 0.6.1

Release: [desktop-preview-8](https://github.com/prachetas2003/Trial/releases/tag/desktop-preview-8)

The quote bank matches `balanced-mischief-quotes` commit `db41367` exactly:
120 everyday lines and 43 attributed quotations. The additional source notes
for H036–H043 are included in the portable ZIP.

The [Windows workflow](https://github.com/prachetas2003/Trial/actions/runs/38118334182)
passed for source commit `310ade3`: fresh installation, 55 unit/server checks,
16 native checks, packaging, checksum generation and public release upload.
The added native check verifies the 120/43 bank, the 12-second default, and
scheduling after speech without the former randomized delay or 25-second floor.

Local unit, focus-browser, overlay-browser and targeted quote-browser checks
passed. The quote-browser checks observe actual displayed payloads, confirm
12-second automatic intervals within the controller's one-second polling
precision, full quote text, preserved thoughts on upgrade, manual encouragement
before the next automatic quote, selectable intervals, persistence after reload,
and disabling automatic quotes. The migration test preserves a paused session,
its intention, elapsed time and choices, notes, and other preferences; the
refreshed deck includes all 120 new everyday entries. Later frequency choices
survive restart. Existing hide and quiet-focus preferences remain respected.

The public ZIP was downloaded back. Its SHA-256, archive CRCs, versioned README,
additional quote references, and application version 0.6.1 were verified.
All 22 tracked packaged desktop files match the tested source after normalizing
Windows text line endings. All 18 checked live website/preview assets match
local tested files. Pages commit: `f6c834e94b112864500672f14cbee7d90c36fb08`.

Archive: `Buildlings-Windows-x64.zip` — 163,540,837 bytes.

SHA-256: `f7bcae05c31ed835622ad23b746b81221603e3f4dc64fa5ad066a1a5efbb4852`

The interval applies while automatic quotes are enabled and the monkey is
visible; quiet-focus mode suppresses ordinary quotes during focus. Updating the
Windows app requires quitting the previous version and opening the new one.
Physical-computer performance limitations from the previous validation remain.

---

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
