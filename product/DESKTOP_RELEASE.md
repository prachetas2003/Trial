Buildlings 0.10.1 fixes native movement, overlay visibility and timer unlocking.

- Fixed the main-process error when the monkey crosses a screen-coordinate zero.
  JavaScript can round a small negative coordinate to negative zero; Electron's
  integer converter rejects that value. Pet and timer positions now normalize
  zero, and invalid/out-of-range pet reports are rejected before native calls.
- Monkey, timer and passive effects use a Windows topmost level that does not
  place them behind the taskbar. They stay above ordinary application windows
  when Chrome opens afterward, without taking keyboard focus from your work.
- The timer's lock icon remains the same DOM node during clock updates. Presses
  held across a timer tick can now complete, including repeated lock/unlock.
  Unlock restores the drag grip; saved position and reset remain available.

Regression checks exercise real native movement across both zero axes, repeated
lock/unlock presses spanning clock updates, and dragging after unlocking. Windows
video checks open Chromium after the app, inspect actual topmost styles and
z-order, test native hit targets over the browser, and verify the browser retains
foreground focus. Existing video checks remain active during held clicks/drags.
Your physical laptop, GPU and YouTube hardware decoding still need device testing.

Quit the old app with Ctrl+Alt+Q, extract the entire ZIP into a fresh folder and
run Buildlings.exe. Existing notes, history, settings and browser pairing remain.
FocusShield is unchanged at 0.8.0; no extension reinstall is required.
Windows 10/11 x64 preview. SHA256SUMS.txt accompanies the download.
