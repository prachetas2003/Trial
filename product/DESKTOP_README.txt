BUILDLINGS — MISCHIEF FOCUS COMPANION 0.9.1

GET STARTED
1. Quit the previous Buildlings version from its notification-area menu.
2. Extract the entire ZIP into a folder. Keep all its files together.
3. Open Buildlings.exe. The focus controls open immediately, even if you previously hid the timer or monkey. No Node.js, account, or API key is needed.
4. Click the timer bar at the top, or double-click the monkey icon in the Windows notification area to open
   your focus corner. It may be under the hidden-icons arrow.
5. Write one intention, choose your focus/break lengths, and start.
   Use the arrow in the focus corner to return to your work. The timer continues.

FOCUS SHIELD AND MODES
- Presets apply a complete setup. Change individual switches/settings to make
  your own Custom setup; these choices are saved automatically.
- Companion: monkey, gentle quotes and timer, with blocking off.
- Deep Focus: blocking, a quiet edge-peeking monkey, timer and neutral focus edges.
- Blocker Only: blocking with no monkey, quotes, timer overlay, edges or sounds.
- Adjust individual features in the Blocking and Appearance sections.
- Focus Shield needs the included Chrome/Edge extension. Open Blocking >
  Connect your browser for setup, or read FocusShield/README.txt.
- Choose website domains, Shorts/Reels, locked tabs or Only my work tabs.
  Select Work tabs before starting. New tabs lock until approved in the panel.
- Pause, finish, quit or take a break to release restrictions. The extension
  popup also has Pause timer & unlock. Browser settings pages cannot be covered.
- Blocker Only can be controlled from the tray or Ctrl+Alt+F.

QUICK CONTROLS
Quotes on restores automatic encouragement even after a silent mode.
Pausing brings a tucked monkey back; resuming restores the tuck. A monkey
you explicitly hid, including Blocker Only, stays hidden.
The panel has Focus, Blocking, Appearance and Notes destinations.
Monkey, Quotes, Timer and Edges switches are always visible at the top.
Focus > Choose tabs & sites opens the blocking picker directly.
Appearance has a timer background slider, monkey size (60-100%), focus edge strength
and Auto/Light/Dark screen style, and Reset. Settings save automatically and preview immediately.
The timer's settings button and right-clicking the draggable monkey open
Appearance directly. Right-click the tray icon for Show/Hide timer, Show/Hide
monkey, and Open controls. Ctrl+Alt+F always opens the panel.

TAB PROTECTION
Choose Block selected tabs or Only selected work tabs in Blocking.
Selecting a block/allowed tab enables Focus Shield. Before a timer starts,
rows say Will lock when you start. During focus, Locked for this session means
the browser confirmed protection for that page. Needs attention gives a refresh
or site-access instruction. Pausing or finishing unlocks the pages.
Existing tabs get protection without needing a reload when the browser allows
injection; unfinished documents stay beneath a cover. Browser-protected pages
cannot be covered. The optional approved-websites restriction prevents a work
tab navigating to a new website until you approve it from the panel.
Global website/Shorts/Reels blocks still apply to allowed work tabs.

UPDATE THE EXTENSION TOO
If you used 0.7: quit the app, extract the new ZIP, and run Buildlings.exe.
Copy the new FocusShield folder contents over the folder your browser already
loads, then click Reload on the extension card at chrome://extensions or
edge://extensions. The same path preserves pairing. Alternatively remove the
old extension, load the new FocusShield folder and pair again. Older extensions
receive a release signal so they cannot conflict with the updated extension.

YOUR LITTLE CORNER
- A focus timer with pause, resume, early finish, and optional breaks.
- A longer break after every fourth completed focus session.
- "Keep my thoughts" saves ideas and distractions for later. Ctrl+Enter saves.
- "I'm staying" records a choice during a running focus session. It shows
  a sourced quote and a little sparkle when quotes and the monkey are enabled. Rapid duplicate presses are coalesced.
- Your summary shows timer time and choices recorded, including early finishes.
  These counts do not measure your attention or discipline.
- Recent history keeps the last 50 focus sessions. Thoughts stay until removed.
- Timers pause when you quit, sleep, or lock your screen. On wake, the overlay and controls are rebuilt; the timer stays paused until you resume. Reopen and resume
  when ready. A sudden shutdown restores the last saved paused checkpoint
  (checkpoints are saved every 10 seconds during a running timer).

WINDOWS STABILITY
Windows now uses software graphics by default for the transparent 2D companion.
Safe Mode additionally limits drawing to 30 fps at 1x pixel resolution.
If the overlay stops reporting frames, it is replaced and your timer is paused.
The controls panel also recovers from a crashed or unresponsive renderer.
Right-click the tray > Open local diagnostics for graphics/recovery events.

THE TOP BAR
- Click the clock to open the focus corner.
- Click "I'm staying" when you choose to stay despite a distraction.
- The pencil opens Notes. The diagonal arrow tucks / brings back the monkey.
- Chase keeps following your cursor until switched off. Tucking turns chase off.
- When a timer expires, a soft bell plays and the bar glows. Click Highlights
  to see the session intention, time and choices. Sound can be turned off.
- The top bar has its own visibility switch. Blocker Only hides it too.

THE MONKEY
Click and hold the monkey's head/body to drag him. His body and legs swing
with momentum and settle after release. While peeking, drag along the margins
or onto another edge. You can disable dragging under Appearance > More behaviour options
for clicks to pass through the monkey as well.
Move your cursor gently across Mischief to pet it. Right-click the tray icon
for motion, marker ink, quotes, hiding, and timer controls. White marker works
well over dark editors. The monkey can wander freely, peek from the edge,
or be hidden completely. It tucks to the edge during focus by default.
Warm quotes appear every 12 seconds by default. Choose 12, 25, 45 or 90
seconds in the focus corner; you can keep ordinary quotes quiet during focus.
Turn Show monkey quotes off to keep him present without any speech.
Your thoughts, sessions and other preferences are preserved. Bringing him back during focus affects
only this session; the next one can still tuck automatically. By default he
comes back when the focus session ends.

KEYBOARD SHORTCUTS
Ctrl+Alt+F  Open focus corner
Ctrl+Alt+T  Keep a thought for later
Ctrl+Alt+S  I'm staying (running focus session)
Ctrl+Alt+H  Tuck to the edge / let the monkey wander
Ctrl+Alt+P  Pause / resume wandering (separate from the focus timer)
Ctrl+Alt+Q  Quit
If a shortcut is used by another app, use the notification-area menu.

YOUR DATA
Empty areas and speech bubbles let clicks pass through. Only the timer bar
and monkey grab region accept mouse input; they do not take keyboard focus.
The focus corner accepts typing when you open it. It does
not read your editor, record keystrokes elsewhere, use AI credits, sample your
screen, send cursor positions to a service, or run on startup. Optional Focus
Shield blocks browser content through the paired extension. Open tab titles
and URLs travel only to the local app at 127.0.0.1:43827 and stay in memory;
selected tab IDs and blocking rules are saved locally. No data is uploaded. Preferences, thoughts, sessions, and timer
checkpoints are stored locally in Electron's app-data folder. Quote sources
are listed in QUOTE_SOURCES.md and QUOTE_SOURCES_ADDITIONS.md.
There are 120 balanced everyday lines and 43 sourced quotations.

The original marker artwork has variable-width strokes, stable ink grain,
small highlights, an orange shirt, and movable arms, legs, head, and tail.
Walking, chasing, jumping, petting, and reaching blend smoothly. Empty areas
show your screen through the drawing. WebGL is not required.

This is an unsigned preview for 64-bit Windows 10/11. Windows may show an
unrecognized-app warning. Download from the official GitHub release, check
SHA256SUMS.txt, and follow your Windows policy.

The browser preview stays within its page and stores a separate browser copy
of your data. The Windows app moves over other applications.

Project: https://github.com/prachetas2003/Trial
Preview: https://prachetas2003.github.io/Trial/roam/?v=0.9.1

IF THE APP FREEZES ON STARTUP
End Buildlings.exe in Windows Task Manager, then run Start-Safe-Mode.cmd
from the extracted folder. It uses software graphics and lighter monkey
painting while preserving your saved notes, sessions and pairing.
The timer now has a direct Pause/Resume control. Resume & stay resumes a
paused focus session and records one choice. Failed controls show a message.
The tray offers Restart desktop overlay and Open local diagnostics.
Diagnostics stay local and contain technical events, not notes or tab URLs.

POLISH AND CELEBRATIONS
The top timer and Focus panel share the same session state. Pause brings a
tucked monkey out; Resume restores focus tucking, unless chase is explicitly
on or the monkey is completely hidden. Return movement is not held by hovering.
Speech bubbles shrink with the monkey, keep small text readable, and follow
Appearance > Screen style. Auto recognises system dark theme or white marker.
Choose Dark manually for a dark workspace on a light-system desktop.
Focus edge coverage is adjustable from 64 to 280 px; the centre stays clear.
Celebrations: small local bursts at 25%, 50%, 75%; a brief screen burst and
monkey celebration on completed focus sessions. Early Finish and breaks do
not play completion confetti. Appearance has a celebration switch. Blocker
Only turns celebrations off, and reduced motion uses a quiet acknowledgement.
