Buildlings 0.10.0 separates native input surfaces, reorganizes controls and adds five hands-on interactions.

- The monkey uses a bounded 420×400 transparent window; the floating timer has
  its own bounded window. The monitor-size decorations window remains permanently
  click-through. Clicking or holding either control cannot make a monitor-size
  surface interactive. Window movement uses asynchronous position updates, not
  a Windows modal window-drag loop. Windows software graphics remains the default.
- The timer has a dotted drag grip and a padlock. Move it anywhere, snap near an
  edge, lock/unlock, and reset its position from Appearance or the tray. Position
  and lock are saved. Missing monitors fall back to a visible work area.
- Top navigation: Focus timer, Websites & tabs, Monkey, Appearance, Notes & history.
  Tabs stay available while scrolling and support arrow/Home/End keyboard input.
  The timer comes before quick setups. Website/tab actions use explicit labels.
  Monkey movement, quotes and play have their own category and instructions.
- Grab the head or drag the body to dangle with pendulum limbs. Press the shirt
  without moving to squish and rebound. Pull/release the curled tail as a spring.
  Cursor strokes create a moving marker sheen and happy expression. Release a
  moving drag for a short bounded toss and soft settle. Edge peeking prevents
  throws, reduced motion suppresses throws and damps springs. Play can be switched
  off independently, retaining ordinary drag. No points, purchases or APIs.
- Sleep recovery rebuilds all three surfaces. A failed pet drawing leaves the
  timer usable. Actual pet/timer renderer failures and a stalled timer recover
  with the session safely paused. Existing saved notes, history and pairing stay.

Regression checks include actual native presses, holds, drags, release trajectories,
lock/reset, crash recovery, simulated sleep, and a separate browser video whose
colours change while inputs remain held. Windows checks sample visible desktop
pixels during these interactions, rather than checking only decoded frames.
These checks do not reproduce the user's physical laptop or YouTube hardware
video decoding. The exact machine-specific blank-video fault remains unconfirmed;
the input-surface change addresses the architecture implicated by the new report.

Quit the previous app with Ctrl+Alt+Q, extract the entire ZIP into a fresh folder,
and run Buildlings.exe. Start-Safe-Mode.cmd remains available for 30-fps/1x drawing.
FocusShield is unchanged at 0.8.0; an already updated extension needs no reinstall.
Windows 10/11 x64 preview. SHA256SUMS.txt accompanies the archive.
