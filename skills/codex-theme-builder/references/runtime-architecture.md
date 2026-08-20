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

Theme catalogs are metadata-first. `injector.mjs` validates every manifest and
asset path, injects only metadata, theme CSS, and one shared copy of `base.css`,
then services allowlisted synthetic HTTPS image requests through the existing
verified CDP session. MP4 uses a runtime binding because Codex rejects synthetic
network media URLs before Chromium's request interception; the binding transfers
only the active scene video in bounded CDP chunks, resolves it to a temporary Blob
URL, and discards the Base64 transport string. Assets are read only when the
active scene requests them; no full-canvas raster or video may be serialized into the normal
catalog payload. The switcher uses dedicated 320x180 previews and an
`IntersectionObserver`, so hidden cards do not request artwork. Keep the normal
payload below 1 MiB, with zero Base64 raster/video entries and exactly one copy
of shared CSS. The bounded chunk transport remains a defensive fallback for
development-only embedded previews and future large metadata payloads.

Synthetic asset URLs use the reserved `https://codex-dream-skin.invalid` host,
a per-process random token, and a registry of manifest-validated files. The CDP
`Fetch` domain fulfills only exact registered image URLs and aborts unknown
requests. The separately allowlisted video binding accepts the same exact
registry URLs and rejects every non-MP4 path. Do not weaken CSP, expose a network
listener, serve directories, or accept traversal. Closing the verified CDP
session ends access to both channels.

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
7. Keep route-local video mounting as the default. When the active theme declares
   `windowVideoCanvas`, mount its active video, outgoing video, and shield on the
   stable document canvas instead. Those opted-in layers are fixed to the
   viewport, pointer-free, and ordered behind native Codex UI so one crop spans
   the menu strip, task toolbar, workspace, and composer.
8. For an opted-in window canvas, keep the body poster painted until the shield
   reaches its opaque swap point, then add the window covering state and remove
   the poster. For a normal theme, perform the same atomic handoff inside the
   scene shell. Switching themes must move the outgoing layer to the new mode's
   owner without leaking the previous theme's geometry.

The active and single outgoing handoff video remain route-scoped, muted,
pointer-free, visibility-aware and reduced-motion safe. The shield is transient,
does not blur or filter the viewport, and has no steady-state rendering cost.
Do not solve handoff flashes by decoding every theme video in the background.

Do not assign a shared `z-index` to every direct child of `main.main-surface`.
Codex owns the stacking relationship between its fixed toolbar and scrolling
content viewport; flattening both to the same layer lets the viewport intercept
toolbar pointer events. Keep only injected video and shield layers explicitly
stacked, and verify native toolbar buttons with `elementFromPoint`.

The direct native content toolbar must also remain a viewport-neutral containing
block. Do not apply `transform`, `filter`, `backdrop-filter`, `perspective`, or
containment to the header itself: ChatGPT New Chat mounts its `聊天 / 工作`
switch in a viewport-fixed descendant that already subtracts the sidebar. If
the themed header traps that descendant, the sidebar is subtracted twice and
the switch moves right and down. Use translucent toolbar paint without a
header-level backdrop filter. The runtime prepends one absolute, pointer-free
`.dream-toolbar-glass` child for a five-percent theme tint, but that child must also keep
its backdrop filter disabled: bright artwork must remain visible instead of
being smeared into a gray/white strip. Keep paint containment on the child,
remove it at the native/authentication boundary, and never position native
controls through the layer. The shared stylesheet suppresses theme-local header
pseudo-elements and hard dividers. Theme body canvases must not contain an
opaque toolbar-height gradient stop; they must expose the route artwork itself.
The shared stylesheet also suppresses Codex's light-mode
`_MainContentTopFade_` layer on every themed route; this must not be delegated
to individual dark-theme flags.

## Native authentication boundary

Theme visuals may run only while the semantic main shell and its direct native
header anchor (`data-testid="app-shell-header-context-menu-surface"`) are mounted.
The sidebar is optional because Codex removes `aside.app-shell-left-panel` from
the DOM when the user collapses it. Signed-out, authentication, onboarding, and
account-recovery windows do not expose the semantic shell header anchor.

- When the shell is absent, remove the theme root class, route markers, theme
  chrome, switcher, motion layer, handoff shield, and all background videos.
- Release video object URLs so a signed-out window retains no decoder or GPU
  workload.
- Keep the theme package and selected theme in memory so the runtime can restore
  the theme after a successful login without restarting Codex.
- CSS must independently hide injected visuals whenever the sidebar is absent;
  this closes the short interval before the mutation observer runs.
- Never classify an arbitrary signed-out `<main>` as a conversation route.

## Native shell compatibility

Codex may replace the historical `main.main-surface` and `header.app-header-tint`
classes with generated CSS-module names. Locate the authenticated main shell by
the direct header's `data-testid="app-shell-header-context-menu-surface"` anchor;
do not require the optional sidebar. Add the historical
classes only as reversible runtime compatibility markers, record marker ownership
in `data-dream-compat-*`, and remove only runtime-owned markers during cleanup.
The injector probe and page runtime must share this semantic fallback so startup
verification cannot reject a renderer that the runtime can safely theme.

Collapsing or expanding the native sidebar is an authenticated layout transition,
not a suspension boundary. Preserve the active theme, route markers, static/video
background, motion level, and selected theme while the sidebar is absent. Remove
the sidebar-owned switcher naturally with the sidebar and recreate it when the
sidebar returns without resetting the rest of the themed shell.

## Change placement

Before adding code, choose exactly one owner:

- New theme art, color, or per-theme selector: theme directory.
- Reusable Codex DOM hook or catalog behavior: injector/runtime assets.
- Windows identity or process safety primitive: `common-windows.ps1`.
- Launch sequence or milestone: `launch.ps1`.
- Desktop workflow decision: `desktop-launch.ps1`.
- Launcher layout, copy, color, or component: `ui/launcher-ui.ps1`.

Do not duplicate a rule across modules. If two modules need the same low-level behavior, move it downward into a neutral shared primitive rather than calling sideways.

Selected-task marker caching must follow the native current-row state. Reuse a cached
row only while the native `aria-current`/`aria-selected` row is unchanged and the
normalized header title matches exactly. Prefix-related titles such as `Task` and
`Task 2` are distinct; a substring match can leave the previous label marker and its
decorative padding attached after navigation or a theme switch.

Queued follow-up guidance uses the runtime-owned `.dream-queued-message-list`
marker. Discovery is scoped to the conversation shell and the native
`vertical-scroll-fade-mask` list whose language-independent `max-h-[30dvh]`
utility identifies `QueuedMessageList`; do not depend on localized labels such as
`Steer` or `引导`. Remove the marker immediately when the queue is emptied.

Home Fast-mode promotion discovery uses its semantic `aside`/status-card
boundary. Theme layout can temporarily flex-shrink the native card before the
marker is attached, so a positive rendered-height threshold is not a valid
identity check. When a structural fallback is required, compare the candidate's
natural `scrollHeight` with its rendered height. The shared absolute-positioned
`.dream-home-promo` treatment must leave the card fully visible, clickable, and
dismissible without consuming home-layout height.

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
