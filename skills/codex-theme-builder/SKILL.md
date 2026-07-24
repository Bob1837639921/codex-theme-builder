---
name: codex-theme-builder
description: Autonomously design, create, modify, port, deploy, preview, visually verify, restore, and package reusable Codex Desktop themes from written requirements, screenshots, mockups, or existing themes. Use for Codex skins, implementation-ready design previews, theme manifests, generated artwork, CSS and motion customization, update compatibility, visual regression fixes, reusable presets, complete project setup, skill installation, or desktop theme shortcuts. Includes a safe Windows Store Codex CDP runtime and an ink-landscape example, but supports any visual direction.
---

# Codex Theme Builder

Build themes as portable theme folders. Treat `ink-landscape` as an example, never as the required visual style.

## Run end to end

Default to the autonomous workflow when the user asks Codex to complete the theme rather than merely advise. Read [autonomous-workflow.md](references/autonomous-workflow.md), then carry the work through requirements, visual target, implementation map, theme development, live screenshots, correction, and packaging. Do not stop after producing a design image or CSS draft.

Use the supplied reference as the visual truth. When the user supplies an existing Codex screenshot plus explicit change requests, preserve the native layout and generate one constrained implementation-ready preview if a preview is useful. When no visual target exists and the requested direction materially branches, generate exactly three visual options and wait for a selection before implementation. If the user explicitly delegates the visual choice or requests an uninterrupted fully automatic run, score those three options for requirement fit, native-control compatibility, feasibility, readability, and runtime cost; record the decision and continue with the highest-scoring option without pausing.

For every proposed visual element, record how it will be implemented: existing DOM hook, runtime marker, asset, interaction state, motion property, reduced-motion fallback, and performance cost. Reject or revise mock elements that cannot be implemented without breaking native controls or modifying Codex application files.

When a real Codex screenshot exists, treat the work as a constrained edit rather than a new UI generation. Read [visual-lock-and-switcher.md](references/visual-lock-and-switcher.md), create a provisional implementation map before generating any preview, and reject images that move, replace, rename, or invent native product surfaces. Read the same reference before designing or implementing an in-app theme switcher.

## Choose the workflow

- Create a theme from artwork: run `scripts/new-theme.ps1`.
- Adapt an existing theme: copy its directory, change its ID and assets, then edit `theme.json` and `theme.css`.
- Inspect full-canvas dimensions and encoded sizes: run `scripts/inspect-theme-artwork.ps1`.
- Validate a theme: run `scripts/test-theme.ps1`.
- Preview it in Codex on Windows: run `scripts/start-theme.ps1` only after the user explicitly closes Codex.
- Hot-preview an edit in an already themed Codex session: run `scripts/preview-theme.ps1`.
- Remove the active theme: run `scripts/restore-theme.ps1`.
- Produce a distributable archive: run `scripts/package-theme.ps1`.
- Install a verified theme launcher on the Windows desktop: run `scripts/install-desktop-shortcut.ps1` from the installed skill.

Read [theme-contract.md](references/theme-contract.md) before authoring or modifying a theme. When creating or porting a visual direction, also read [new-theme-blueprint.md](references/new-theme-blueprint.md); it is the reusable map of assets, Codex surfaces, control-safe zones, and acceptance states that every new theme must cover. Read [artwork-quality.md](references/artwork-quality.md) before creating, replacing, enlarging, or compressing full-canvas artwork. Read [runtime-architecture.md](references/runtime-architecture.md) before modifying shared runtime, launcher, process-control, progress, or switching infrastructure. Read [windows-runtime.md](references/windows-runtime.md) before live application. Use [qa-checklist.md](references/qa-checklist.md) for final verification.

## Build a theme

1. Inspect the user's reference, target Codex version, viewport, and desired routes.
2. Decide whether the home and conversation views share artwork. Prefer separate images when composition or contrast differs.
3. Create or acquire real artwork. Follow `artwork-quality.md`: preserve the selected composition, prepare full-canvas assets for large displays, encode them as quality-controlled WebP, and keep super-resolution work offline rather than in the Codex runtime. Do not approximate supplied artwork with CSS gradients when visual fidelity matters.
4. Run the scaffold script with a unique lowercase ID:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/new-theme.ps1 `
  -Id "my-theme" -Name "My Theme" `
  -HomeImage "C:\path\home.png" `
  -ConversationImage "C:\path\conversation.png" `
  -UsageImage "C:\path\usage-background.webp" `
  -OutputDirectory "C:\path\themes"
```

5. Tune `theme.css` using theme-scoped selectors under `:root.codex-dream-skin`. Every theme must define its own usage-panel ink, muted, accent, overlay, and border tokens; do not inherit another theme's palette or reuse its home artwork.
6. Work through every row in `new-theme-blueprint.md`, including both compact and full usage surfaces. Keep generic DOM discovery and safety behavior in the shared runtime; keep palette, imagery, spacing, and theme identity in the theme folder.
7. Validate before attempting a live preview.

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

Verify the home route, a populated conversation, the composer at the bottom edge, and the file-changes summary state. Check normal, narrow, and the largest available target viewport. Capture screenshots when visual fidelity is part of the request.

During iterative development, hot-apply and capture without restarting Codex:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/preview-theme.ps1 `
  -ThemePath "C:\path\themes\my-theme" `
  -ScreenshotPath "C:\path\qa\conversation.png"
```

Put the design preview and implementation capture into the same comparison view. Fix every actionable high- or medium-impact mismatch, recapture, and repeat until `design-qa.md` says exactly `final result: passed`.

After a Codex update, assume DOM selectors may have changed. Re-run validation and live QA; update scoped CSS or runtime selectors rather than modifying Codex application files.

## Deploy and hand off autonomously

When the user asks to configure the project, install a theme, or make the repository independently usable, complete the deployment instead of handing the user shell commands:

1. From a repository checkout, run `scripts/setup-windows.ps1`. It validates the repository, installs or updates this skill, verifies Node.js and the Store Codex package, creates the theme icon, and installs the desktop shortcut.
2. For a skill that is already installed, run `scripts/install-desktop-shortcut.ps1 -ThemeId <id>` after validating the selected theme.
3. Verify that the `.lnk` targets hidden `powershell.exe` directly, includes the installed `desktop-launch.ps1` and theme path, and has a valid icon. Never point the shortcut at a localized `.cmd` wrapper.
4. Do not start the shortcut, close Codex, or force a restart during setup. The only final user action is launching the theme after saving their work.
5. End with a clear handoff containing the exact shortcut name: `配置完成。请保存当前内容并完全退出 Codex，然后在桌面双击「<shortcut name>」启动。`

Do not stop after installing the skill, and do not ask the user to manually recreate the shortcut, edit PATH, or select the launcher target when the automation can do it.

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
- Keep each raster image at or below 8 MB and each SVG icon at or below 64 KB. For full-canvas WebP artwork, target 1 MB or less when visual comparison shows no meaningful loss.
- Preserve native menus, project selection, composer actions, keyboard navigation, and pointer behavior.
- Keep all selectors scoped to the theme root whenever possible.
- Animate only small surfaces with `transform` and `opacity` when possible; never use continuous full-screen motion.
- Provide `prefers-reduced-motion` fallbacks for every added animation.

## Bundled resources

- `assets/runtime/`: reusable Windows live-preview runtime.
- `assets/themes/ink-landscape/`: complete sample preset.
- `assets/theme-template/`: neutral starter CSS used by the scaffold script.
- `scripts/inspect-theme-artwork.ps1`: portable PNG, JPEG, and WebP dimension and payload report for home and conversation artwork.
- `scripts/install-desktop-shortcut.ps1`: deterministic Windows shortcut and icon installer for any bundled theme.
