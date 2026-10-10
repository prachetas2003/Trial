# Public previews

GitHub Pages serves the public browser companion from the `gh-pages` branch:
https://prachetas2003.github.io/Trial/

The user supplied a recording of this deployed page. The movement playground
is at `roam/`; its assets share the desktop motion model and renderer. The
playground now renders real 3D geometry locally. A browser can move the pet
within its page only. Native desktop motion requires
the Windows application.

The Windows workflow runs on source pushes to `main`. Passing motion and
native Windows tests produces a portable ZIP, a checksum, and a public
prerelease at https://github.com/prachetas2003/Trial/releases.
An artifact is also saved in the workflow run. Publishing requires repository
Actions to be enabled and the workflow's built-in token to have contents write
permission. No separately supplied token is needed.

The cloud's GitHub API egress restriction does not prevent Git HTTPS pushes.
An environment network draft was saved for review; it does not change running
network access until the user saves and publishes the environment settings.

Never include the separate paid cosmetic delivery files in public deployment.
