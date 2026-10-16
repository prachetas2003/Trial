Buildlings 0.11.0 reduces marker rendering cost, steadies frame timing and makes celebrations clearer.

- Reuses bounded marker textures instead of rebuilding every unchanged ink
  stroke, grain pass and shadow on every frame. Moving limbs, expressions,
  springy interactions and the live petting sheen remain animated. The drawing
  cache is capped at 8 MB; geometry reuse is bounded as well.
- Replaces timestamp-reset throttling with a phase-based frame deadline. Normal
  painting and native movement reports target 60 fps across 60/120/144/165/240 Hz
  displays; small RAF jitter no longer unnecessarily skips frames. Safe Mode
  retains its 30 fps limit. Timer hit-region measurements no longer force layout
  on every frame when the timer has not changed.
- Triples confetti: 48 local pieces at 25%, 50% and 75%; completion has 42 local
  and 102 screen pieces. Milestones remain local, decorations stay click-through,
  particles clean up, and the off/reduced-motion switches remain respected.
- Celebration bubbles have a larger bold heading, a separate short detail line,
  a check icon, light/dark styling and a longer readable duration. They appear
  above the monkey, with placement kept inside the screen.

Measured software-raster tests compare cached and uncached drawing at 1x/2x,
check artwork pixels, colour changes and cache bounds, and exercise the native
app while walking and showing quotes plus triple confetti. Frame-clock tests
cover high-refresh displays, jitter and wake timing. These checks cannot promise
an achieved frame rate on every laptop. Windows software graphics and the
separate input surfaces remain in place to preserve the previous video fixes.

The existing quote bank, timer, browser blocking, saved data and five play
interactions remain. Quit the old app, extract the complete ZIP into a fresh
folder and open Buildlings.exe. No extension update is required.
