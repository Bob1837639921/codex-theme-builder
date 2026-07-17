---
name: codex-theme-builder
description: Autonomously design, create, modify, port, preview, visually verify, restore, and package reusable Codex Desktop themes from written requirements, screenshots, mockups, or existing themes. Use for Codex skins, implementation-ready design previews, theme manifests, generated artwork, CSS and motion customization, update compatibility, visual regression fixes, or reusable presets. Includes a safe Windows Store Codex CDP runtime and an ink-landscape example, but supports any visual direction.
---

# Codex Theme Builder

Build themes as portable theme folders. Treat `ink-landscape` as an example, never as the required visual style.

## Run end to end

Default to the autonomous workflow when the user asks Codex to complete the theme rather than merely advise. Read [autonomous-workflow.md](references/autonomous-workflow.md), then carry the work through requirements, visual target, implementation map, theme development, live screenshots, correction, and packaging. Do not stop after producing a design image or CSS draft.

Use the supplied reference as the visual truth. When the user supplies an existing Codex screenshot plus explicit change requests, preserve the native layout and generate one constrained implementation-ready preview if a preview is useful. When no visual target exists and the requested direction materially branches, generate exactly three visual options and wait for a selection before implementation. If the user explicitly delegates the visual choice or requests an uninterrupted fully automatic run, score those three options for requirement fit, native-control compatibility, feasibility, readability, and runtime cost; record the decision and continue with the highest-scoring option without pausing.

For every proposed visual element, record how it will be implemented: existing DOM hook, runtime marker, asset, interaction state, motion property, reduced-motion fallback, and performance cost. Reject or revise mock elements that cannot be implemented without breaking native controls or modifying Codex application files.

## Choose the workflow

- Create a theme from artwork: run `scripts/new-theme.ps1`.
- Adapt an existing theme: copy its directory, change its ID and assets, then edit `theme.json` and `theme.css`.
- Validate a theme: run `scripts/test-theme.ps1`.
- Preview it in Codex on Windows: run `scripts/start-theme.ps1` only after the user explicitly closes Codex.
- Hot-preview an edit in an already themed Codex session: run `scripts/preview-theme.ps1`.
- Remove the active theme: run `scripts/restore-theme.ps1`.
- Produce a distributable archive: run `scripts/package-theme.ps1`.

Read [theme-contract.md](references/theme-contract.md) before authoring or modifying a theme. Read [windows-runtime.md](references/windows-runtime.md) before live application. Use [qa-checklist.md](references/qa-checklist.md) for final verification.

## Build a theme

1. Inspect the user's reference, target Codex version, viewport, and desired routes.
2. Decide whether the home and conversation views share artwork. Prefer separate images when composition or contrast differs.
3. Create or acquire real artwork. Do not approximate supplied artwork with CSS gradients when visual fidelity matters.
4. Run the scaffold script with a unique lowercase ID:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/new-theme.ps1 `
  -Id "my-theme" -Name "My Theme" `
  -HomeImage "C:\path\home.png" `
  -ConversationImage "C:\path\conversation.png" `
  -OutputDirectory "C:\path\themes"
```

5. Tune `theme.css` using theme-scoped selectors under `:root.codex-dream-skin`. Keep native Codex controls functional.
6. Validate before attempting a live preview.

## Validate and preview

Run static and payload checks:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-theme.ps1 -ThemePath "C:\path\themes\my-theme"
```

For a live preview, ask the user to save drafts and fully exit Codex. Never close or restart Codex without explicit user action. Then run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-theme.ps1 `
  -ThemePath "C:\path\themes\my-theme" -ConfirmCodexClosed
```

Verify the home route, a populated conversation, the composer at the bottom edge, and the file-changes summary state. Check both normal and narrow viewports. Capture screenshots when visual fidelity is part of the request.

During iterative development, hot-apply and capture without restarting Codex:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/preview-theme.ps1 `
  -ThemePath "C:\path\themes\my-theme" `
  -ScreenshotPath "C:\path\qa\conversation.png"
```

Put the design preview and implementation capture into the same comparison view. Fix every actionable high- or medium-impact mismatch, recapture, and repeat until `design-qa.md` says exactly `final result: passed`.

After a Codex update, assume DOM selectors may have changed. Re-run validation and live QA; update scoped CSS or runtime selectors rather than modifying Codex application files.

## Restore and package

Remove the active injection without changing Codex installation files:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/restore-theme.ps1
```

Package a validated theme:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/package-theme.ps1 `
  -ThemePath "C:\path\themes\my-theme" -OutputDirectory "C:\path\dist"
```

Commit the skill, source theme directories, documentation, and intentionally sized assets. Exclude runtime state, screenshots containing private data, logs, and temporary archives unless requested.

## Safety rules

- Do not edit `app.asar`, WindowsApps, the registered Codex package, or official application resources.
- Bind debugging only to loopback through the bundled runtime.
- Never force-close Codex during theme startup.
- Keep each raster image at or below 8 MB and each SVG icon at or below 64 KB.
- Preserve native menus, project selection, composer actions, keyboard navigation, and pointer behavior.
- Keep all selectors scoped to the theme root whenever possible.
- Animate only small surfaces with `transform` and `opacity` when possible; never use continuous full-screen motion.
- Provide `prefers-reduced-motion` fallbacks for every added animation.

## Bundled resources

- `assets/runtime/`: reusable Windows live-preview runtime.
- `assets/themes/ink-landscape/`: complete sample preset.
- `assets/theme-template/`: neutral starter CSS used by the scaffold script.
