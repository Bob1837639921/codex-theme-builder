# Full-canvas artwork quality

Read this reference before creating, replacing, enlarging, or compressing home and conversation artwork.

## Preserve the visual target

- Prefer a native high-resolution source or a larger render of the approved artwork.
- When only a smaller approved raster exists, preserve its exact composition, character identity, pose, costume, instrument, architecture, and safe zones.
- Do not replace an approved scene with a newly generated look-alike merely to gain pixels.
- Use separate home and conversation crops when one composition cannot protect both title and working-content zones.

## Prepare large-display assets

- Prefer a 3840 px output width for full-canvas desktop artwork. Preserve the source aspect ratio unless the implementation map specifies a deliberate crop.
- Treat widths below 3200 px as a warning for artwork expected to cover large desktop displays.
- If enlargement is required, use offline content-preserving super-resolution. A proven workflow is Real-ESRGAN `realesrgan-x4plus`, followed by a high-quality Lanczos resize to the final 3840 px width.
- Inspect the enlarged result before acceptance. Reject altered faces, hands, weapons, instruments, text, silhouettes, brush strokes, or repeated texture artifacts.
- Delete lossless intermediate files after the final encoded asset is verified. Do not commit temporary PNGs, model binaries, or generated comparison sheets.
- Replace the manifest-referenced asset in place or update the manifest atomically, then delete the superseded background. Do not keep `old`, `backup`, source-resolution, or alternate encoded copies inside the theme folder.
- Before packaging, search the manifest, theme CSS, catalog, and documentation for every remaining raster filename. Remove any unreferenced full-canvas or preview raster unless it is an intentional documented asset.

## Encode efficiently

- Use WebP for opaque full-canvas artwork unless transparency or a supplied lossless source requires PNG.
- Start around WebP quality 84 and adjust only after side-by-side comparison. Prefer a slower encoder setting during production because encoding is not a runtime cost.
- Target 1 MB or less per full-canvas WebP when the scene remains visually faithful. The manifest hard limit remains 8 MB.
- Keep small markers, icons, and corner ornaments close to their maximum rendered dimensions instead of applying the 4K rule to every asset.

## Keep runtime cost flat

- Perform super-resolution and sharpening once during theme production.
- Do not add JavaScript upscaling, canvas redraw loops, continuous CSS filters, animated full-screen layers, or GPU-heavy recovery effects.
- At runtime, load the static encoded image and use ordinary CSS background compositing.

## Verify at real scale

1. Run `scripts/inspect-theme-artwork.ps1 -ThemePath <theme>` and record dimensions and encoded sizes.
2. Run `scripts/test-theme.ps1`.
3. Hot-preview both home and a populated conversation.
4. Inspect at normal, narrow, and the largest available target viewport at 100% display scaling. Prefer a viewport at least 3200 px wide when the target machine has an ultrawide or 4K display.
5. Compare facial detail, fine line art, foliage, fabric, hair, weapons, instruments, and low-contrast texture against the approved source.
6. Confirm that the theme folder contains no superseded or unreferenced background copies.
7. Record the tested viewports, asset dimensions, sizes, findings, and accepted exceptions in `design-qa.md`.
