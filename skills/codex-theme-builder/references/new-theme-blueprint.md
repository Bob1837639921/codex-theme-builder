# Reusable new-theme blueprint

Read this reference whenever creating, porting, or substantially redesigning a theme. The built-in ink and frost themes are examples, not templates that constrain the visual direction.

## Keep the architecture split

- Put palette, imagery, typography treatment, theme-specific spacing, and motion values in `assets/themes/<theme-id>/`.
- Put reusable DOM discovery, marker classes, theme switching, rollback, asset validation, and update compatibility in `assets/runtime/`.
- Change the shared runtime only when a new theme needs a hook that other themes can safely reuse.
- Never encode a theme name, color, or artwork filename into generic runtime behavior.

## Theme package inputs

| File or field | Purpose | Required action for a new theme |
|---|---|---|
| `theme.json` | Identity, asset names, colors | Set a unique ID, name, subtitle, four colors, and local filenames. |
| Home image | Landing artwork | Compose a wide crop with a calm title and four-action safe zone. |
| Conversation image | Task background | Compose a tall crop with low contrast behind text, diffs, code, and composer. |
| Usage image | Required usage-details background | Create a lightweight portrait crop at or below 300 KB, with edge decoration and a calm central reading zone. Never reuse the home or conversation artwork. |
| Sidebar image | Optional sidebar texture | Keep navigation and task labels readable in normal, hover, and selected states. |
| Four action icons | Home actions | Match the new direction while retaining the four native action meanings. |
| Selected marker | Optional current-task accent | Attach it before the label, not before the row; keep it stable when pin/archive actions appear. |
| Composer edge | Optional transparent foreground art | Anchor to a corner, keep its center transparent, and reserve native controls. |
| `theme.css` | Theme-specific presentation | Scope every rule under the theme root and style only mapped surfaces. |
| `theme-catalog.json` | In-app availability | Add the new theme ID when it should appear in live switching. Keep every sibling theme self-contained. |

Use `scripts/new-theme.ps1` to copy the supplied home, conversation, usage, sidebar, selected-marker, and composer-edge assets into the package. Home and usage artwork are mandatory; omit only the genuinely optional inputs.

## Surface map

Review each surface instead of treating a theme as a background replacement:

1. **Global canvas and content toolbar:** main paper/surface color, full-height artwork coverage, scrollbar edge, and title-bar transition. Explicitly theme `main.main-surface > header.app-header-tint` with a matching surface, divider, readable task title, icons, and hover state while preserving its native height and controls. Treat the Windows/Electron menu and window buttons above the web content as system-owned chrome; do not claim full support for styling them through the injected theme.
2. **Sidebar:** background or texture, logo/header contrast, navigation, pinned tasks, projects, project expand/collapse controls, account area, hover, focus, and current-task state. Define `--dream-sidebar-control-text` with sufficient contrast against the sidebar artwork.
3. **Home:** full-canvas scene crop, title/subtitle safe area, all four action blocks, project selector, and initial composer. Paint the artwork on `.dream-home-shell` / `.dream-home`, use the shared `#codex-dream-home-overlay`, keep `.dream-home-hero` transparent with square corners, and leave the native project-selector/composer layout untouched. `.dream-project-picker` is an inspection hook, not permission to recreate its geometry or styling. Inset photo-frame artwork and reconstructed compound-input layouts are not accepted default structures.
4. **Conversation:** prose, links, code, diffs, tool rows, image previews, timestamps, feedback buttons, and long-scroll readability.
5. **Progress and file changes:** progress pill/indicator plus every file-change summary card; neither may create opaque white strips. Dark themes must restyle the complete `.dream-file-changes-summary` surface, header, rows, actions, paths, and added/deleted counts as one readable hierarchy.
6. **Composer:** panel surface, placeholder, access mode, attachment, model selector, microphone, submit/stop button, focus state, multiline growth, and narrow width.
7. **Selected task:** marker, title, pin/archive actions, focus ring, and mutation stability without flashing.
8. **Output panel:** outer container, sticky headings, URL/environment row, browser row, source list, expanders, thumbnails, and one coherent surface color.
9. **Portaled UI:** compact usage/credits warning, full usage-details panel, dialogs, menus, popovers, tooltips, close buttons, progress bars, disabled text contrast, and the full-access confirmation dialog. Verify nested permission descriptions, risk copy, links, cancel action, and primary action; inherited `color` alone is insufficient for dark themes. Treat the light sidebar status card as a separate semantic surface with a dark `--dream-light-overlay-ink`. Mark the full details dialog with `.dream-usage-panel`, give it mandatory independent portrait artwork and five theme-owned palette tokens, and exclude both usage surfaces from broad dialog descendant rules.
10. **Theme switcher:** trigger, all catalog cards, active state, keyboard flow, persistence, rollback, narrow viewport, and no redundant success toast.
11. **Motion preference:** use the shared `off / low / high` control (`关闭 / 柔和 / 完整`) and root `data-dream-motion` value. Make soft clearly perceptible, make full richer but compositor-safe, persist the choice across theme switches, and let system reduced-motion force a static result.
12. **Optional video background:** declare a local `backgroundVideo` MP4 only when the visual direction genuinely needs full-canvas motion. Keep it at or below 4 MB. The shared runtime owns lazy creation, pause/resume, theme cleanup, and reduced-motion fallback; theme CSS may reveal it only under the full motion tier.
12. **Plugin discovery:** style the runtime-marked `.dream-plugin-search-shell` and `.dream-plugin-search` with explicit surface, border, ink, icon, and placeholder contrast. The sticky search rail must blend into the theme instead of painting an opaque native white band.

The shared runtime suppresses Codex's native four-card home suggestion row after
the themed four-action grid is available, and marks the optional Fast-mode
promotion as `.dream-home-promo`. Keep that promotion interactive but out of the
normal home layout so it never pushes the project picker or composer below the
viewport.

### Continuous-art direction

When the selected design is one continuous scene across sidebar and conversation, mount the conversation artwork once on the global `body` canvas. Treat the sidebar, title bar, main shell, output panel, and composer as translucent overlays. Do not apply the same raster independently with `background-size: cover` to sidebar and main: each container would calculate a different crop and split characters, instruments, architecture, or horizon lines. Keep `sidebarImage` only as a packaged fallback when the manifest contract requires it.

For dark directions, opening a panel is part of implementation, not optional QA. Explicitly verify the product-mode menu, profile/usage menu, message-actions menu, output panel, dialogs, popovers, listboxes, disabled rows, and nested sticky rows. Utility-token colors may bypass inherited `color`, so theme rules must also set `-webkit-text-fill-color` on relevant descendants.

Open the low-quota usage card in every dark theme. Its remaining percentage, reset schedule, close control, progress bar, and both actions must remain readable on the native light card. Never derive this card's foreground from a near-white main-canvas `--dream-ink` value.

Open the full usage-details panel in every theme. Verify the dedicated artwork is not the home hero, the center remains low-detail, and theme-specific title/body/muted/action colors stay readable over the overlay. Theme switching must replace its artwork and tokens atomically without leaving the previous theme behind.

### Required usage-panel contract

Every new theme must ship and verify all of the following:

- a unique `usageImage` optimized to 300 KB or less;
- explicit ink, muted, accent, overlay, and border tokens in that theme's CSS;
- readable title, body, reset date, availability chip, progress track, close control, action, and disabled state;
- a compact quota card that remains readable independently of the full panel;
- atomic artwork and palette replacement while the panel stays open during theme switching;
- normal-height and scrollable/long-content states without clipping.

This contract is enforced by `scripts/test-theme.ps1`; a theme that omits the asset or tokens is incomplete.

## Composer-edge safety contract

Treat composer art as a foreground accent with a transparent canvas, not as a second background.

- Place only corner artwork in the raster; keep the middle and control strip transparent.
- Render proportionally with a height cap. Never stretch it to the current composer width or height.
- Anchor it with manifest position variables, then use narrowly scoped theme CSS only for final corner clipping or offsets.
- Keep the art pseudo-element non-interactive and below native controls. Keep native controls in a higher stacking layer.
- Let the art overlap the composer edge slightly so it reads as foreground, but keep the model, microphone, access mode, and submit/stop glyphs fully visible.
- Verify single-line, multiline, file-change-summary, running/stop, and narrow-window states. A position that works only at one composer height is not accepted.
- Clip isolated fragments that look like dirt or float away from the intended corner. Do not crop the main motif merely to hide those fragments.

## Motion and performance

- Animate only small accents with `transform` and `opacity`.
- Treat soft and full as additive visual tiers rather than opacity values: one clearly visible primary accent at soft, then richer but still localized secondary or tertiary layers at full.
- When the direction needs organic fluid, smoke, flame, or caustic deformation that CSS cannot represent faithfully, render a short seamless WebP loop offline and expose it through the optional `motionImage` / `--dream-motion-art` contract. Keep the loop at 12–15 fps, localized by a mask, no larger than 2 MB, and reserve it for the high tier.
- For a buoyant motif that must roam beyond one component, opt the theme into the shared `#codex-dream-motion-layer`. The runtime supplies three `.dream-motion-wanderer` nodes across the full viewport, assigns independent size and 60-90 second timing, starts each near the lower edge, adds restrained lateral sway through two monotonically rising waypoints, fades it above the top edge, then reseeds it at a new lower-edge position on `animationiteration`. Theme CSS owns only artwork, visibility tier, filtering, and the `luminous-random-wander`-style keyframes; keep the layer and every child `pointer-events: none`.
- A generated motion asset must come from an approved source frame or an original generated texture. Do not approximate a reference with concentric rings, repeated gradient ribbons, or other visibly synthetic CSS geometry.
- Avoid continuous full-canvas filters, animated backgrounds, layout-changing transitions, and repeated whole-document scans.
- Coalesce mutation work to animation frames and retain valid marker nodes.
- Add `prefers-reduced-motion` behavior for every theme-specific animation.
- Follow `artwork-quality.md` for full-canvas assets: prefer 3840 px-wide WebP, preserve the approved composition during offline super-resolution, and target 1 MB or less when quality permits.
- Never run super-resolution, sharpening, blur recovery, or continuous full-screen filters inside Codex. Perform image enhancement once during theme production.
- Resize tiny transparent markers or corner ornaments close to their maximum rendered dimensions. Do not ship multi-megapixel 20px icons.
- Re-run payload validation after compression and visually compare the live result at normal and largest available target viewports.

## Completion gate

Do not package or publish a new theme until all applicable surface-map rows have been inspected at a normal and narrow viewport. Capture home, populated conversation, selected task with actions, file-change summary, multiline composer, running/stop state, output panel, and usage/dialog overlay. Record fixes in `design-qa.md` and finish with exactly `final result: passed`.

For the selected task row, always style both `.dream-selected-thread` and
`[aria-current="page"].sidebar-item`, and keep its border/background transition
disabled. Codex may replace the row while mounting hover actions; the native
ARIA state is present on the replacement before the runtime marker is restored.
Using both selectors prevents a one-frame missing border without weakening the
runtime-selected label artwork.

The shared runtime removes `.dream-selected-thread` and
`.dream-selected-thread-label` whenever the New Task home route is active.
Theme-specific selected-task artwork must therefore target real conversations
only and must never be attached to a stale sidebar row on the home page.
