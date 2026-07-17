# Theme QA checklist

## Static checks

- Manifest parses and uses schema version 1.
- Theme ID and filenames are portable.
- Both raster images exist, decode, and remain below 8 MB.
- All four safe SVG icons exist and remain below 64 KB.
- Runtime payload builds without unresolved placeholders.
- JavaScript and PowerShell syntax checks pass.

## Home view

- Hero fills the intended region at common window sizes.
- Heading and subtitle remain readable.
- Four action blocks appear, align, and retain icons.
- Clicking an action fills the native composer without submitting.
- Sidebar, menus, project selection, and window controls remain usable.

## Conversation view

- Background covers the full task surface, including the right side and lower area.
- Text, code, diffs, tool output, links, and image previews remain legible.
- Composer aligns with the content column.
- No opaque white side rails appear beside or behind the composer.
- Trigger a file change and verify no white strip appears behind the file-changes summary pill.
- Model, microphone, access mode, attachment, and submit/stop controls remain usable.
- Running progress uses only small-area motion and stops under reduced-motion preferences.
- Current thread remains legible when pin/archive controls appear; controls do not shift the title.
- Selected-state artwork stays attached to the title label, ahead of its text, when thread action controls appear or disappear.
- Trigger conversation mutations while the current thread is selected; its marker must not be removed and re-added or visibly flash.
- Output/environment panels preserve links, expanders, source rows, and pointer behavior.
- Inspect the output panel's outer container and sticky child headers. They must resolve to one intended surface color rather than mixed white and cream layers.

## Portaled overlays

- Open the usage/credits card and verify light cards use dark readable text.
- Open menus, dialogs, and popovers from both the sidebar and conversation toolbar.
- Check headings, secondary copy, close buttons, progress indicators, and links independently.
- Remember that portaled overlays may sit outside the themed main surface and need explicit scoped colors.

## Resilience

- Check a narrower window without horizontal overflow.
- Switch between home and conversation routes.
- Reload or open a second task and confirm reinjection.
- Restore and confirm the native UI returns.
- Re-run after a Codex update.
