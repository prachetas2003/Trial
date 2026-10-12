Buildlings 0.8.1 makes the focus edges calmer and fixes controls after changing modes.

- Focus edges use a still neutral shadow: faint grey on light workspaces and
  black on dark workspaces. Choose Auto (system theme), Light or Dark, and
  adjust Edge strength. Edges gently fade in/out; the coloured arrival
  animation and colour picker are removed. Edges turn off on pause/end.
- Pausing brings a tucked monkey back. Resuming restores the focus tuck.
  A monkey you explicitly hid, including Blocker Only, remains hidden.
- Turning Quotes on restores automatic speech even after a silent mode and
  clears the preset's quiet-during-focus setting. Speech resumes shortly,
  then follows the saved frequency (12 seconds by default). Advanced quiet
  and automatic-quote options remain available; the panel explains their state.
- Timer ticks no longer rewrite unchanged appearance controls or browser-tab
  rows. Offscreen tab rows render only when needed, tab status lookup is linear,
  and overlay hit testing/speech reuse measured timer bounds instead of forcing
  layout every animation frame. Large tab lists retain their scroll position.
- Notes, session history, blocking rules, size and timer opacity are preserved.
  Existing colour choices migrate to neutral edges. No screen capture is used
  to infer theme; Auto follows the system theme and manual overrides stay saved.

Quit the old app with Ctrl+Alt+Q, extract the whole ZIP and run Buildlings.exe.
FocusShield remains version 0.8.0: if you already updated it for Buildlings 0.8.0,
no extension update or re-pairing is needed. Older copies still need the included
FocusShield files and Reload at chrome://extensions or edge://extensions.

Windows 10/11 x64 unsigned preview. SHA256SUMS.txt accompanies the archive.
Preview: https://prachetas2003.github.io/Trial/roam/?v=0.8.1
The website demonstrates controls and visuals; real browser blocking needs the
app and paired extension. Blocking releases on pause, finish, break or disconnect.
