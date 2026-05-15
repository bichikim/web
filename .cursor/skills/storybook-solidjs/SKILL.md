---
name: storybook-solidjs
description: Generates Solid.js Storybook story files (*.story.tsx). Use when creating or editing Storybook stories for Solid.js components
---

# Storybook skill for Solid.js

작업에 해당하는 섹션의 참조 파일을 먼저 열고 적용한다.

## Core Rules

1. Co-locate stories with the component and name them `ComponentName.story.tsx`.
2. Use `storybook-solidjs-vite` `Meta` and `StoryObj` types.
3. Define `argTypes` for relevant props and events.
4. Use `fn()` from `storybook/test` for event handler args.
5. Include interactions for complex behaviors.
6. Ensure accessibility coverage for interactive stories.
7. See ./examples/minimal-story.md for the base story shape.
8. See ./examples/router-decorator.md when storying a component that consumes router context.
9. See ./rules/title-rules.md for Storybook title formatting.
