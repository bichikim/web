# Solidjs Component file naming rules

- Use PascalCase for component filenames (match component name).
- Prefix conventions:
  - `S` for styled components.
  - `H` for headless components; may include minimal normalize styles.
  - No prefix for generic/base components.
- Use kebab-case for component directories.
- Use kebab-case for Solidjs custom hooks, and write them as `.ts` files.
- Use descriptive suffixes for sub-components (e.g., `Provider`, `Root`, `Content`, `Item`, `Overlay`).
- Story files: `<ComponentName>.story.tsx`.
- Test files: `<ComponentName>.spec.tsx`.
