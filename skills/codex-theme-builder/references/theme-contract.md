# Theme contract

Each theme is a self-contained directory. The runtime reads no theme asset outside that directory.

## Required files

```text
theme-id/
  theme.json
  theme.css
  home.png
  preview.webp      # required 320x180 switcher thumbnail
  conversation.png
  usage-background.webp  # required dedicated usage-details artwork
  sidebar.png       # optional sidebar texture
  motion.webp       # optional pre-rendered localized motion loop
  home-motion-soft.mp4  # optional low-tier home video
  conversation-motion-soft.mp4 # optional low-tier conversation video
  home-motion.mp4       # optional home video, high motion tier only
  conversation-motion.mp4 # optional conversation video, high motion tier only
  selected-thread-background.png  # required selected-row background for new themes
  composer-edge.png  # optional transparent composer-edge artwork
  icon-build.svg
  icon-analyze.svg
  icon-automate.svg
  icon-debug.svg
```

The image names are configurable. `theme.css` is optional to the runtime but generated for every scaffold.

## Manifest schema

```json
{
  "schemaVersion": 1,
  "id": "theme-id",
  "name": "Theme name",
  "subtitle": "CODEX THEME",
  "image": "home.png",
  "previewImage": "preview.webp",
  "conversationImage": "conversation.png",
  "usageImage": "usage-background.webp",
  "sidebarImage": "sidebar.png",
  "motionImage": "motion.webp",
  "homeSoftVideo": "home-motion-soft.mp4",
  "conversationSoftVideo": "conversation-motion-soft.mp4",
  "homeVideo": "home-motion.mp4",
  "conversationVideo": "conversation-motion.mp4",
  "windowVideoCanvas": false,
  "selectedLeaf": "selected-thread-background.png",
  "composerEdge": {
    "image": "composer-edge.png",
    "horizontal": "left",
    "vertical": "bottom",
    "maxHeight": 128,
    "opacity": 0.84
  },
  "icons": {
    "build": "icon-build.svg",
    "analyze": "icon-analyze.svg",
    "automate": "icon-automate.svg",
    "debug": "icon-debug.svg"
  },
  "colors": {
    "accent": "#58766c",
    "accentAlt": "#8aa69b",
    "surface": "#f4f0e6",
    "text": "#26332f"
  }
}
```

Rules:

- Use `schemaVersion: 1`.
- Keep every asset filename local: no directories, URLs, data URLs, or traversal.
- Use PNG, JPEG, or WebP raster images no larger than 8 MB each.
- `previewImage` is required for bundled and newly generated themes. It must be a dedicated 320x180 PNG, JPEG, or WebP derivative no larger than 256 KB. Never point it at the full-canvas home artwork: the switcher loads previews only when their cards enter its scroll viewport.
- `sidebarImage` is optional. When present it must be a local PNG, JPEG, or WebP image no larger than 8 MB; the runtime exposes it as `--dream-sidebar-art`.
- `motionImage` is optional. It must be a local animated or static WebP no larger than 2 MB; the runtime exposes it as `--dream-motion-art`. Keep it localized and masked instead of stretching it over the full workspace.
- `homeVideo` and `conversationVideo` are optional and independent. Each must be a local MP4 no larger than 8 MB and may run only under `data-dream-motion="high"`. Generate each video from its matching `image` or `conversationImage`; never reuse an unrelated scene or allow the static poster to remain visible beneath an opaque ready video. The shared runtime switches sources with the route, creates only the active video lazily, pauses it while the document is hidden, removes it when leaving the high tier or switching themes, and always falls back to the declared static artwork under reduced motion. Legacy `backgroundVideo` is accepted only as an alias for `conversationVideo`.
- `windowVideoCanvas` is an optional boolean and defaults to `false`. Enable it only for a theme whose approved moving scene must continue behind translucent native menu and toolbar chrome. Opted-in videos mount on the stable full-window canvas; all other themes retain the established route-local main-surface video geometry. Never enable it catalog-wide to solve a single theme's crop mismatch.
- Video handoff is an atomic shared-runtime contract. The incoming video remains paused on its decoded first frame while the old static art or outgoing video stays untouched. A transient, theme-colored `#codex-dream-video-handoff-shield` fades in above both backgrounds but below all Codex content. At the shield peak, runtime applies `is-handoff-swap`, `is-ready`, and `is-covering` together, retires the old background, then fades the shield out over the frozen incoming frame. Playback starts only after the shield leaves. Theme CSS may use `is-ready` to reveal video, but must use `is-covering` for static-background removal. Do not implement per-theme crossfades between differently composed character frames: the atomic shield prevents protected-subject position snaps on first home load, motion-tier changes, theme changes, and home/conversation route changes without decoding every theme video.
- `homeSoftVideo` and `conversationSoftVideo` are optional low-tier counterparts. Use them only when the approved soft effect itself is pre-rendered and cannot be reproduced faithfully with lightweight CSS or a localized `motionImage`. Keep protected subjects static or nearly static, restrict motion to sparse environmental accents, encode no audio, and prefer 720p/24 fps so the soft tier remains materially cheaper than the full tier. The runtime must replace a soft source atomically when switching to the full source; it must never stack both videos.
- Directional phenomena such as bubbles, rain, snow, falling petals, smoke drift, or rising motes must never use a forward-then-reverse or ping-pong loop. Give each particle a one-way lifecycle, hide its respawn at a boundary, and make its route periodic at the clip duration. If a generative video changes protected subjects or reverses directional motion, reject it and build the environmental motion as a deterministic overlay on the approved static scene instead.
- If an approved forward clip has a visible loop jump, choose cyclic cut points by comparing protected-subject similarity near the beginning and end, then build a short tail-to-head forward crossfade followed by a wrap to the matching forward frame. Do not use a simple whole-clip crossfade whose final head frame jumps backward to frame zero, and do not trade the seam jump for visible double faces, hands, weapons, instruments, or silhouettes.
- Themes may display the runtime-owned `#codex-dream-motion-layer` when a `motionImage` should wander across the viewport. It contains three `.dream-motion-wanderer` elements whose route variables are randomized again only after the current animation has faded to zero. The shared base keeps this layer hidden, so each theme must opt in explicitly at its intended motion tier and preserve `pointer-events: none`.
- Provide all four SVG icons. Keep each below 64 KB and omit scripts, external references, event handlers, embedded images, and CSS `url()` values.
- Use six-digit hexadecimal colors.
- `conversationImage` may equal `image`.
- `usageImage` is required. It must be a local PNG, JPEG, or WebP no larger than 300 KB. The runtime exposes it as `--dream-usage-art`; never reuse the home or conversation image.
- `selectedLeaf` is required for newly generated themes (the runtime still accepts its absence for legacy external packages). It must be a local transparent PNG or WebP no larger than 512 KB and is exposed as `--dream-selected-leaf`. Author it as a complete selected-row background, preferably near 640×72 px: keep roughly the center 60% low-detail and text-free, place identity artwork toward the ends, and leave the right action zone calm. Render it once on `.dream-selected-thread` and `[aria-current="page"].sidebar-item` with `background-size: 100% 100%`; never add a delayed duplicate to the label.
- `composerEdge` is optional. It may be a filename for compatibility or an object containing `image`, `horizontal`, `vertical`, `maxHeight`, and `opacity`. The image must be a local transparent PNG or WebP no larger than 2 MB. Horizontal anchors are `left`, `center`, or `right`; vertical anchors are `top`, `center`, or `bottom`; `maxHeight` is 48–384 CSS pixels; opacity is 0.2–1. The runtime exposes image, position, height cap, and opacity as CSS variables. Keep the center and native control zones transparent.

Preserve the selected row's native absolute status/action layer. Do not force `position: relative !important` on every direct child of `.dream-selected-thread` or `[aria-current="page"].sidebar-item`; loading, unread, pin, and archive controls must overlay the row without consuming a line or moving the title.

## CSS scope

Start every override from `:root.codex-dream-skin` or one of the runtime classes beneath it. Useful stable runtime hooks include:

- `.dream-home` and `.dream-home-shell`
- `.dream-home-stage` and `.dream-home-hero` for the full-width native home structure
- `#codex-dream-home-overlay` for the title and four reusable home actions
- `.dream-project-picker` for the project selector immediately above the home composer
- `.dream-conversation`
- `.composer-surface-chrome`
- `#codex-dream-skin-title`
- `#codex-dream-skin-actions`
- `.dream-progress-pill` and `.dream-progress-indicator`
- `.dream-file-changes-summary` for the complete native file-change card, including its `.group\/turn-diff-header`
- `.dream-queued-message-list` for queued follow-up guidance above the composer
- `.dream-selected-thread` and `.dream-selected-thread-label`
- `.dream-output-panel`
- `.dream-usage-panel`

The runtime exposes `--dream-art`, `--dream-conversation-art`, the optional `--dream-usage-art`, `--dream-sidebar-art`, `--dream-motion-art`, `--dream-selected-leaf`, and `--dream-composer-edge` as data-backed CSS values, plus color tokens derived from the manifest. Keep pseudo-elements non-interactive with `pointer-events: none`.

Define `--dream-light-overlay-ink` independently from `--dream-ink`. Codex's sidebar usage/credits warning remains a light native card in both light and dark themes, so it must use a dark readable foreground even when the main theme text is near-white. Do not include that status card in broad dark dialog, menu, or Radix descendant selectors.

The full usage-details dialog is a required, separate surface from the compact quota warning. Every theme must explicitly define `--dream-usage-ink`, `--dream-usage-muted`, `--dream-usage-accent`, `--dream-usage-overlay`, and `--dream-usage-border`. Theme it through `.dream-usage-panel`; the reading overlay must preserve contrast for the title, reset dates, availability chips, progress indicator, close control, disabled states, and actions.

Use detail marker classes only when their native surfaces are present. Scope searches to the composer, sidebar, or output region, and retain connected markers instead of rescanning the entire conversation on every mutation.

Queued follow-up guidance is a separate native surface above the composer. Theme it through `.dream-queued-message-list`; explicitly coordinate its background, primary and secondary copy, action icons, hover state, and attachment preview border. Do not rely on the composer foreground alone because Codex may render this queue as a light input surface even inside a dark conversation theme.

The neutral scaffold already treats `.dream-file-changes-summary` and portaled `[role="dialog"]` content as mandatory semantic surfaces. Preserve those blocks when creating a theme. Override their tokens or presentation for the visual direction; do not remove the complete-card styling, explicit descendant foregrounds, muted text, links, disabled states, or green/red diff semantics. In dark themes, setting only the outer `color` is insufficient because Codex utility classes may assign nested foreground and WebKit text-fill values.

The shared switcher persists a global motion preference on the root as `data-dream-motion="off|low|high"`, displayed as `关闭 / 柔和 / 完整`. New theme motion must use these three levels rather than inventing a separate toggle. Legacy stored `medium` values migrate to `low`. The levels are effect tiers, not opacity presets: `low` normally retains the theme's lightweight CSS/WebP accent, but may use an explicitly approved `homeSoftVideo` / `conversationSoftVideo` pair when faithful deterministic motion requires it; `high` may add the full scene video plus secondary and tertiary treatments such as denser motes, glints, or more trajectories. Speed, travel, and opacity may reinforce those differences but must not be the only differences. Use the neutral `--theme-atmosphere-*` variables or define theme-local variables per level. Add `.dream-theme-motion` and the appropriate secondary/tertiary tier class to real decoration nodes; for pseudo-elements, add equivalent theme-scoped selectors. `prefers-reduced-motion: reduce` always wins and must stop every custom animation regardless of the selected level.

Codex uses sticky gradient layers around the composer. The bundled base runtime neutralizes the native `bg-gradient-to-t` rails around both the ordinary composer and the file-changes summary. Do not reintroduce opaque backgrounds on those ancestors.

Current Electron builds may also force the semantic composer border width to zero. Keep the template's window-scoped transparent two-pixel border restoration and the conversation-scoped sticky-fade reset together; removing either can expose an opaque rectangular frame on one or all four sides of the conversation composer.

The home title and action grid must be mounted in `#codex-dream-home-overlay`, not inside Codex's narrow native hero child. The runtime may mark the native project selector with `.dream-project-picker` for inspection. Preserve the selector's native geometry, spacing, radius, colors, shadow, stacking, and interaction styling. Shared CSS may only clip overflow from the native selector carrier when it extends beyond its own row and bleeds through a translucent themed composer. Do not reconstruct or visually reskin the selector itself.

The direct native content toolbar `main.main-surface > header.app-header-tint` is part of the themed scene, not an opaque card. The shared runtime enforces a low-opacity, lightly blurred glass surface across home and conversation routes so the matching artwork or video remains visible beneath it. Theme CSS may set readable foreground, icon, divider, and hover colors, but must not restore an opaque fill, heavy blur, second raster crop, fixed height, or altered native control geometry. The Windows/Electron menu strip above this toolbar remains system-owned.

Home artwork must cover the real `.dream-home-shell` / `.dream-home` canvas. Treat `.dream-home-hero` only as a transparent, square-cornered layout host; do not paint the main raster, add a card border, rounded corners, outer margins, or a drop shadow there. The default home direction is a full-scene workspace, not an inset photograph.

Codex's native `.app-shell-main-content-top-fade` is a white home-route gradient. Preserve it for light themes when it supports the toolbar transition, but disable it inside an individual dark theme when it produces a conspicuous horizontal glow. This is theme-level styling, not a shared-runtime default.

## Visual asset guidance

- Compose home artwork for a wide hero area with safe text space.
- Compose conversation artwork for a tall working surface; keep message and composer zones low-contrast.
- Avoid high-frequency detail behind text and controls.
- Use separate art for home and conversation if one crop cannot serve both.
- Treat icon styling as part of the selected theme, not part of the runtime.
- Follow `artwork-quality.md` for full-canvas resolution, offline super-resolution, WebP encoding, payload targets, and large-viewport QA.
- Treat 3200 px as the warning threshold and 3840 px as the preferred width for full-canvas artwork intended for large desktop displays. This is a quality recommendation, not a manifest compatibility requirement.

## In-app theme switching

Each schema-version-1 manifest still describes one theme. The bundled v2 runtime opts into live switching when a sibling `theme-catalog.json` is present; without that file it loads only the selected theme and keeps launcher-based selection.

When the user requests an in-app switcher:

- Read `visual-lock-and-switcher.md` before previewing or coding it.
- Treat the switcher as a shared runtime augmentation, not ordinary theme CSS.
- Define the theme catalog, active-theme persistence, asset loading, rollback behavior, and exact DOM anchor in the implementation map before showing the control in a preview.
- Prefer one compact control anchored inside `aside.app-shell-left-panel`, normally beside the existing account/settings area. Do not move native navigation or cover thread actions.
- Use the stable runtime ID `#codex-dream-theme-switcher` for the injected root and keep all pointer and keyboard behavior inside that root.
- Fall back to the existing launcher-based theme selection when live switching cannot be validated safely.
