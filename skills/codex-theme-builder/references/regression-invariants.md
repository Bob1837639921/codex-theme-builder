# Shared regression invariants

Treat every verified visual fix as a reusable contract, not a theme-local patch. A
fix is complete only when the shared template, an automated guard, and live QA
cover the same failure mode. Preserve these invariants while changing palettes,
artwork, motion, or theme identity.

## Home action grid

- Keep each runtime-owned home action as three distinct vertically stacked rows:
  icon, title, then supporting description. Native button typography must never
  concatenate the title and description or distort the four equal-width tabs.
- Keep the four action buttons confined to the true home route and preserve the
  native composer-fill behavior without submitting the prompt.

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
- Themes whose `composer-edge` is already painted on `.composer-surface-chrome`
  must set `--theme-composer-host-edge-display: none` and explicitly suppress
  the host pseudo-element. Legacy themes may retain the shared parent carrier
  when their approved artwork depends on an outside-the-box ornament; never
  render the same asset on both layers.
- Keep the typing path free of theme rescans: character-only mutations inside
  `.ProseMirror`, `textarea`, or `input` must not schedule the global marker
  pass. Route and composer-host state belong on stable runtime classes or data
  attributes; do not use `:has()` selectors that are invalidated by every
  message or editor mutation.
- Do not combine `background-attachment: fixed` with a transparent scrolling
  conversation canvas. Avoid `backdrop-filter` on the composer itself because
  every caret and glyph update can repaint the pixels behind it; use an
  optically equivalent translucent solid surface instead.
- Background video is a route-scoped scene asset. Keep the route-local main
  surface as the default; only a theme that explicitly declares
  `windowVideoCanvas` may mount its video on the stable window canvas to prevent
  translucent native chrome from exposing a second static crop. Decode only the
  active route, remove audio, and isolate the video on a GPU layer. Low/off tiers
  and unrelated routes must not create or keep the video element alive.
- Discover the native conversation quick-jump rail through
  `data-thread-user-message-navigation-rail-list`, not localized `aria-label`
  text. Preserve Codex's buttons and scrolling behavior, but give every theme a
  two-tone marker treatment that remains visible on both pale and dark artwork.

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
- When Codex sets `data-title-aligned-trailing-rail="true"` on a genuine
  `[data-app-action-sidebar-thread-row]`, keep the native pin/archive carrier
  absolutely overlaid. Its generated `relative` utility must never consume a
  first line and push the title below the fixed 30 px row. Never apply this
  task-only geometry to generic sidebar navigation items.
- Style both the runtime marker and native ARIA fallback so row replacement does
  not flash or briefly lose its border.

## Shell, sidebar, and canvas continuity

- Keep the direct Codex content toolbar translucent on every themed home and
  conversation route. The shared runtime owns its low-opacity glass paint so a
  theme cannot accidentally restore a solid white, cream, or dark strip.
  Theme CSS owns only readable text/icon, divider, and hover colors. Preserve
  native height, drag behavior, buttons, pointer targets, and the system-owned
  Windows/Electron menu above it.
- Verify that the same scene artwork or active video remains visually
  continuous beneath the content toolbar. Do not add a second header crop or
  compensate for an opaque toolbar by shifting protected characters downward
  at runtime; reserve the chrome safe zone in the source artwork instead.

- Keep long native task lists cheap to scroll without removing theme detail.
  Apply `content-visibility: auto` and a 30 px intrinsic block size to the
  language-independent `data-app-action-sidebar-thread-row` boundary. Scope
  sidebar text shadows to actual text-bearing elements instead of the complete
  SVG/div subtree; preserve the same visible shadow, selected-row artwork,
  unread glow, hover actions, and native scroll container.
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
- Discover the thread-summary/output panel through the stable
  `thread-summary-panel-section-actions` slot and accept both legacy
  `bg-token-dropdown-background` and current `bg-surface-elevated-secondary`
  shells. Nested sticky section headings and their overscan pseudo-elements
  must be transparent to the theme-owned panel surface; never leave opaque
  white Environment information or Sources bands inside a themed panel.
- Keep the output panel's complete outer radius when adapting nested section
  headers. Do not group `.dream-output-panel` with compact file-change or queued
  message cards whose intentionally smaller radius would flatten the floating
  panel into a near-rectangular block.
- Diff-card undo/review actions must be marked as `.dream-diff-action-undo` or
  `.dream-diff-action-review` and receive an explicit surface plus foreground
  in dark themes. Keep the full-row review hit target and file-row buttons
  unmarked so native geometry and pointer behavior remain unchanged.
- Treat the transient multi-step walkthrough as a mixed light surface, not as a
  dark-theme popover. Detect its compact `current / total` step badge, mark only
  the nearby computed-light card and badge, and apply the independent
  `--dream-light-overlay-ink` foreground to instructions, radio circles, muted
  copy, and step text. Do not recolor unrelated dark Radix popovers.
- Do not apply universal descendants or broad `[data-state]` descendant color
  selectors across the conversation shell. Long streaming tasks can force
  thousands of selector rematches; target the Markdown root and explicit
  semantic surfaces instead.
- Keep native home promotions discoverable by semantic structure or natural
  `scrollHeight`; never depend on an already clipped rendered height. Promotions
  must not collapse into a white strip or push the home composer off-screen.
- Mark the native Home heading through `[data-feature="game-source"]` and hide
  only that semantic node while the themed overlay is active. Keep its parent
  layout in flow so the project selector and composer do not jump.
- Keep the native project selector geometry untouched. Shared CSS may prevent a
  translucent carrier from bleeding, but must not reconstruct the control.

## Static and video backgrounds

- Keep catalogs metadata-first: one shared `base.css`, theme-local CSS only once,
  zero Base64 raster/video payloads, and a normal injection payload below 1 MiB.
  Serve only manifest-validated images through the verified CDP request
  interceptor, and transfer only the active MP4 through the bounded runtime
  binding. Do not open a localhost HTTP port or weaken the app CSP.
- Every bundled theme must provide a dedicated 320x180 `previewImage` no larger
  than 256 KB. Load switcher previews only as cards enter its scroll viewport;
  never use a 4K home image as a thumbnail.
- Keep media references only for the active theme. After the atomic handoff,
  release any Blob URLs owned by the previous theme. Do not preload or decode
  inactive theme video.

- A catalog containing large raster or video assets must still inject reliably.
  Keep each CDP `Runtime.evaluate` message below the shared transport threshold,
  stage oversized payloads in uniquely named chunks, assemble them in the renderer,
  and always remove the staging buffer. Do not reduce source-media quality merely
  to fit the single-message limit.

- Treat home and conversation as independent scenes. Route changes must select
  matching posters and videos; never leave a previous poster visible beneath an
  opaque ready video.
- Use the shared atomic handoff for static, soft, and full tiers. Do not stack two
  character compositions, flash a poster during decoding, or keep both soft and
  full videos alive.
- For an explicit `windowVideoCanvas` theme, mount active and outgoing videos on
  the stable document canvas and remove the body poster only at the handoff's
  opaque swap point. Keep sidebar and controls above the pointer-free video and
  verify full-viewport coverage. For every other theme, keep both layers bounded
  to the active scene shell and do not silently change its approved crop.
- Preserve approved static masters and large-display clarity. Optimize delivery
  assets offline; do not add runtime sharpening or full-screen blur filters.

## Completion rule

Additional paint invariants:

- Dark themes set `--theme-home-top-fade-display: none` and verify both the
  stable Home top-fade class and current CSS-module carrier, including pseudo
  elements, leave no white shadow beneath the themed title.
- Inspect nested command/tool wrappers, not only outer `pre`/`code` elements:
  utility-colored descendants must resolve to `--theme-conversation-code-ink`.
- Thinking duration, timestamps, collapsed reasoning labels, and muted execution
  summaries must resolve to `--theme-conversation-muted-ink`; current Codex
  applies light-mode tertiary utilities directly to these descendants. Completed
  turn duration disclosures may instead use the newer `text-text/60` label and
  `text-text/40` chevron utilities; runtime must mark the exact disclosure as
  `.dream-turn-duration` rather than recoloring those broad utilities globally.
  Mark the live standalone `span.tabular-nums` duration too, since it has no
  disclosure button until the turn completes. Provide a narrow dark-theme CSS
  fallback for that tabular duration so its first paint is readable during the
  interval before the runtime marker pass attaches.
- Stopped-turn notices, model-change announcements, and compact “正在思考” /
  “Thinking” labels must be marked as `.dream-conversation-status-line` and
  resolve to `--theme-conversation-status-ink`. Mark the smallest stable row so
  its adjacent glyph inherits the same readable foreground; never fix these
  lines with a universal conversation-descendant color rule because that
  recolors light cards, diff semantics, and native controls.
- Every nested content-toolbar label and icon resolves to
  `--theme-toolbar-ink`; new muted utility wrappers must not hide actions.
- Command/tool activity headers use a separate conversation-body foreground.
  Their leading function glyph and disclosure chevron resolve through
  `--theme-conversation-activity-icon`; do not depend on readable label text to
  imply that the adjacent SVG controls are also readable. Cover both the legacy
  `text-token-*` icon utilities and current `text-text/60` activity SVGs. Keep the disclosure
  chevron softly visible at rest and fully visible on hover/focus; a correct
  color still appears absent when its native opacity utility remains zero.
- On dark themes, running activity and automatic context-compaction labels keep
  a readable resting foreground through `--theme-conversation-activity-ink`.
  Preserve the native cadence with the brighter
  `--theme-conversation-activity-highlight`; the moving shimmer must enhance the
  label instead of being the only moment when it can be read.
- Apply the same explicit text-fill token to completed, collapsed, and idle
  activity summaries. Do not derive their fill from `currentColor`: native
  important conversation-body utilities may still resolve that color to black.
- Electron application-menu buttons and glyphs resolve to
  `--theme-app-menu-ink`; setting foreground only on their parent is
  insufficient because native tertiary-text utilities override inheritance.
- Dark themes set `--theme-main-content-top-fade-display: none` when the native
  `_MainContentTopFade_*` white gradient conflicts with both Home and
  conversation artwork. Verify both routes, not only Home.
- Windows caption glyphs are native Electron chrome and may remain dark when
  Codex reports a light window mode. Dark themes provide a calm contrasting
  three-stop caption palette through `--theme-dark-caption-start`,
  `--theme-dark-caption-mid`, and `--theme-dark-caption-end`; shared runtime
  marks `data-dream-color-scheme="dark"` and composes the backing gradient only
  for dark themes. `--theme-window-controls-backdrop` remains an approved-theme
  override. Never
  draw replacement minimize, maximize, or close buttons or intercept clicks.
  Choose the backing plate per theme and preserve approved treatments: themes
  use the approved Wangshu-style structure by default—transparent at the left
  edge, a restrained translucent middle stop, and a readable pale right stop—
  so the caption area blends into artwork without a hard vertical seam. A
  previously approved custom gradient must not be replaced while fixing a
  different theme.
  Keep that pointer-free backing plate above route artwork and an opted-in
  full-window video canvas; a non-positive stacking layer can disappear behind
  moving artwork even though the same rule looks correct with static artwork.
- Composer submit and stop controls explicitly pair
  `--theme-composer-submit-surface` with `--theme-composer-submit-ink`. Do not
  inherit a black `bg-token-foreground` button over dark artwork.
- The create-project dialog is a mixed-surface portal: its shell may use the
  active dark theme, while the project-name and source-folder controls remain
  light. Runtime marks the dialog and both control groups semantically; their
  text, placeholder, folder glyph, explanatory copy, caret, and borders use
  `--dream-project-control-*` tokens instead of inherited dialog foregrounds.
  Keep those markers after a folder is selected and its button label changes to
  the real folder name. Detect both Create Project and Edit Project through the
  project-name field plus the source-section structure; never depend solely on
  the temporary Select/Add Folder button copy.
- The Sites route is a native non-conversation surface identified through the
  stable `#appgen-site-search` control. Its opaque main-surface utilities,
  sticky search rail, heading, empty state, search text, and placeholder must
  use `--dream-sites-*` tokens. The separate Before using Sites portal receives
  its own semantic marker so its title, body, bullets, links, close control, and
  Continue action never inherit unreadable global dialog colors.
  CDP verification recognizes this authenticated native feature route through
  the same stable search control in addition to the semantic shell/header; it
  must not require a conversation composer or `[role="main"]` to stay attached.
  The native sticky search carrier and its downward-fade pseudo-element remain
  fully transparent; only the bounded search control receives a themed surface.
- Sidebar task hover belongs to the complete `.sidebar-item` row, including
  its right action zone. Exclude task rows from generic circular button-hover
  effects, and never duplicate selected artwork on the nested title label.
- Current-task appearance is theme-local. Shared runtime CSS may expose stable
  markers and preserve native geometry, but must never impose a generic border,
  wash, seal, or background that overrides a theme's selected-row artwork.
- Current-task emphasis must not become a full-width opaque color tile. Each
  theme may use its approved scene-preserving ornament, edge cue, transparent
  emblem, and low-opacity wash. Native pin/archive controls receive only
  localized hover/focus surfaces and retain their geometry.
- A quiet selected-task variant must not erase another theme's identity motif.
  Keep it in the owning theme (for example Wangshu's transparent crescent), do
  not crop from an asset whose painted ground becomes a square tile, and never
  duplicate the motif on the nested label.
- The inline `编辑消息` form is a separate semantic surface from the composer.
  Runtime must mark its owning form as `.dream-message-editor`; its ProseMirror
  text/caret, placeholder, secondary cancel action, and primary send action each
  require explicit theme tokens. Never rely on inherited utility foregrounds,
  because dark themes otherwise produce near-black editor text and white-on-white
  cancel buttons.
- Conversation lifecycle labels and message action rows are semantic surfaces,
  not ordinary inherited prose. Runtime must mark the lifecycle carrier and the
  compact copy/rating/branch/edit action row; dark themes must provide explicit
  foreground and text-fill colors for both icons and labels without changing
  their native geometry. Native shimmer labels may contain an `aria-hidden`
  duplicate highlight layer, so lifecycle matching must normalize only direct
  text nodes. Styling must also color the shimmer highlight span, otherwise
  `正在思考` can collapse visually to a single animated character.

For a newly found regression: reproduce it in the live Codex DOM, identify the
native state change, implement the smallest shared invariant, add a deterministic
test when possible, update this reference and the QA checklist, hot-preview the
affected state, and validate every bundled theme. Do not mark the issue complete
from a static screenshot alone.

Any shared `base.css` or runtime behavior change must advance both
`SKIN_VERSION` and `RUNTIME_VERSION`. Hot preview intentionally reuses an
existing base-style node when versions match; failing to bump the version makes
new shared CSS appear present on disk while the live renderer keeps stale rules.
