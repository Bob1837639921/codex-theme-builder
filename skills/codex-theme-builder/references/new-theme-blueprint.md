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
| Sidebar image | Optional sidebar texture | Keep navigation and task labels readable in normal, hover, and selected states. |
| Four action icons | Home actions | Match the new direction while retaining the four native action meanings. |
| Selected marker | Optional current-task accent | Attach it before the label, not before the row; keep it stable when pin/archive actions appear. |
| Composer edge | Optional transparent foreground art | Anchor to a corner, keep its center transparent, and reserve native controls. |
| `theme.css` | Theme-specific presentation | Scope every rule under the theme root and style only mapped surfaces. |
| `theme-catalog.json` | In-app availability | Add the new theme ID when it should appear in live switching. Keep every sibling theme self-contained. |

Use `scripts/new-theme.ps1` to copy the supplied home, conversation, sidebar, selected-marker, and composer-edge assets into the package. Omit optional inputs when the visual direction does not need them.

## Surface map

Review each surface instead of treating a theme as a background replacement:

1. **Global canvas:** main paper/surface color, full-height artwork coverage, scrollbar edge, and title-bar transition.
2. **Sidebar:** background or texture, logo/header contrast, navigation, pinned tasks, projects, account area, hover, focus, and current-task state.
3. **Home:** hero crop, title/subtitle safe area, all four action blocks, project selector, and initial composer.
4. **Conversation:** prose, links, code, diffs, tool rows, image previews, timestamps, feedback buttons, and long-scroll readability.
5. **Progress and file changes:** progress pill/indicator plus the file-change summary rail; neither may create opaque white strips.
6. **Composer:** panel surface, placeholder, access mode, attachment, model selector, microphone, submit/stop button, focus state, multiline growth, and narrow width.
7. **Selected task:** marker, title, pin/archive actions, focus ring, and mutation stability without flashing.
8. **Output panel:** outer container, sticky headings, URL/environment row, browser row, source list, expanders, thumbnails, and one coherent surface color.
9. **Portaled UI:** usage/credits card, dialogs, menus, popovers, tooltips, close buttons, progress bars, and disabled text contrast.
10. **Theme switcher:** trigger, all catalog cards, active state, keyboard flow, persistence, rollback, one-shot fade transition, reduced-motion fallback, narrow viewport, and no redundant success toast.

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
- Avoid continuous full-canvas filters, animated backgrounds, layout-changing transitions, and repeated whole-document scans.
- Coalesce mutation work to animation frames and retain valid marker nodes.
- Add `prefers-reduced-motion` behavior for every theme-specific animation.

## Completion gate

Do not package or publish a new theme until all applicable surface-map rows have been inspected at a normal and narrow viewport. Capture home, populated conversation, selected task with actions, file-change summary, multiline composer, running/stop state, output panel, and usage/dialog overlay. Record fixes in `design-qa.md` and finish with exactly `final result: passed`.
