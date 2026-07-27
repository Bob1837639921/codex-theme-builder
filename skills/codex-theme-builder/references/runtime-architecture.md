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
- injection verification may reconnect and retry the verified renderer after a transient
  Codex navigation or reload, while keeping progress at the `VerifyInjection` milestone;
- `Verified` ends at 96%; only the desktop orchestration completion state sets 100%;
- the window may close only after injection verification succeeds;
- failure never advances progress and always preserves the diagnostic log location.

## Error ownership

- A low-level function throws a precise error and does not display UI.
- `launch.ps1` releases its operation lock in `finally`.
- `desktop-launch.ps1` owns the user-facing failure boundary and desktop log.
- `launcher-ui.ps1` only displays the supplied error and disposes every form/image resource.
- Process termination remains identity-checked through `common-windows.ps1`.

## Video handoff contract

Scene video changes are atomic from the user's perspective even though decoding is
asynchronous:

1. Keep the route's declared static artwork, or the currently playing scene video,
   painted while the replacement video loads.
   On first injection, do not guess a scene before the home/conversation marker is
   available. Once the scene is known, an opaque loading shield may cover the
   static artwork until that scene's video has decoded.
2. Hold the replacement video paused on its decoded first frame.
3. Fade in the transient `#codex-dream-video-handoff-shield` above both
   backgrounds but below native Codex content. Its colors come from active theme
   tokens, so a dark theme never flashes white and a light theme never flashes
   black.
4. At the shield's opacity peak, apply `is-handoff-swap`, `is-ready`, and
   `is-covering` atomically, remove the old static/outgoing background, and keep
   the incoming first frame paused.
5. Start incoming playback behind the opaque shield, then fade the shield out and
   remove it. This reveals an already-moving frame instead of holding the decoded
   first frame visibly on screen. Never expose a direct crossfade between
   differently aligned protected subjects.
6. Clear both shield timers whenever a video is replaced so rapid theme, route,
   or motion-tier changes cannot let an obsolete handoff alter the new scene.
7. If Codex replaces the entire main-surface node during navigation, preserve the
   playing video element before the browser paints: temporarily mount it on the
   stable document canvas with its last shell rectangle, keep the replacement
   main surface transparent, then attach it to the new shell. Do not fall back to
   the route's static raster merely because the React-owned shell was replaced.
8. After the preserved video is attached to the replacement shell, keep both the
   shell and its route content transparent while that video is marked outgoing.
   The outgoing video, not the static raster, remains the painted fallback until
   the incoming scene is decoded and covering. Removing the active video ID must
   never make the route artwork opaque during this interval.

The active and single outgoing handoff video remain route-local, muted,
pointer-free, visibility-aware and reduced-motion safe. The shield is transient,
does not blur or filter the viewport, and has no steady-state rendering cost.
Do not solve handoff flashes by decoding every theme video in the background.

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

The verification retry remains bounded: three 12-second attempts by default. Each
attempt starts a fresh verifier process so a renderer reload cannot strand validation
on a closed page WebSocket. Results are appended to
`%LOCALAPPDATA%\CodexDreamSkinV2\verification.log`; continuous failure remains fatal.

The runtime tests must reject legacy `WScript.Shell.Popup`, UI functions inside the orchestration script, process-control calls inside the UI module, indeterminate progress, or a completion state that does not visibly reach 100%.
