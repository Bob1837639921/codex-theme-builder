# Autonomous design and implementation workflow

Use this workflow when the user asks Codex to design and complete a theme without managing individual implementation steps.

## Required run artifacts

Create a run directory outside the Skill:

```text
theme-run/
  brief.md
  baseline/
  design/
  design-decision.md
  implementation-map.md
  theme/
  qa/
    design-qa.md
  dist/
```

Do not store customer screenshots, temporary runs, or generated archives inside the reusable Skill.

## 1. Resolve requirements

Record the visual direction, target Codex version, platform, required routes, interaction states, motion preference, supplied assets, and acceptance criteria in `brief.md`. Inspect the current theme and native Codex patterns before proposing changes.

Proceed autonomously when requirements and a current/reference screen make the intended outcome unambiguous. Ask only when a missing decision would materially change the result or require new authority.

## 2. Capture the baseline

Capture the exact route, viewport, content state, hover/focus state, and any transient state being changed. Include home, conversation, composer, file-change summary, selected thread actions, popovers, and output panel when relevant.

## 3. Produce an implementable design target

- Before generating a preview, write a provisional `implementation-map.md` for every requested visible change. Mark each row as native surface, scoped decoration, shared runtime augmentation, or forbidden. Do not put forbidden or unmapped elements into the prompt.
- Use supplied screenshots or mockups directly when selected.
- For a constrained redesign of an existing screen, use image editing with the baseline as the locked edit target. Preserve its window geometry, panel bounds, native control positions, labels, information architecture, and visible state. Change only mapped visual properties and mapped augmentations.
- If there is no selected visual target and the direction can branch, generate exactly three distinct previews. Normally wait for the user to select one.
- If the user explicitly requests a fully automatic run or delegates the choice, do not pause. Put the three options into one comparison, score each from 1-5 for requirement fit, native-control compatibility, implementation feasibility, readability/accessibility, and runtime cost, select the highest total, and record the rationale in `design-decision.md`. Break ties in favor of the lower-cost option.
- Generate real raster artwork when the design needs new imagery. Use an appropriate icon library or supplied icons; do not fake visible assets with text glyphs, emoji, CSS drawings, handcrafted SVGs, or placeholders.
- Keep native control positions and labels unless the request explicitly changes them and the runtime can preserve their behavior.
- Reject a generated preview when it invents a file explorer, code editor, dashboard column, character rail, output region, navigation item, or theme control that is absent from both the baseline and the provisional implementation map. Regenerate with tighter invariants instead of treating the drift as a valid option.

Static previews do not express motion. Add a short motion specification covering trigger, duration, easing, animated properties, completion state, and reduced-motion behavior.

## 4. Finalize feasibility before coding

Write `implementation-map.md` with one row per visible change:

| Design element | Native surface | Hook or marker | Asset | States | Motion | Fallback | Cost |
|---|---|---|---|---|---|---|---|

Revise the design before implementation when a row requires destructive app modification, remote debugging outside loopback, inaccessible controls, sustained large-area animation, or an unreliable global DOM scan.

Prefer existing stable classes. Add narrowly scoped runtime marker classes only when native selectors are insufficient. Cache or scope DOM searches so mutations do not repeatedly scan a long conversation.

## 5. Implement

Create a new portable theme with `new-theme.ps1` or copy an existing theme to a new ID. Keep theme-specific styles in `theme.css`; change the shared runtime only for reusable hooks or safety fixes.

Preserve layout, menus, tooltips, project selection, thread actions, composer controls, output controls, focus visibility, pointer targets, and native text semantics. Add reduced-motion behavior for every animation.

## 6. Validate and hot-preview

Run `test-theme.ps1` after every structural change. If a safe themed session is already active, use `preview-theme.ps1` to hot-apply the theme and capture the required state. The hot preview is temporary and does not replace the saved session theme.

If no session exists, request that the user save drafts and fully close Codex before running `start-theme.ps1 -ConfirmCodexClosed`. Never force-close or silently restart Codex.

## 7. Run visual QA

Compare the design target and implementation at the same viewport and state in one combined comparison view. Check typography, spacing, colors, image quality, copy, hover, focus, selected, loading/running, expanded, narrow-window, and reduced-motion states.

Write `qa/design-qa.md` with source path, implementation path, viewport, state, findings, correction history, and exactly one final line:

```text
final result: passed
```

Do not hand off while actionable high- or medium-impact issues remain. Recapture after every such fix.

## 8. Package and hand off

Run `package-theme.ps1` only after static validation and visual QA pass. Return the theme directory, preview images, QA report, and distributable archive. Explain whether the result was hot-previewed only or installed as the saved session theme.
