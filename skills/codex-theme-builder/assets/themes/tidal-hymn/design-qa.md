# 潮汐圣歌设计 QA

- Tested viewport: 1682 × 820 conversation view.
- Off: all custom atmosphere layers hidden.
- Low: localized bubble drift only.
- Medium: bubble drift plus independent pearl-mote field.
- High: bubbles plus a pre-rendered transparent water-caustic loop, softly masked to the lower-right scene.
- The 432 × 432, 6 fps, 4-second WebP loop is 1,521,606 bytes and stays below the 2 MB motion-asset budget.
- The loop is generated offline from an original water-caustic texture; Codex performs no live fluid simulation, blur recovery, or full-screen filter animation.
- Text, composer controls, selected task actions, and the output panel remain unobstructed.
- `prefers-reduced-motion` stops custom transforms and freezes the decorative layers.
- Validation: runtime payload, manifest, asset size, large-canvas artwork, CSS scope, and live CDP preview passed.

final result: passed
