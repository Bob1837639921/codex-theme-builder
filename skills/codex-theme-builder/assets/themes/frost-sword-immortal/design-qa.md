# 雪境剑仙设计 QA

- Tested viewport: 1682 × 820 conversation view.
- Off: all custom atmosphere layers hidden.
- Low: sparse snow drift.
- Medium: brighter crystal drift without a separate foreground halo.
- High: denser crystal drift plus a diagonal sword-light pass.
- Motion stays on compositor-safe opacity and transform paths and does not animate the full background raster.
- Sidebar labels, selected-task marker, composer controls, and conversation text remain readable.
- `prefers-reduced-motion` disables every custom animation.
- Validation: runtime payload, large-canvas artwork, CSS scope, and live CDP preview passed.

final result: passed
