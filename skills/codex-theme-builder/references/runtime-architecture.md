# Runtime architecture

Read this reference before changing the shared runtime, desktop launcher, progress reporting, Windows process control, or theme-switching infrastructure.

## Dependency direction

Dependencies move in one direction only:

```text
desktop shortcut
  -> v2/desktop-launch.ps1          orchestration and error boundary
     -> v2/ui/launcher-ui.ps1       presentation only
     -> v2/launch.ps1               launch and progress-stage contract
        -> windows/scripts/common-windows.ps1
        -> v2/scripts/injector.mjs
           -> theme catalog and self-contained theme packages
```

Lower layers never import or call higher layers. In particular:

- theme packages never know about the launcher, CDP, or Windows processes;
- the injector never knows about WinForms or desktop shortcut UX;
- `launch.ps1` reports progress but never creates UI controls;
- `launcher-ui.ps1` renders state but never discovers, starts, or stops Codex;
- `desktop-launch.ps1` coordinates modules but does not construct visual controls.

## Module responsibilities

| Module | Owns | Must not own |
|---|---|---|
| `desktop-launch.ps1` | argument normalization, user-confirmed restart flow, previous-session cleanup, progress callback wiring, top-level logging and error boundary | WinForms control construction, CDP validation details, theme CSS |
| `ui/launcher-ui.ps1` | branded confirmation, progress, completion and failure windows; colors, spacing, icons and resource disposal | Codex discovery, process termination, state files, ports, injection |
| `launch.ps1` | operation lock, theme validation, runtime discovery, loopback port, Store activation, verified CDP identity, injector lifecycle, state persistence and verification | desktop prompts, window layout, launcher copy |
| `common-windows.ps1` | reusable Windows package/process/path/port/state safety primitives | theme-specific visual identity, launcher workflow ordering |
| `injector.mjs` | verified CDP page access, payload construction, reinjection, theme catalog and live DOM hooks | Windows shortcut or WinForms behavior |
| `assets/themes/<id>/` | manifest, imagery, palette, icons and scoped theme CSS | generic DOM discovery, process management, another theme's assets |

## Progress contract

`launch.ps1` owns the canonical launch stages. Each event has:

```text
Stage: stable machine-readable ID
Percent: monotonic integer from 0 to 100
Status: localized user-facing current action
```

Canonical stages are `ValidateTheme`, `DiscoverRuntime`, `AllocatePort`, `ActivateCodex`, `WaitForCdp`, `PrepareInjector`, `StartInjector`, `PersistState`, `VerifyInjection`, and `Verified`.

Rules:

- only the launch core may declare launch-stage percentages;
- the UI may clamp values monotonically but may not invent backend completion;
- waiting for CDP may report bounded intermediate progress inside its allocated range;
- `Verified` ends at 96%; only the desktop orchestration completion state sets 100%;
- the window may close only after injection verification succeeds;
- failure never advances progress and always preserves the diagnostic log location.

## Error ownership

- A low-level function throws a precise error and does not display UI.
- `launch.ps1` releases its operation lock in `finally`.
- `desktop-launch.ps1` owns the user-facing failure boundary and desktop log.
- `launcher-ui.ps1` only displays the supplied error and disposes every form/image resource.
- Process termination remains identity-checked through `common-windows.ps1`.

## Change placement

Before adding code, choose exactly one owner:

- New theme art, color, or per-theme selector: theme directory.
- Reusable Codex DOM hook or catalog behavior: injector/runtime assets.
- Windows identity or process safety primitive: `common-windows.ps1`.
- Launch sequence or milestone: `launch.ps1`.
- Desktop workflow decision: `desktop-launch.ps1`.
- Launcher layout, copy, color, or component: `ui/launcher-ui.ps1`.

Do not duplicate a rule across modules. If two modules need the same low-level behavior, move it downward into a neutral shared primitive rather than calling sideways.

## Verification gate

Every shared-runtime change must pass:

1. PowerShell parsing for launcher orchestration, UI module, launch core, and tests.
2. Node syntax, CDP identity self-test, and theme payload verification.
3. Static dependency-boundary assertions.
4. Both bundled theme validations.
5. Installation-copy verification before changing the desktop shortcut behavior.

The runtime tests must reject legacy `WScript.Shell.Popup`, UI functions inside the orchestration script, process-control calls inside the UI module, indeterminate progress, or a completion state that does not visibly reach 100%.
