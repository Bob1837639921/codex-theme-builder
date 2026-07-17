# Theme contract

Each theme is a self-contained directory. The runtime reads no theme asset outside that directory.

## Required files

```text
theme-id/
  theme.json
  theme.css
  home.png
  conversation.png
  selected-leaf.png  # optional selected-state raster marker
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
  "selectedLeaf": "selected-leaf.png",
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
- Provide all four SVG icons. Keep each below 64 KB and omit scripts, external references, event handlers, embedded images, and CSS `url()` values.
- Use six-digit hexadecimal colors.
- `conversationImage` may equal `image`.
- `selectedLeaf` is optional. When present it must be a local PNG or WebP no larger than 512 KB. The runtime exposes it as `--dream-selected-leaf`; use `none` as the CSS fallback.

## CSS scope

Start every override from `:root.codex-dream-skin` or one of the runtime classes beneath it. Useful stable runtime hooks include:

- `.dream-home` and `.dream-home-shell`
- `.dream-conversation`
- `.composer-surface-chrome`
- `#codex-dream-skin-title`
- `#codex-dream-skin-actions`
- `.dream-progress-pill` and `.dream-progress-indicator`
- `.dream-selected-thread` and `.dream-selected-thread-label`
- `.dream-output-panel`

The runtime exposes `--dream-art`, `--dream-conversation-art`, and the optional `--dream-selected-leaf` as data-backed CSS values, plus color tokens derived from the manifest. Keep pseudo-elements non-interactive with `pointer-events: none`.

Use detail marker classes only when their native surfaces are present. Scope searches to the composer, sidebar, or output region, and retain connected markers instead of rescanning the entire conversation on every mutation.

Codex uses sticky gradient layers around the composer. The bundled base runtime neutralizes the native `bg-gradient-to-t` rails around both the ordinary composer and the file-changes summary. Do not reintroduce opaque backgrounds on those ancestors.

## Visual asset guidance

- Compose home artwork for a wide hero area with safe text space.
- Compose conversation artwork for a tall working surface; keep message and composer zones low-contrast.
- Avoid high-frequency detail behind text and controls.
- Use separate art for home and conversation if one crop cannot serve both.
- Treat icon styling as part of the selected theme, not part of the runtime.
