# 潮汐圣歌设计 QA

- Tested viewport: 1682 × 820 conversation view.
- Off: all custom atmosphere layers and scene videos are hidden.
- Soft: `conversation-motion-soft.mp4` provides the approved restrained environmental treatment on the conversation route; the character remains nearly static.
- Full: `conversation-motion.mp4` provides the approved character-motion treatment with restrained breathing, one blink, drifting hair/fabric, caustic light, and bubbles.
- Both conversation videos are 1280 × 720, 24 fps, 10 seconds, H.264 MP4, audio-free, and below the 8 MB per-video budget.
- The home route keeps its existing artwork and `home-motion.mp4`; the new Gemini clips are conversation-only.
- The runtime replaces soft and full sources atomically and never stacks both videos.
- Text, composer controls, selected task actions, and the output panel remain unobstructed.
- `prefers-reduced-motion` stops custom transforms and prevents scene-video playback.
- Validation: runtime payload, manifest, asset size, large-canvas artwork, CSS scope, and live CDP preview passed.

final result: passed
