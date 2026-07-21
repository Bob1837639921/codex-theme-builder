# Windows live-preview runtime

The bundled runtime launches the Microsoft Store Codex package with a random loopback-only CDP port, verifies the package and browser identity, injects the selected theme into verified `app://` Codex pages, and keeps a hidden watcher alive for new renderer pages.

It does not modify Codex files, `app.asar`, WindowsApps, package registration, or the user's ordinary shortcut.

## Start contract

1. Save unsent text.
2. Fully exit Codex.
3. Confirm no Codex process remains.
4. Run `scripts/start-theme.ps1 -ConfirmCodexClosed`.

The start script refuses to continue while Codex is running. It never force-closes Codex. A hidden Node process maintains the theme; no black console must remain open.

The desktop launcher supports a true cold start. It uses one branded WinForms flow instead of consecutive system popups: a restart confirmation only when Codex is already running, followed by a single progress window that becomes a brief success state and closes automatically. The success state reports only the current launch result and never tells users to click the shortcut again. The launcher then brings the verified Codex main window to the foreground after injection verification. Diagnostic milestones are written to `%LOCALAPPDATA%\CodexDreamSkinV2\desktop-launch.log`.

Desktop shortcuts must target `powershell.exe` directly with `-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "<skill>\assets\runtime\v2\desktop-launch.ps1"`. Do not point a shortcut at a localized `.cmd` wrapper: `cmd.exe` can decode the batch file before an in-file `chcp` command takes effect, corrupting Chinese text and the commands that follow it.

Only one runtime session can be active. Its state is stored under `%LOCALAPPDATA%\CodexDreamSkinV2`. When `theme-catalog.json` is present, switch bundled themes from the in-app selector without restarting Codex; restore the runtime session only when removing the theme system itself.

## Restore contract

Run `scripts/restore-theme.ps1` to remove injected styles and stop the watcher. Without `-RestartCodex`, Codex remains open and the temporary CDP endpoint persists only until Codex exits. Use `-RestartCodex` only when the user has explicitly authorized closing and restarting Codex.

## Updates

A Codex update ends the hidden watcher, so the theme disappears. Start the selected theme again after the update. If selectors changed, validate the payload and perform live QA before changing the runtime.

## Troubleshooting

- “Close Codex before starting”: exit from the window and system tray, then check Task Manager.
- “A V2 session already exists”: run the restore script first.
- “Access is denied”: do not kill arbitrary processes; run the normal shortcut without elevation and check Windows package permissions.
- Theme missing after update: restart through the theme launcher; the standard Codex shortcut does not inject a theme.
- Cold start appears to do nothing: inspect `desktop-launch.log`. The launcher must show startup feedback before package activation and foreground the verified Codex window after injection.
- Output panel stays native white while diagnostics report themed styles: Codex can retain an off-screen output-panel node while rendering a second visible node. Detail-surface discovery must scan all candidates, prefer one intersecting the current viewport, and remove stale `.dream-output-panel` markers from off-screen nodes.
- Logs live at `%LOCALAPPDATA%\CodexDreamSkinV2\injector.log` and `injector-error.log` while a session is active.
