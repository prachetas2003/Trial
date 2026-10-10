# Buildlings

A transparent Windows desktop pet that wanders, occasionally chases the
cursor, jumps, looks around, and emits sparkles when stroked. Sprout, Ember,
and Orbit use original procedural 3D geometry, skinned flexible ears,
and articulated paws. Sprout is the primary character; the others share its
rig with palette and ear variations. Mouse clicks pass through the pet; controls live in the Windows
notification area, including **Say hello** for the reaching gesture.

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

Use Node.js 24 or newer. No AI API key is needed. Three.js is pinned in the
lockfile, copied locally by postinstall, and never fetched from a CDN at runtime.
The small WebGL 2 canvas requires graphics support; the native surface stays
stationary while requestAnimationFrame drives travel and pose together.
Physics runs at 120 Hz, with fractional position and pose interpolation for
the display refresh rate. Low resource usage still needs physical-PC profiling.

```sh
npm ci
npm run desktop
```

Electron is downloaded by the install script with its official checksum
verification. Injected HTTPS proxies are supported without disabling TLS.
The renderer is sandboxed with context isolation and no Node integration.
The desktop application makes no network requests and stores only its pet
and motion preferences. Cursor positions are used locally for animation.

For the website, `npm start` serves only `site/` on port 3000. Publish the
contents of `site/` to a static host. After editing desktop animation code,
run `npm run sync:preview` to copy the shared renderer into the playground.

## Verify and package

```sh
npm test
npm start
# In another terminal, with Chromium available:
npm run test:browser
npm run test:roam
# On a graphical Windows desktop:
npm run test:desktop
npm run package:desktop
```

Browser checks use Playwright and `CHROMIUM_PATH` (default `/usr/bin/chromium`).
Native checks use a temporary application-data directory and move/click the
real cursor, so run them on an isolated test desktop. Python is required by
the pointer test helper. Linux tests explicitly select a software graphics
backend on the isolated virtual display; this flag is not used in shipping.
Linux virtual-display tests verify native movement,
transparency, renderer reactions, and click-through separately; only Windows
checks verify global cursor stroking while click-through remains enabled.

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
