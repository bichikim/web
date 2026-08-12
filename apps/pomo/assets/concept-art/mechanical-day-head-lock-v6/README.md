# Day head lock v6

See `../../../plan/development/2d-scene-variant-workflow.md` for the complete production and validation workflow.

This set normalizes only the inconsistent daytime heads.

- Focused reading uses the focused writing head as its master.
- Reading and typing user-gaze variants use the writing user-gaze head as their master.
- The mask follows the union of the measured hair silhouettes and adds a short, feathered neck transition.
- Night assets, focused writing, and focused typing are not modified.
- The previous daytime set is preserved in `../pre-mechanical-day-head-lock-v6/`.

AI_NOTE - Future daytime action variants should reuse these master heads instead of regenerating the face, because AI edits introduce small scale and angle drift.
