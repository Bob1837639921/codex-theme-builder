# Full-canvas artwork quality

Read this reference before creating, replacing, enlarging, or compressing home and conversation artwork.

## Preserve the visual target

- Prefer a native high-resolution source or a larger render of the approved artwork.
- When only a smaller approved raster exists, preserve its exact composition, character identity, pose, costume, instrument, architecture, and safe zones.
- Do not replace an approved scene with a newly generated look-alike merely to gain pixels.
- Use separate home and conversation crops when one composition cannot protect both title and working-content zones.

## Compose for the full conversation canvas

- Default to one continuous conversation scene beneath the content, toolbar,
  output, and composer layers. Author the image for the full window crop rather
  than for only the scrollable message rectangle.
- Reserve the upper 12% of a 16:9 conversation master for low-detail scenery and
  translucent chrome. Keep the protected character's head top at or below that
  boundary and the eyes at or below roughly 18% of image height. This is the
  default overscan-safe target, not permission to crop the body or defining prop.
- For a right-side character, retain calm reading space through the center and
  left. Keep the face, crown, ears, hair silhouette, and signature ornament fully
  visible below the combined Windows menu and Codex conversation toolbar at
  normal, narrow, and largest target viewports.
- Generate or recompose from the source master when the protected head zone is
  wrong. Do not repeatedly blur, stretch, or inpaint an already compressed
  delivery image to force it downward.

## Keep an immutable source master

- Keep the original or approved generated image unchanged in the theme work area, normally `work/theme-runs/<theme-id>/source/`. The distributable `assets/themes/<theme-id>/` directory contains delivery copies only.
- Never resize, sharpen, convert, or compress in place over the source master. Write every derived file to a separate output path.
- Encode each new delivery asset directly from the source master or a verified lossless working master. Never use an already compressed WebP or JPEG as the source for another compression pass.
- Never batch-recompress existing approved theme artwork merely to make repository totals smaller. Change an approved asset only when the user requests it or measured QA identifies a specific defect; record the reason in `design-qa.md`.
- Keep source masters out of the packaged Skill and Git payload unless the user explicitly asks to publish them. Retain them in the local work area until the theme is accepted and safely archived.

## Prepare large-display assets

- Prefer a 3840 px output width for full-canvas desktop artwork. Preserve the source aspect ratio unless the implementation map specifies a deliberate crop.
- Treat widths below 3200 px as a warning for artwork expected to cover large desktop displays.
- If enlargement is required, use offline content-preserving super-resolution. A proven workflow is Real-ESRGAN `realesrgan-x4plus`, followed by a high-quality Lanczos resize to the final 3840 px width.
- Inspect the enlarged result before acceptance. Reject altered faces, hands, weapons, instruments, text, silhouettes, brush strokes, or repeated texture artifacts.
- Delete disposable lossless intermediates after the final encoded asset is verified, but do not delete or overwrite the immutable source master. Do not commit temporary PNGs, model binaries, or generated comparison sheets.
- Replace the manifest-referenced asset in place or update the manifest atomically, then delete the superseded background. Do not keep `old`, `backup`, source-resolution, or alternate encoded copies inside the theme folder.
- Before packaging, search the manifest, theme CSS, catalog, and documentation for every remaining raster filename. Remove any unreferenced full-canvas or preview raster unless it is an intentional documented asset.

## Encode efficiently

- Use WebP for opaque full-canvas artwork unless transparency or a supplied lossless source requires PNG.
- Start around WebP quality 84 and adjust only after side-by-side comparison. Prefer a slower encoder setting during production because encoding is not a runtime cost.
- Target 1 MB or less per full-canvas WebP when the scene remains visually faithful. The manifest hard limit remains 8 MB.
- Treat the 1 MB target as soft. If meeting it causes visible blur, banding, ringing, haloing, texture collapse, or damage to faces, hair, hands, fabric, text, line art, weapons, or instruments, keep the higher-quality encoding under the 8 MB hard limit and document the exception.
- Preserve alpha and clean edges for transparent ornaments. Do not force transparent PNG/WebP assets into an opaque or visibly destructive encoding.
- Create README and documentation previews as separate derivatives. They may be smaller than runtime artwork, but must never be copied back over a theme's delivery asset.
- Keep small markers, icons, and corner ornaments close to their maximum rendered dimensions instead of applying the 4K rule to every asset.

## Keep runtime cost flat

- Perform super-resolution and sharpening once during theme production.
- Do not add JavaScript upscaling, canvas redraw loops, continuous CSS filters, animated full-screen layers, or GPU-heavy recovery effects.
- At runtime, load the static encoded image and use ordinary CSS background compositing.

## Optimize scene video without undoing approved motion

- Inspect every declared MP4 with `ffprobe` before changing it. Record codec,
  dimensions, pixel format, average frame rate, frame count, duration, payload,
  bitrate, and whether an audio stream is present.
- Treat an explicitly approved frame rate as part of the artwork. Do not
  interpolate an already optimized 24 fps scene merely to advertise a larger
  number. Preserve frame rate, frame count, duration, direction, and loop timing
  during resolution enhancement.
- For the full motion tier, prefer 2560x1440 H.264 when a 1280x720 source is
  visibly soft on a large display. Use offline, content-preserving
  super-resolution such as `RealESRGAN_x2plus`; do not diffuse or redraw faces,
  hands, costumes, instruments, weapons, silhouettes, or scene composition.
- Keep the soft tier materially cheaper than the full tier. Prefer 1280x720 at
  the approved frame rate, remove audio, and avoid carrying a 1440p soft clip
  when the full clip is not more expensive.
- Background videos must be silent. Remove accidental audio streams; when the
  picture already passes, copy the video stream instead of re-encoding it.
- Encode distributable clips as H.264 `yuv420p`, enable fast start, and keep each
  declared video below the 8 MB manifest limit. Retain a high-quality
  intermediate outside the theme directory only while visual QA is active.
- After enhancement, verify exact frame count and duration, compare a downscaled
  enhanced frame against the source, inspect protected subjects at several
  timestamps, and check the loop seam. Reject over-sharpening, temporal shimmer,
  edge halos, texture crawling, face drift, or a larger file with no visible
  benefit.

## Verify at real scale

1. Run `scripts/inspect-theme-artwork.ps1 -ThemePath <theme>` and record dimensions and encoded sizes.
2. Run `scripts/test-theme.ps1`.
3. Hot-preview both home and a populated conversation.
4. Inspect at normal, narrow, and the largest available target viewport at 100% display scaling. Prefer a viewport at least 3200 px wide when the target machine has an ultrawide or 4K display.
5. Compare facial detail, fine line art, foliage, fabric, hair, weapons, instruments, and low-contrast texture against the approved source.
6. Confirm that the theme folder contains no superseded or unreferenced background copies.
7. Compare every changed delivery asset side by side with its source master at 100% and at the largest target viewport. When both images have matching geometry, use PSNR or SSIM as supporting evidence, never as a substitute for visual inspection.
8. Record the source path, output dimensions, encoded size, encoder/quality settings, tested viewports, comparison findings, and accepted exceptions in `design-qa.md`.
