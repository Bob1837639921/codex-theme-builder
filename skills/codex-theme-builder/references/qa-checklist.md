# Theme QA checklist

## Current Codex paint regressions

- Confirm composer-edge artwork is painted on exactly one intended layer. If a
  theme paints it on `.composer-surface-chrome`, its parent-host copy is off;
  no duplicate ornament crosses the conversation body.
- Inspect nested command and tool-output `span`/`div` nodes on dark artwork;
  all text remains readable through `--theme-conversation-code-ink`.
- Inspect thinking duration, timestamps, collapsed reasoning, and untagged
  execution summaries through `--theme-conversation-muted-ink`.
- Inspect every content-toolbar label and SVG wrapper through
  `--theme-toolbar-ink`, including disabled and muted native utilities.
- On dark Home themes, confirm stable and CSS-module top-fade carriers plus
  their pseudo elements leave no white shadow under the themed heading.
- On dark conversation themes, repeat the top-fade check directly below the
  content toolbar; no 16 px white gradient strip may remain.
- Check `文件 / 编辑 / 视图 / 帮助`, back/forward icons, and window-side menu
  glyphs independently; each uses `--theme-app-menu-ink` over dark artwork.
- Check the native Windows minimize, maximize/restore, and close glyphs over
  `--theme-window-controls-backdrop`; all three remain visible and clickable
  over both the static poster and an active full-window video canvas.
- Check empty/disabled send, enabled send, running stop, and keyboard focus;
  each submit state preserves explicit surface/icon contrast.

## Static checks

- Untouched source/master artwork exists outside the distributable theme directory, and every changed delivery image was encoded directly from that source or a verified lossless working master.
- No approved existing theme asset was batch-recompressed without an explicit request or a documented measured defect.
- Manifest parses and uses schema version 1.
- Theme ID and filenames are portable.
- Home and conversation raster images exist, decode, and remain below 8 MB.
- `scripts/inspect-theme-artwork.ps1` reports the home and conversation dimensions and file sizes.
- Full-canvas artwork intended for large displays is preferably 3840 px wide and does not fall below the 3200 px warning threshold without a documented reason.
- Full-canvas WebP files target 1 MB or less when visual comparison shows no meaningful loss.
- If a soft payload target was exceeded, `design-qa.md` records why the higher-quality under-limit asset was retained. If the target was met, visual inspection still confirms no visible banding, blur, halos, or protected-subject damage.
- Documentation previews are separate derivatives and have not replaced runtime artwork.
- Every catalog theme declares a dedicated 320x180 `previewImage` at or below 256 KB; opening the switcher requests only visible/near-visible previews and never downloads full-canvas art for hidden cards.
- `--check-payload` reports `assetMode: lazy-cdp`, a payload at or below 1 MiB, zero embedded raster/video entries, and one shared CSS copy.
- No superseded, backup, source-resolution, or unreferenced full-canvas background remains in the theme folder.
- A distinct usage-details raster exists, is not the home/conversation artwork, and remains at or below 300 KB.
- Theme CSS explicitly defines all five usage-panel semantic tokens.
- All four safe SVG icons exist and remain below 64 KB.
- Runtime payload builds without unresolved placeholders.
- JavaScript and PowerShell syntax checks pass.
- A dedicated transparent selected-thread background is declared through `selectedLeaf`, remains at or below 512 KB, and is authored near its rendered aspect ratio (recommended 640×72) rather than derived from a full-canvas image.

## Home view

- Hero fills the intended region at common window sizes.
- Hero detail remains crisp at the largest available target viewport at 100% display scaling; inspect faces, hair, foliage, architecture, line art, and other high-information regions.
- Heading and subtitle remain readable.
- Four action blocks appear, align, and retain icons.
- Clicking an action fills the native composer without submitting.
- Sidebar, menus, project selection, and window controls remain usable.
- Collapse and expand the native sidebar with both its toolbar button and `Ctrl+B`.
  The active theme, scene background/video, motion tier, content styling, and
  composer must remain active while collapsed; the switcher must return when the
  sidebar expands without resetting the selected theme.
- On the first home render, only the themed title and four-action grid are visible; Codex's native heading and suggestion cards never peek out behind them.
- When the Fast-mode promotion is present, it remains fully visible, clickable,
  and dismissible without collapsing into a white strip or moving the project
  selector/composer below the viewport. Validate this after a Codex DOM update;
  discovery must use the semantic `aside`/status card or its natural
  `scrollHeight`, not require an already-unclipped rendered height.
- Expand and collapse a long project list; the resulting show-more/show-less control remains readable over the sidebar artwork.

## Conversation view

- Treat Tidal Hymn's conversation treatment as the completeness benchmark, not as an art-direction dependency: every theme must provide an equally coherent canvas, readable mask, composer hierarchy, and control treatment in its own visual language.
- Background covers the full task surface, including the right side and lower area.
- Conversation artwork remains continuous behind the content and operation areas; the task-title toolbar is translucent, readable, and does not introduce an opaque band or change native geometry.
- Switch through every bundled theme on both home and conversation routes and confirm the direct content toolbar continues to reveal the active scene. No theme-local late rule may repaint it as an opaque white, cream, colored, or dark band.
- At normal, narrow, and largest target viewports, the protected character's complete head, face, crown/ears, hair silhouette, and defining ornament remain below the Windows menu and Codex content toolbar. Confirm the source master reserved the upper chrome safe zone instead of compensating with runtime offsets.
- Sidebar and conversation content read as one coordinated full-window scene; the content column must not restart, tile, or crop a second copy of the same raster.
- Background detail remains crisp at the largest available target viewport without runtime sharpening or full-screen filters.
- Text, code, diffs, tool output, links, and image previews remain legible.
- Edit an existing user message and verify the inline editor text, caret,
  placeholder, cancel button, and send button all remain readable. Confirm the
  editor marker disappears after cancel/send and the ordinary composer is unchanged.
- Composer aligns with the content column.
- No opaque white frame or side rail appears on any of the composer's four edges. Verify the top and bottom as well as the left and right in the conversation route.
- Trigger a file change and verify no white strip appears behind the file-changes summary pill.
- Inspect a populated file-change summary card: header, file paths, added/deleted counts, undo/review controls, hover state, and expanded rows must remain readable on one coherent themed surface.
- Model, microphone, access mode, attachment, and submit/stop controls remain usable.
- While a turn is running, queue a follow-up and verify its guide row background, main copy, secondary copy, attachment preview, Steer/retry action, delete/menu controls, hover states, and disabled states remain readable; emptying the queue removes the themed marker.
- Click every visible conversation-toolbar control, including output, bottom
  panel, pinned summary, and sidebar toggles. The native content viewport must
  never be the top `elementFromPoint` result at a toolbar button center.
- Every composer control, placeholder, tooltip, disabled state, and filled submit/stop icon has an explicit readable color in both soft and full tiers.
- Grow the composer to multiple lines and trigger file-change summaries; decorative borders remain attached to the composer box and never depend on a fixed viewport position.
- Type continuously for at least 15 seconds and scroll a long conversation while the active route is idle. Verify character echo remains immediate, scroll stays smooth, runtime ensure-count does not rise for editor-only mutations, and the composer has no computed backdrop blur.
- While a long task streams, verify theme CSS does not use universal descendants
  or broad `[data-state]` descendants on the conversation shell and that style
  recalculation remains a small fraction of the sample interval.
- Test every declared video at off, low, and high tiers on both home and conversation routes. A route without a tier-specific video must have zero live background-video elements and must not decode a hidden fallback clip.
- When a theme declares `windowVideoCanvas`, verify its active video is a direct
  child of `body`, covers the viewport, and continues behind menu strip, toolbar,
  content, and composer without a static duplicate. For themes without the flag,
  verify the video remains a child of and exactly bounded to the active scene
  shell. Switch between both modes and confirm neither geometry leaks.
- Running progress uses only small-area motion and stops under reduced-motion preferences.
- Current thread remains legible when pin/archive controls appear; controls do not shift the title.
- Switch through every bundled theme and verify the current-task row retains
  that theme's own ornament, silhouette, or emblem; shared runtime CSS must not
  reduce the catalog to the same border with only a color change.
- The current task reads as selected without a full-width opaque color block:
  its theme-local cue remains visible, the central scene remains perceptible,
  and pin/archive hover surfaces stay localized to those controls.
- Themes with an approved selected-task identity motif retain one recognizable
  transparent emblem without reintroducing an opaque full-row illustration.
- On long conversations, the native quick-jump rail is visible without hover on
  both the brightest and darkest parts of the theme artwork; hover and keyboard
  focus enlarge the active marker without changing native scroll behavior.
- Populate enough sidebar tasks to require scrolling. Verify that wheel and
  trackpad scrolling remain smooth while the selected-row artwork, text shadow,
  unread glow, loading state, pin/archive actions, and hover styling remain
  visually unchanged. Off-screen rows must retain their native 30 px height
  when scrolled into view.
- Start a turn so the selected task shows its loading spinner. The spinner remains overlaid at the right edge and the title stays on the same single-line vertical center before, during, and after loading.
- Selected-state artwork stays attached to the title label, ahead of its text, when thread action controls appear or disappear.
- The complete selected-row background keeps its center low-detail, does not repeat or distort recognizably, and leaves the unread indicator plus pin/archive actions unobstructed.
- Trigger conversation mutations while the current thread is selected; its marker must not be removed and re-added or visibly flash.
- Hover repeatedly between the current task title and its pin/archive actions; the native `[aria-current="page"].sidebar-item` fallback must keep the same border and background on every frame.
- Navigate from a selected conversation back to New Task; no previous conversation may retain the themed selected-task marker or label artwork.
- Output/environment panels preserve links, expanders, source rows, and pointer behavior.
- Inspect the output panel's outer container and sticky child headers. They must resolve to one intended surface color rather than mixed white and cream layers.

## Portaled overlays

- Open Sites and verify the page canvas, heading, subtitle, search rail, search
  icon/text/placeholder, empty state, refresh action, and create actions remain
  readable. Open Before using Sites and inspect its title, body, bullets, link,
  close control, and Continue button independently.
  Confirm no full-width dark/light strip or fade remains behind the bounded
  search field at the top of the page.
- Open Create Project and verify the project-name field, placeholder, folder
  icon, source-folder instruction, caret, borders, cancel/create actions, and
  close control all remain readable while preserving native geometry.
- Open the usage/credits card and verify its remaining percentage, reset schedule, close control, progress bar, and both actions use dark readable text on the light card, including under every dark theme.
- Open the full usage-details panel and verify its dedicated non-home/non-conversation artwork, title, reset rows, availability badges, progress bar, close control, disabled states, actions, and long-content scrolling. Switch themes while it is open and confirm artwork plus all text colors update together.
- Open menus, dialogs, and popovers from both the sidebar and conversation toolbar.
- Open Plugin discovery and verify the sticky search rail, search field, icon, text, and placeholder use the active theme instead of an opaque white band.
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
- The motion control exposes `关闭 / 柔和 / 完整`, keeps the panel open while changing levels, updates `data-dream-motion`, and persists across theme switches and reloads. Legacy `medium` storage migrates to `low`.
- Off removes custom atmosphere layers; soft keeps at least one clearly perceptible primary effect; full adds richer localized atmosphere without moving full-canvas artwork. A localized pre-rendered `motionImage` may run only in the intended tier. System reduced-motion still forces static output.
- If `motionImage` is present, verify that it is a local WebP no larger than 2 MB, loops without a visible jump, stays localized under a soft mask, and never covers text or controls.
- If the full-window wander layer is enabled, verify exactly three independent motifs, distinct sizes and routes, movement beyond the home-task region, full fade-out before route reseeding, new coordinates after `animationiteration`, `pointer-events: none`, and complete removal under reduced motion.
- If `homeVideo` or `conversationVideo` is present, verify the runtime selects the matching scene on route changes, appears only at the full motion tier, is muted/looping/non-interactive, keeps the matching static poster until playable, fully replaces that poster when ready, pauses while the document is hidden, is removed outside the full tier, and never runs under reduced motion.
- If `homeSoftVideo` or `conversationSoftVideo` is present, verify it appears only at the soft tier, contains the approved restrained treatment, has no audio, is cheaper to decode than the full clip, and is atomically replaced by the full-tier video rather than layered beneath it.
- Test all six scene/tier combinations: home static, home soft, home full, conversation static, conversation soft, and conversation full. The active scene must never reuse the other scene's poster or video as a temporary frame.
- Inspect directional video motion across the entire clip and at the loop seam. Bubbles, rain, snow, petals, smoke, and drifting motes must continue in one physical direction, never reverse during the second half, and never snap across protected reading regions. Reject generated footage when faces, hands, instruments, silhouettes, or the approved composition drift; use a deterministic environmental overlay on the static scene when generation cannot keep those anchors stable.
- When otherwise-approved generated footage has mismatched endpoints, search short windows near the beginning and end for the pair with the closest protected-subject pose and composition. Trim to those cyclic cut points and use a short forward-only overlap (normally 6–12 frames) ordered as the uninterrupted body followed by the tail-to-head blend. The blend must end on the same forward-time frame that begins the next loop; never append a head segment that makes the player jump backward at wraparound. Compare adjacent-frame difference across the seam against the untouched source and retain the optimized version only when the peak discontinuity is materially lower without visible subject ghosting.

## Resilience

- Check a narrower window without horizontal overflow.
- Switch between home and conversation routes.
- Sign out and verify the login/authentication window is completely native:
  no static artwork, video, handoff shield, theme chrome, switcher, or motion
  layer may cover its controls. Confirm video resources are released, then sign
  in again and verify the selected theme resumes without restarting Codex.
- For video themes, test both route directions separately. While the incoming
  scene decodes, the outgoing moving scene remains visible and the static
  poster never flashes back, even if Codex replaces `main.main-surface`.
- Reload or open a second task and confirm reinjection.
- Start or verify the theme while the sidebar is already collapsed; the semantic
  shell header must pass verification without weakening signed-out cleanup.
- Restore and confirm the native UI returns.
- Re-run after a Codex update.
- Record source path, source and output dimensions, encoder/quality settings, encoded size, normal viewport, largest tested viewport, side-by-side findings, and any accepted quality exception in `design-qa.md`.
