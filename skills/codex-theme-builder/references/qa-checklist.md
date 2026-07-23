# Theme QA checklist

## Static checks

- Manifest parses and uses schema version 1.
- Theme ID and filenames are portable.
- Both raster images exist, decode, and remain below 8 MB.
- `scripts/inspect-theme-artwork.ps1` reports the home and conversation dimensions and file sizes.
- Full-canvas artwork intended for large displays is preferably 3840 px wide and does not fall below the 3200 px warning threshold without a documented reason.
- Full-canvas WebP files target 1 MB or less when visual comparison shows no meaningful loss.
- No superseded, backup, source-resolution, or unreferenced full-canvas background remains in the theme folder.
- All four safe SVG icons exist and remain below 64 KB.
- Runtime payload builds without unresolved placeholders.
- JavaScript and PowerShell syntax checks pass.

## Home view

- Hero fills the intended region at common window sizes.
- Hero detail remains crisp at the largest available target viewport at 100% display scaling; inspect faces, hair, foliage, architecture, line art, and other high-information regions.
- Heading and subtitle remain readable.
- Four action blocks appear, align, and retain icons.
- Clicking an action fills the native composer without submitting.
- Sidebar, menus, project selection, and window controls remain usable.
- Expand and collapse a long project list; the resulting show-more/show-less control remains readable over the sidebar artwork.

## Conversation view

- Background covers the full task surface, including the right side and lower area.
- Background detail remains crisp at the largest available target viewport without runtime sharpening or full-screen filters.
- Text, code, diffs, tool output, links, and image previews remain legible.
- Composer aligns with the content column.
- No opaque white side rails appear beside or behind the composer.
- Trigger a file change and verify no white strip appears behind the file-changes summary pill.
- Inspect a populated file-change summary card: header, file paths, added/deleted counts, undo/review controls, hover state, and expanded rows must remain readable on one coherent themed surface.
- Model, microphone, access mode, attachment, and submit/stop controls remain usable.
- Running progress uses only small-area motion and stops under reduced-motion preferences.
- Current thread remains legible when pin/archive controls appear; controls do not shift the title.
- Selected-state artwork stays attached to the title label, ahead of its text, when thread action controls appear or disappear.
- Trigger conversation mutations while the current thread is selected; its marker must not be removed and re-added or visibly flash.
- Output/environment panels preserve links, expanders, source rows, and pointer behavior.
- Inspect the output panel's outer container and sticky child headers. They must resolve to one intended surface color rather than mixed white and cream layers.

## Portaled overlays

- Open the usage/credits card and verify its remaining percentage, reset schedule, close control, progress bar, and both actions use dark readable text on the light card, including under every dark theme.
- Open menus, dialogs, and popovers from both the sidebar and conversation toolbar.
- Open the full-access confirmation dialog and independently verify the title, explanatory paragraph, three permission descriptions, risk warning, link, cancel action, primary action, and disabled states.
- Check headings, secondary copy, close buttons, progress indicators, and links independently.
- Remember that portaled overlays may sit outside the themed main surface and need explicit scoped colors.

## In-app theme switcher

- The switcher root is `#codex-dream-theme-switcher` and remains inside the mapped sidebar anchor.
- Opening the switcher does not move, rename, hide, or cover native controls.
- Keyboard focus enters, traverses, selects, and exits the switcher predictably.
- The selected theme persists across reload and a second task, or the UI clearly declares launcher-only fallback behavior.
- Switching replaces all theme assets and color tokens atomically; failure restores the previous theme.
- Narrow windows keep the switcher within the viewport without horizontal overflow.
- The motion control exposes `关闭 / 低 / 中 / 高`, keeps the panel open while changing levels, updates `data-dream-motion`, and persists across theme switches and reloads.
- Off removes custom atmosphere layers; low, medium, and high are visibly distinct without moving full-canvas artwork. A localized pre-rendered `motionImage` may run only in the intended tier. System reduced-motion still forces static output.
- If `motionImage` is present, verify that it is a local WebP no larger than 2 MB, loops without a visible jump, stays localized under a soft mask, and never covers text or controls.

## Resilience

- Check a narrower window without horizontal overflow.
- Switch between home and conversation routes.
- Reload or open a second task and confirm reinjection.
- Restore and confirm the native UI returns.
- Re-run after a Codex update.
- Record source and output dimensions, encoded size, normal viewport, largest tested viewport, and any accepted quality exception in `design-qa.md`.
