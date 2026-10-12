Buildlings 0.8.2 adds desktop recovery and a Safe Mode startup path after a reported v0.8.1 freeze.

- Start-Safe-Mode.cmd launches with hardware acceleration disabled, a 1x monkey
  canvas and 30 fps character painting. Saved notes, sessions and browser pairing
  are shared with the normal launcher.
- Restores the native timer hide rule removed in 0.8.1. A hidden timer no longer
  stays visibly drawn while its clicks pass through. Visibility is tested from
  the rendered native window, not just the hidden attribute.
- Timer hit bounds are refreshed even if an initial hidden-window measurement
  was empty. Controls no longer depend on a ResizeObserver callback to recover.
- A direct Pause/Resume button is on the timer. During a paused focus session,
  Resume & stay resumes first and then counts one choice. Resume failures show
  a visible message, including disconnected-browser or work-tab requirements.
- Four narrow gradient strips replace the full-screen composited edge shadow.
  The timer's backdrop blur is removed. Neutral themes/strength remain available.
- Preference saves are asynchronous, coalesced and atomic. Quit waits for queued
  writes; changing a slider no longer performs synchronous disk work on every
  input event.
- A failed character paint leaves timer hit testing running. A crashed renderer
  gets a fresh transparent window and its focus session is paused. The tray also
  offers Restart desktop overlay and Open local diagnostics.
- Local diagnostics contain technical events, graphics-feature status and screen
  dimensions. They contain no saved thoughts, quotations, tab titles or URLs.

The exact cause of the reported machine's startup freeze is not confirmed.
The release includes recovery tests and a software-rendering launch path; passing
CI does not establish compatibility with every Windows graphics driver.

Quit or end the old Buildlings.exe first. Extract the entire ZIP into a new
folder. For the reported startup freeze, run Start-Safe-Mode.cmd first.
FocusShield remains 0.8.0; an already updated extension needs no changes.
Windows 10/11 x64 preview. SHA256SUMS.txt accompanies the ZIP.
