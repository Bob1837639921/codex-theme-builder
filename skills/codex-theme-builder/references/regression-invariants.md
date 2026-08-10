# Shared regression invariants

Treat every verified visual fix as a reusable contract, not a theme-local patch. A
fix is complete only when the shared template, an automated guard, and live QA
cover the same failure mode. Preserve these invariants while changing palettes,
artwork, motion, or theme identity.

## Composer and conversation chrome

- Keep `.composer-surface-chrome` on a transparent two-pixel border. Current
  Electron builds may force its semantic border width to zero; match the
  window-scoped selector and restore the transparent border so padding-box and
  border-box paints cannot expose a white inner frame.
- Remove the native conversation-only sticky `bg-gradient-to-t` fade behind the
  composer. Scope this reset to `main.dream-conversation-shell`; do not use a
  broad home-page reset.
- Verify all four composer edges in a populated conversation, then repeat with a
  multiline composer, file-change summary, running/stop state, and narrow window.
  A fix that hides only the left and right rails is incomplete.
- Attach ornamental borders to the composer box, never the viewport or a fixed
  ancestor. Preserve native controls and hit targets.

## Selected task and transient controls

- Render `--dream-selected-leaf` as the selected row background. Background art
  never participates in layout and must not be moved into a flex child.
- Preserve Codex's native absolute positioning for the status, unread,
  pin/archive, and loading layers. Never apply `position: relative !important`
  to every direct child of `.dream-selected-thread` or
  `[aria-current="page"].sidebar-item`; that converts the absolute action layer
  into normal flow and pushes the title below the 30 px row.
- Keep the title single-line, vertically centered, and stable while the loading
  spinner appears, disappears, or changes into hover actions. Test both a short
  and long title and compare bounding boxes before and during a running turn.
- Style both the runtime marker and native ARIA fallback so row replacement does
  not flash or briefly lose its border.

## Shell, sidebar, and canvas continuity

- Keep the active theme on the semantic shell when the native sidebar is
  collapsed. The sidebar switcher may disappear with its anchor, but background,
  motion tier, composer, and content styling must remain active and be restored
  without resetting state when the sidebar returns.
- Mount a continuous scene once on the correct stable canvas. Do not paint the
  same raster independently on sidebar and conversation containers, because
  separate `cover` crops split characters and scenery and expose solid-color
  seams when the sidebar width changes.
- Preserve native header geometry. Theme the verified header surface and icons;
  do not offset the toolbar to compensate for one viewport.
- Use the full-scene transparent-layer treatment as the default for new
  character themes: the conversation artwork continues behind the message area,
  operation surfaces, and content toolbar. Keep the toolbar translucent and
  locally contrast-safe instead of replacing it with an unrelated opaque band.
- Protect character heads from chrome cropping. Reserve the upper 12% of a 16:9
  master for low-detail overscan, keep the head below that boundary and the eyes
  below roughly 18%, then test both narrow and wide `cover` crops.

## Native and portaled surfaces

- Keep output panels, file-change summaries, queued follow-ups, usage panels,
  menus, dialogs, and popovers as explicit semantic surfaces. Set descendant
  `color` and `-webkit-text-fill-color` where native utility classes override
  inheritance, especially for dark themes.
- Keep native home promotions discoverable by semantic structure or natural
  `scrollHeight`; never depend on an already clipped rendered height. Promotions
  must not collapse into a white strip or push the home composer off-screen.
- Keep the native project selector geometry untouched. Shared CSS may prevent a
  translucent carrier from bleeding, but must not reconstruct the control.

## Static and video backgrounds

- Treat home and conversation as independent scenes. Route changes must select
  matching posters and videos; never leave a previous poster visible beneath an
  opaque ready video.
- Use the shared atomic handoff for static, soft, and full tiers. Do not stack two
  character compositions, flash a poster during decoding, or keep both soft and
  full videos alive.
- Preserve approved static masters and large-display clarity. Optimize delivery
  assets offline; do not add runtime sharpening or full-screen blur filters.

## Completion rule

For a newly found regression: reproduce it in the live Codex DOM, identify the
native state change, implement the smallest shared invariant, add a deterministic
test when possible, update this reference and the QA checklist, hot-preview the
affected state, and validate every bundled theme. Do not mark the issue complete
from a static screenshot alone.
