# Visual lock and theme-switcher contract

Use this contract whenever a real Codex screenshot is available or an in-app theme switcher is requested.

## 1. Lock the native product

Treat the baseline screenshot as an edit target, not loose inspiration. Preserve:

- window and title-bar geometry;
- sidebar width, navigation order, project/task hierarchy, and account area;
- conversation column position and width;
- native message, tool, code, diff, progress, and file-change structures;
- composer position, dimensions, controls, and surrounding sticky layers;
- output-panel placement and every visible native label.

Do not invent or relocate product surfaces. In particular, do not add a file explorer, IDE editor, dashboard column, character rail, permanent inspector, or renamed navigation unless the baseline already contains it or a verified runtime augmentation explicitly maps it.

## 2. Grade every visible change before previewing

Add a `Grade` column to the provisional implementation map:

| Grade | Meaning | Preview rule |
|---|---|---|
| A | Existing native surface with a stable hook | Allowed |
| B | Scoped CSS or raster decoration on an existing surface | Allowed |
| C | Shared runtime augmentation with an exact anchor and interaction contract | Allowed only when the user explicitly requested the feature |
| X | No reliable hook, destructive modification, or invented product structure | Forbidden |

Every visible preview element must have an A, B, or explicitly requested C row. Remove X rows before image generation.

## 3. Generate constrained previews

Use image editing when the baseline screenshot is available. In the prompt:

1. Identify the baseline as the locked edit target.
2. List immutable geometry and native labels.
3. List only the allowed A/B/C changes.
4. State that artwork must sit behind or inside existing surfaces and keep text-safe zones.
5. Forbid new panels, columns, navigation, controls, project trees, code editors, and copy.

Reject the output if native geometry drifts visibly. Do not present a beautiful but unmappable redesign as an implementation-ready option.

## 4. Integrate characters and scenes safely

- Use characters as background or edge artwork with `pointer-events: none`.
- Keep faces, weapons, and high-frequency detail outside message, code, diff, and composer reading zones.
- Use scenes as low-contrast home or conversation artwork, not as a reason to restructure the app.
- Map sidebar texture, selected-state art, and conversation art to the existing theme asset variables.
- Prefer separate crops for home, conversation, and sidebar.

## 5. Design an in-app switcher only after mapping it

The current schema activates one theme. A live switcher therefore requires a shared runtime augmentation. Before previewing it, define:

- catalog source and allowed theme directories;
- active-theme storage and startup restoration;
- atomic replacement of manifest colors, CSS, and raster assets;
- failure rollback to the previously active theme;
- exact native anchor and injected root;
- pointer, keyboard, focus, narrow-window, and reduced-motion behavior.

Use `#codex-dream-theme-switcher` as the injected root. Anchor it inside the verified `aside.app-shell-left-panel`. Prefer the bottom-left account area by default, but when the user explicitly selects a reference with a top-sidebar trigger, place it near the sidebar header and let the card panel extend right without moving native controls. Do not place it in the Windows title bar, conversation toolbar, composer, or output panel unless a current DOM inspection proves a more stable anchor.

If those requirements are not implemented and validated, show launcher-based selection instead of claiming live in-app switching.

Treat the switcher as a theme library rather than a fixed demo grid. Keep the
card region viewport-bounded and internally scrollable. For catalogs with more
than six themes, expose an accessible text search that filters by theme name,
subtitle, and ID without rebuilding the cards. Represent the active theme with
card emphasis plus a compact corner icon; never cover preview artwork with
active-state text or oversized checkmarks. Keep enough internal
grid padding for focus and selected borders, and do not move cards on hover.
Filtering, opening, and selecting may update the small switcher subtree only
and must not trigger document-wide rescans.
