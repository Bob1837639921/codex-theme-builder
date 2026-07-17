# Windows live-preview runtime

The bundled runtime launches the Microsoft Store Codex package with a random loopback-only CDP port, verifies the package and browser identity, injects the selected theme into verified `app://` Codex pages, and keeps a hidden watcher alive for new renderer pages.

It does not modify Codex files, `app.asar`, WindowsApps, package registration, or the user's ordinary shortcut.

## Start contract

1. Save unsent text.
2. Fully exit Codex.
3. Confirm no Codex process remains.
4. Run `scripts/start-theme.ps1 -ConfirmCodexClosed`.

The start script refuses to continue while Codex is running. It never force-closes Codex. A hidden Node process maintains the theme; no black console must remain open.

Only one runtime session can be active. Its state is stored under `%LOCALAPPDATA%\CodexDreamSkinV2`. Restore the previous session before switching themes.

## Restore contract

Run `scripts/restore-theme.ps1` to remove injected styles and stop the watcher. Without `-RestartCodex`, Codex remains open and the temporary CDP endpoint persists only until Codex exits. Use `-RestartCodex` only when the user has explicitly authorized closing and restarting Codex.

## Updates

A Codex update ends the hidden watcher, so the theme disappears. Start the selected theme again after the update. If selectors changed, validate the payload and perform live QA before changing the runtime.

## Troubleshooting

- “Close Codex before starting”: exit from the window and system tray, then check Task Manager.
- “A V2 session already exists”: run the restore script first.
- “Access is denied”: do not kill arbitrary processes; run the normal shortcut without elevation and check Windows package permissions.
- Theme missing after update: restart through the theme launcher; the standard Codex shortcut does not inject a theme.
- Logs live at `%LOCALAPPDATA%\CodexDreamSkinV2\injector.log` and `injector-error.log` while a session is active.
