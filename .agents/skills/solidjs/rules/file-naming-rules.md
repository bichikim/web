# Solidjs Component file naming rules

- Component files must use `PascalCase.tsx`.
- Component filenames must match the exported public component name.
- Keep one public component per component file.
- Do not name component files after helper, adapter, wrapper, or implementation roles.
- Prefix conventions:
  - `S` for styled components.
  - `H` for headless components; may include minimal normalize styles.
  - No prefix for generic/base components.
- Use kebab-case for component directories.
- Use kebab-case for Solidjs custom hooks, and write them as `.ts` files.
- Use descriptive suffixes for sub-components (e.g., `Provider`, `Root`, `Content`, `Item`, `Overlay`).
- Story files: `<ComponentName>.story.tsx`.
- Test files: `<ComponentName>.spec.tsx`.
