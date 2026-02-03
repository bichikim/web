---
name: Storybook skill for Solid.js
description: Generates a Solid.js Storybook story file  (*.story.tsx).
---

# Storybook skill for Solid.js

## File Placement

- Co-locate stories with the component
- Naming: `ComponentName.story.tsx`

## Examples

### Minimal Example

```tsx
import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {Button} from './Button'
import {fn} from 'storybook/test'

const meta = {
  title: 'Coong/Components/Button',
  component: Button,
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      table: {category: 'Props;'},
    },
    onClick: {
      table: {category: 'Events'},
      type: {name: 'function', required: false},
    },
  },
  args: {
    children: 'Button',
    onClick: fn(),
    size: 'md',
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Variants: Story = {args: {variant: 'secondary'}}
```

### When storying a component that consumes context

See `examples/router-decorator.md`

## Testing + A11y

- Include interactions for complex behaviors
- Ensure accessibility coverage
