# Theme contract

Each theme is a self-contained directory. The runtime reads no theme asset outside that directory.

## Required files

```text
theme-id/
  theme.json
  theme.css
  home.png
  conversation.png
  sidebar.png       # optional sidebar texture
  motion.webp       # optional pre-rendered localized motion loop
  selected-leaf.png  # optional selected-state raster marker
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
  "conversationImage": "conversation.png",
  "sidebarImage": "sidebar.png",
  "motionImage": "motion.webp",
  "selectedLeaf": "selected-leaf.png",
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
- `sidebarImage` is optional. When present it must be a local PNG, JPEG, or WebP image no larger than 8 MB; the runtime exposes it as `--dream-sidebar-art`.
- `motionImage` is optional. It must be a local animated or static WebP no larger than 2 MB; the runtime exposes it as `--dream-motion-art`. Keep it localized and masked instead of stretching it over the full workspace.
- Provide all four SVG icons. Keep each below 64 KB and omit scripts, external references, event handlers, embedded images, and CSS `url()` values.
- Use six-digit hexadecimal colors.
- `conversationImage` may equal `image`.
- `selectedLeaf` is optional. When present it must be a local PNG or WebP no larger than 512 KB. The runtime exposes it as `--dream-selected-leaf`; use `none` as the CSS fallback.
- `composerEdge` is optional. It may be a filename for compatibility or an object containing `image`, `horizontal`, `vertical`, `maxHeight`, and `opacity`. The image must be a local transparent PNG or WebP no larger than 2 MB. Horizontal anchors are `left`, `center`, or `right`; vertical anchors are `top`, `center`, or `bottom`; `maxHeight` is 48–384 CSS pixels; opacity is 0.2–1. The runtime exposes image, position, height cap, and opacity as CSS variables. Keep the center and native control zones transparent.

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
- `.dream-selected-thread` and `.dream-selected-thread-label`
- `.dream-output-panel`

The runtime exposes `--dream-art`, `--dream-conversation-art`, the optional `--dream-sidebar-art`, `--dream-motion-art`, `--dream-selected-leaf`, and `--dream-composer-edge` as data-backed CSS values, plus color tokens derived from the manifest. Keep pseudo-elements non-interactive with `pointer-events: none`.

Define `--dream-light-overlay-ink` independently from `--dream-ink`. Codex's sidebar usage/credits warning remains a light native card in both light and dark themes, so it must use a dark readable foreground even when the main theme text is near-white. Do not include that status card in broad dark dialog, menu, or Radix descendant selectors.

Use detail marker classes only when their native surfaces are present. Scope searches to the composer, sidebar, or output region, and retain connected markers instead of rescanning the entire conversation on every mutation.

The neutral scaffold already treats `.dream-file-changes-summary` and portaled `[role="dialog"]` content as mandatory semantic surfaces. Preserve those blocks when creating a theme. Override their tokens or presentation for the visual direction; do not remove the complete-card styling, explicit descendant foregrounds, muted text, links, disabled states, or green/red diff semantics. In dark themes, setting only the outer `color` is insufficient because Codex utility classes may assign nested foreground and WebKit text-fill values.

The shared switcher persists a global motion preference on the root as `data-dream-motion="off|low|medium|high"`. New theme motion must use these four levels rather than inventing a separate toggle. The levels are effect tiers, not opacity presets: low keeps one quiet primary accent; medium adds a second kind of atmosphere; high adds a deliberately richer third treatment such as denser motes, glints, or a second trajectory. Speed, travel, and opacity may reinforce those differences but must not be the only differences. Use the neutral `--theme-atmosphere-*` variables or define theme-local variables per level. Add `.dream-theme-motion` and the appropriate secondary/tertiary tier class to real decoration nodes; for pseudo-elements, add equivalent theme-scoped selectors. `prefers-reduced-motion: reduce` always wins and must stop every custom animation regardless of the selected level.

Codex uses sticky gradient layers around the composer. The bundled base runtime neutralizes the native `bg-gradient-to-t` rails around both the ordinary composer and the file-changes summary. Do not reintroduce opaque backgrounds on those ancestors.

The home title and action grid must be mounted in `#codex-dream-home-overlay`, not inside Codex's narrow native hero child. The runtime may mark the native project selector with `.dream-project-picker` for inspection. Preserve the selector's native geometry, spacing, radius, colors, shadow, stacking, and interaction styling. Shared CSS may only clip overflow from the native selector carrier when it extends beyond its own row and bleeds through a translucent themed composer. Do not reconstruct or visually reskin the selector itself.

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
