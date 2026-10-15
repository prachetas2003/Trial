Buildlings 0.9.1 improves launch visibility, milestone visibility and desktop recovery.

- The focus controls open on launch, including when every overlay was hidden.
  The timer bar appears when enabled; saved silent settings remain respected.
- 25%, 50% and 75% celebrations remain inside the screen, above the focus edges,
  with larger coloured pieces, a progress label and a two-second local burst.
- Windows uses software composition by default for this 2D app, reducing reliance
  on GPU-backed transparent surfaces alongside browser video. Safe Mode remains
  available for lower drawing load (30 fps and 1x canvas resolution).
- Normal monkey painting is capped at 60 fps. Monitor geometry is cached rather
  than queried for every frame report. One native hit-test path controls mouse
  pass-through, avoiding conflicting renderer/main toggles.
- Sleep/lock pauses the timer, releases input capture and hides stale surfaces.
  Resume/unlock rebuilds the overlay and controls, refreshes monitor bounds and
  preserves notes, choices and paused time. Reopen controls if they were visible.
- A frame heartbeat replaces a stalled overlay; crashed/unresponsive controls
  also recover. Repeated crash loops remain bounded. Sleep rebuilds do not consume
  the crash budget, and a healthy minute restores that budget.

Validation includes simulated sleep events, actual renderer crashes/long tasks,
normal Windows software composition and local video playback beneath the native
app. These checks do not reproduce physical laptop sleep, YouTube hardware
video decoding or the affected laptop's GPU driver. The user's white-video root
cause remains unconfirmed; the graphics change is a compatibility mitigation.

Quit the old app, extract the entire ZIP into a fresh folder and run Buildlings.exe.
Saved notes, history and pairing stay shared. FocusShield is unchanged (0.8.0);
an already updated extension needs no reinstall. Windows 10/11 x64 preview.
SHA256SUMS.txt accompanies the archive.
