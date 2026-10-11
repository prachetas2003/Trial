# Buildlings

Mischief is an original marker-doodle monkey that wanders over your Windows
desktop. Thick variable-width ink, fixed nib texture, small glossy highlights,
a scribbled orange shirt, and an expressive curled tail keep it looking drawn
on the screen. The face and spaces between strokes remain transparent.
White-marker mode works over dark editors. The monkey walks, chases, jumps,
leans into cursor strokes, and reaches a larger hand toward you.
Drag the monkey by its head or body. Empty screen areas and speech bubbles
let clicks through; a compact timer bar stays at the top of the screen.
This release contains one doodle character.

Version 0.7.0 includes click-and-drag with body and leg momentum, dragging along
all four screen margins while peeking, and a continuous cursor-chase toggle.
The top bar shows the timer, an “I’m staying” button, thought capture, tuck/bring
back, and chase controls. Click the timer to open the focus corner. Completion
plays a soft offline chime and lights up clickable session highlights. The
monkey returns after focus by default; retrieving it during focus overrides
only that session, preserving automatic tucking for the next one.

Focus Shield adds website, Shorts/Reels, individual-tab and selected-workspace
blocking through the included Chrome/Edge extension. Restrictions follow the
running focus timer and release on pause, finish, breaks or disconnection.
Connect the extension from **Focus Shield > Connect your browser**; see
[extension setup and limits](extension/README.txt). Browser settings and other
protected browser pages cannot be covered. This is a voluntary focus tool.

Choose **Companion**, **Deep Focus**, or **Blocker Only**, then customize
individual settings in grouped sections. Blocker Only hides every desktop
visual and sound. Quotes have a master switch, so the monkey can remain
without speech. Optional amber focus edges glow once then settle. The monkey,
timer bar, glow and sound have independent controls. Your notes and session
history remain local. Press **Ctrl+Alt+F** to open the panel even with everything
hidden. **Ctrl+Alt+Q** quits completely.

The balanced quote bank remains 120 everyday lines and 43 attributed quotations,
with a 12-second default interval. Prior saved data is preserved.

Try the [movement playground](https://prachetas2003.github.io/Trial/roam/).
The browser preview stays within its page. The desktop application moves
over other applications without a visible rectangular background.

## Windows download

[Desktop preview releases](https://github.com/prachetas2003/Trial/releases)
contain `Buildlings-Windows-x64.zip` after the Windows workflow passes.
Extract the entire ZIP and open `Buildlings.exe`. The preview is unsigned;
follow your Windows policy if an unrecognized-app warning appears.
See [desktop instructions](product/DESKTOP_README.txt).

Windows 10/11 x64 is the supported target. The source also launches on Linux,
but Electron's Linux/X11 cursor cache does not reliably track global cursor
movement through a click-through window. Linux is not a supported release.

## Develop

Use Node.js 24 or newer. No AI API key or generated artwork is needed.
The small Canvas 2D surface stays transparent while requestAnimationFrame
drives travel and the deformable marker rig together. Physics runs at 120 Hz,
with fractional position and pose interpolation for the display refresh rate.
Ink grain is deterministic and travels with the strokes; it never flickers
from per-frame random noise. The backing canvas follows display pixel ratio,
up to 2×. Low resource usage still needs physical-PC profiling.

The earlier Sprout 3D renderer and pinned local Three.js source remain in the
repository for reference; the monkey renderer does not load or require WebGL.

```sh
npm ci
npm run desktop
```

Electron is downloaded by the install script with its official checksum
verification. Injected HTTPS proxies are supported without disabling TLS.
The renderer is sandboxed with context isolation and no Node integration.
The desktop application makes no network requests. Preferences, saved thoughts,
the last 50 focus sessions, choice counts, and a paused timer checkpoint stay in
local app-data. Cursor positions are used locally for animation. Quit, sleep,
and screen lock pause the timer; restarting restores the last saved checkpoint
as paused. Session time and recorded choices do not measure attention.

The [quote bank](product/MONKEY_QUOTE_BANK.md) is the source of the compiled
offline dialogue. [Quote references](product/MONKEY_QUOTE_SOURCES.md) are separate
from speech; an attributed bubble shows only the quote and name. Use
`npm run sync:preview` after editing the bank or shared desktop code.

For the website, `npm start` serves only `site/` on port 3000. Publish the
contents of `site/` to a static host. After editing desktop animation code,
run `npm run sync:preview` to copy the shared renderer into the playground.
With the local server running, `node scripts/render-monkey-art.cjs` exports
the preview image and app icons directly from the same marker artwork.

## Verify and package

```sh
npm test
npm start
# In another terminal, with Chromium available:
npm run test:browser
npm run test:roam
npm run test:focus
npm run test:overlay
npm run test:quotes
# On a graphical Windows desktop:
npm run test:desktop
npm run package:desktop
```

Browser checks use Playwright and `CHROMIUM_PATH` (default `/usr/bin/chromium`).
Native checks use a temporary application-data directory and move/click the
real cursor, so run them on an isolated test desktop. Python is required by
the pointer test helper. Linux tests explicitly select a software graphics
backend on the isolated virtual display; this flag is not used in shipping.
Linux virtual-display tests use the coordinates of real XTest pointer moves
to supplement Electron’s cached cursor API. They verify rendering, real mouse
clicks, dragging and click-through; only Windows checks use the unmodified
global cursor API and verify body capture over another focused window. Tests
check the audio playback promise, but perceived
volume and smoothness still need testing on your physical computer.

The [Windows workflow](.github/workflows/desktop.yml) runs motion and native
Windows checks, packages the app, uploads an artifact, and creates a public
preview release with a SHA-256 checksum. A failed check prevents publishing.

## Browser companion

The original browser companion also has manual build timers, celebrations,
three milestone unlocks, local progress backup, safe colour-pack import, and
PNG share cards. The boxed Picture-in-Picture overlay has been removed.
It does not read an agent's token usage or editor, process payments, or post
to social accounts. No sales or revenue have been established.

Paid cosmetic delivery files remain outside the public repository. The
earlier website-service experiment remains in `archive/website-service/`
and is not part of the running app or desktop package.
