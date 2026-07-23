# 沉没歌剧设计 QA

- Tested viewport: 1682 × 820 conversation view.
- Off: all custom atmosphere layers hidden.
- Low: sparse bioluminescent plankton drift.
- Medium: plankton plus a distinct sonar pulse.
- High: denser cyan/violet particles plus a localized abyssal energy gate.
- Motion stays localized and uses compositor-safe opacity and transform animation.
- Dark dialogs and file-change summaries retain explicit descendant colors and WebKit text fill.
- `prefers-reduced-motion` disables every custom animation.
- Validation: runtime payload, large-canvas artwork, dark-surface contrast, CSS scope, and live CDP preview passed.

final result: passed
