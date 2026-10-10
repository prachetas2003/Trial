# Prepared release

Files are in `/workspace/buildlings-release/`:

- `buildlings.html`: a self-contained app for a quick local preview. Download it and open it in a browser; floating mode may require a hosted secure page or local development server.
- `buildlings-web-preview.zip`: the free public website, with `index.html` at the ZIP root.
- `after-hours-pack.zip`: the separate cosmetic product delivery file. Do not upload this to the public website.
- `after-hours/`: unpacked cosmetic files for review.
- `sha256.txt`: archive hashes.

## Public website

Upload the public website to a static HTTPS host under an account you control. A free static hosting plan is sufficient for a small test; review the provider's current terms. The app does not need a domain purchase or AI API spending. The environment has not published it.

Check the live page on a phone and a desktop. In desktop Chrome or Edge, click “Float beside my work,” start and finish a build in the floating window, refresh the main page to verify progress, and download a share card. If moving from a test address to a new address, export and restore progress because browser storage is tied to the origin. The browser Picture-in-Picture feature can be blocked inside an iframe; provide a standalone page for floating mode.

## Cosmetic product

Import `after-hours/after-hours.json` through the app's “Add a colour pack.” Unlock/select the pets to review all three colour schemes. Export a backup and verify the colours survive restoration. Use “Use classic colours” to switch back; re-import the file to use the pack again.

A listing can use this factual description:

> **After Hours — a colour pack for Buildlings**
>
> Give your tiny coding friends an evening palette: blue-hour Sprout, candlelit Ember, and rose-cloud Orbit. Includes a colour-pack file, three original SVG stickers, and a 1600 × 900 wallpaper. One purchase, downloaded files, no subscription.
>
> Requires the free Buildlings browser app. Import the JSON file using “Add a colour pack.” Pet unlocks still follow the free app's build milestones. Floating mode requires a compatible desktop browser. This pack does not connect to your editor or agent.

Proposed price: C$6 before any applicable taxes. There is no live payment link. Review the license and final product before creating the listing. The seller must set up the actual checkout, automated delivery, customer contact, and applicable refund/tax terms on their chosen platform. Do not expose API keys in the public app. The initial product is a digital download, so the app needs no checkout integration.

## Demonstration script

“My AI agent is working. My desk now has this little guy.”

Show the floating companion next to an editor. Start a build and boop the pet.

“When I finish something, we celebrate. Tiny win, tiny friend.”

Mark a build shipped and show the unlocked pet. End on the share card and the real published address once it exists.

## Draft launch post (not sent)

“I built a tiny companion for the time between ‘agent is working’ and ‘I shipped it.’ It floats beside your work, cheers for small wins, and unlocks a couple of friends. No API keys or agent access; you mark builds yourself. The preview is free. I’d love to know whether you’d actually keep it around for a coding session. [Add the published URL before posting.]”
