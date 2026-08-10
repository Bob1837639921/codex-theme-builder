# Conversation quality baseline

Use this baseline for every new theme. `tidal-hymn` is the current visual-quality
reference because its soft and full conversation states are both readable,
coherent, and stable. It is a benchmark, not a dependency: never copy its ocean
palette, pearls, character art, or theme-local selectors into another theme.

## Required behavior

1. Mount one conversation scene on the global canvas. Main content, sidebar,
   toolbar, output panel, and composer are coordinated translucent layers, not
   independent copies of the same raster with different `cover` crops.
   Keep the content toolbar translucent so the scene remains continuous through
   the task-title and operation area without changing native geometry.
2. Provide separate `homeSoftVideo` / `conversationSoftVideo` and
   `homeVideo` / `conversationVideo` whenever both soft and full are approved as
   video treatments. Never reuse a home crop in conversation.
3. Let the shared atomic video handoff own first load, route changes, theme
   changes, and soft/full changes. A theme may remove static art only with
   `is-covering`; it may not create a second crossfade. When Codex replaces the
   route shell, the shared runtime keeps the playing scene video on a stable
   document layer, then retains it as the outgoing painted fallback after
   reattachment. The static route image must not become opaque while the
   incoming scene video decodes.
4. Keep the composer decoration attached to `.composer-surface-chrome` so it
   grows with multiline input. The center and native control strip remain clear.
5. Set explicit composer colors for editor text, placeholder, access mode,
   attachment, model selector, microphone, submit/stop, and orange permission
   status. Use exact token matching for the filled submit/stop button.
6. Keep prose, tool rows, diff summaries, progress, output, menus, dialogs,
   plugin search, compact quota warning, and full usage details readable in the
   same palette hierarchy.
7. Soft must be visibly alive but materially quieter and cheaper than full.
   Full may use the richer scene video. Both must pause while hidden and obey
   reduced motion.
8. Validate a populated conversation, long scroll, multiline composer,
   file-change summary, output panel, plugin search, compact quota warning, full
   usage details, normal viewport, and narrow viewport.
9. Validate character composition against the top chrome safe zone. The upper
   12% of a 16:9 master remains low-detail, the head begins below it, the eyes sit
   below roughly 18%, and no face, crown, ear, or hair silhouette is hidden by
   the Windows menu or Codex conversation toolbar.

## Acceptance evidence

- Static, soft, and full captures use the same protected-subject composition or
  the shared shield fully conceals their atomic swap.
- No static poster remains mixed beneath an opaque ready video.
- Neither `home -> conversation` nor `conversation -> home` exposes a static
  poster between two moving scenes, including when the main shell is replaced.
- No native toolbar or composer geometry changes during the handoff.
- Runtime verification waits until the handoff shield is gone and the active
  video is ready before accepting injection or taking a screenshot.
- `design-qa.md` records all three motion states and ends with
  `final result: passed`.
