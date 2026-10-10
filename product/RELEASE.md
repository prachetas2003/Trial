# Prepared release

Files are in `/workspace/buildlings-release/`:

- `buildlings.html`: a self-contained app for a quick local preview. Download it and open it in a browser; this is an older browser-only snapshot. Use the hosted movement playground for current mechanics.
- `buildlings-web-preview.zip`: the free public website, with `index.html` at the ZIP root.
- `after-hours-pack.zip`: the separate cosmetic product delivery file. Do not upload this to the public website.
- `after-hours/`: unpacked cosmetic files for review.
- `sha256.txt`: archive hashes.

## Public previews

The browser companion is published at https://prachetas2003.github.io/Trial/.
The movement playground is at https://prachetas2003.github.io/Trial/roam/.
It previews the same motion model and animation as the native desktop pet.

The Windows preview is published through GitHub Releases. Download its ZIP,
extract all files, and open Buildlings.exe. See DESKTOP_README.txt for details.
Windows native interaction checks passed in the release workflow. The app is
unsigned and targets Windows 10/11 x64.

The boxed browser Picture-in-Picture overlay has been removed. The browser
playground stays in its page; the native Windows pet moves over applications.
The desktop pet currently provides roaming and reactions, while build sessions
and colour-pack import are features of the browser companion.

## Cosmetic product

Import `after-hours/after-hours.json` through the app's “Add a colour pack.” Unlock/select the pets to review all three colour schemes. Export a backup and verify the colours survive restoration. Use “Use classic colours” to switch back; re-import the file to use the pack again.

A listing can use this factual description:

> **After Hours — a colour pack for Buildlings**
>
> Give your tiny coding friends an evening palette: blue-hour Sprout, candlelit Ember, and rose-cloud Orbit. Includes a colour-pack file, three original SVG stickers, and a 1600 × 900 wallpaper. One purchase, downloaded files, no subscription.
>
> Requires the free Buildlings browser app. Import the JSON file using “Add a colour pack.” Pet unlocks still follow the free app's build milestones. The roaming Windows pet is a separate preview and does not import this pack yet. This pack does not connect to your editor or agent.

Proposed price: C$6 before any applicable taxes. There is no live payment link. Review the license and final product before creating the listing. The seller must set up the actual checkout, automated delivery, customer contact, and applicable refund/tax terms on their chosen platform. Do not expose API keys in the public app. The initial product is a digital download, so the app needs no checkout integration.

## Demonstration script

“My AI agent is working. My desk now has this little guy.”

Show the native companion wandering over an editor, then stroke it with the cursor to make sparkles. Demonstrate browser builds separately.

“When I finish something, we celebrate. Tiny win, tiny friend.”

Mark a build shipped and show the unlocked pet. End on the share card and the real published address once it exists.

## Draft launch post (not sent)

“I built a tiny companion for the time between ‘agent is working’ and ‘I shipped it.’ The Windows pet wanders over your desktop and reacts to cursor strokes; the browser companion celebrates manual builds and unlocks friends. No API keys or agent access; you mark builds yourself. The preview is free. I’d love to know whether you’d actually keep it around for a coding session. [Add the published URL before posting.]”
