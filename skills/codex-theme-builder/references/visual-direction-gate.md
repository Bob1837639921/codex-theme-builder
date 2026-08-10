# Visual direction approval gate

Use this gate for every new theme whose visual direction has not already been approved.

## Goal

Resolve the highest-risk design decision with the smallest useful artifact. The conversation page is the default decision surface because it exposes the continuous canvas, sidebar, readable long-form content, selected task, output panel, and composer in one view.

## Stage 1: Ground the options

1. Locate the original source assets. When the request names a character from a local character pool, resolve the pool root and inspect the character's main visual, outfit variants, scene, portrait, and full-body references. Do not design from a small catalog thumbnail when originals exist.
2. Preserve the character lock: face, body proportions, signature mark, hair logic, lore symbols, and defining prop. Vary clothing color, pose, environment, panel material, and accent palette only when the source set supports the variation.
3. Attach an authentic Codex conversation screenshot as the layout reference. Treat its geometry and native controls as locked; use other themed screenshots only for structure, never for their character identity or artwork.

## Stage 2: Generate exactly three previews

- Generate three independent 16:9 conversation-page screenshots.
- Do not place the three directions in one contact sheet.
- Make the directions materially distinct in palette, light level, costume treatment, environment, glass/material language, selected-task styling, output panel, and composer edge treatment.
- Keep the native Codex sidebar, conversation header, long-form thread, output/resources panel, composer controls, model selector, and Windows title/menu areas recognizable and usable.
- Show the approved full-scene pattern by letting the conversation artwork remain visible through translucent content and conversation-toolbar layers. Keep the native geometry unchanged.
- Reserve the top chrome safe zone: place the character's head below the upper 12% of the 16:9 frame and the eyes below roughly 18%, then verify the face and head ornament remain unobstructed in the authentic Codex screenshot.
- Reject any preview with invented navigation, fake editor surfaces, missing native actions, illegible text, extra limbs, broken hands, cropped heads, or decoration that blocks controls.
- Prefer one luminous direction, one dark or dramatic direction, and one restrained/light alternative unless the brief specifies a different contrast set.

At this stage, do not generate:

- home artwork;
- usage-panel artwork;
- selected-thread strip;
- composer-edge delivery asset;
- sidebar fallback;
- icons;
- soft/full videos;
- README previews;
- packaged theme files.

Those assets depend on the selected direction and generating them early wastes time.

## Stage 3: Stop for selection

Show all three independent results, identify them only by order, and ask the user to choose 1, 2, or 3. Do not implement or expand the asset set until the user selects a direction, unless the user explicitly delegated the choice or requested an uninterrupted automatic run.

For a delegated choice, score each direction from 1 to 5 for:

- requirement fit;
- native-control compatibility;
- implementation feasibility;
- text readability and accessibility;
- runtime cost.

Record the decision and continue with the highest-scoring direction.

## Stage 4: Expand the approved direction

After approval, generate the remaining assets in dependency order:

1. conversation master and delivery image;
2. home master with a distinct pose or outfit when appropriate;
3. usage-panel background;
4. selected-thread stretch-safe background;
5. composer-edge and optional sidebar assets;
6. theme icons;
7. soft/full home and conversation videos only when requested.

Then scaffold, implement, validate, hot-preview, compare, correct, and package through the normal workflow.
