---
name: storybook-solidjs
description: Generate or edit Solid.js Storybook story files (*.story.tsx).
---

# Storybook skill for Solid.js

Open the relevant reference files before working.

## Core Rules

1. Co-locate stories with the component and name them `ComponentName.story.tsx`.
2. Use `storybook-solidjs-vite` `Meta` and `StoryObj` types.
3. Define `argTypes` for relevant props and events.
4. Use `fn()` from `storybook/test` for event handler args.
5. Include interactions for complex behaviors.
6. Ensure accessibility coverage for interactive stories.
7. Read `./examples/minimal-story.md` for the base story shape.
8. Read `./examples/router-decorator.md` for router consumers.
9. Read `./rules/title-rules.md` for title formatting.
