# Minimal Solid.js Storybook Story

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
      table: {category: 'Props'},
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
