import type {Meta, StoryObj} from 'storybook-solidjs'
import {IntersectionDemo} from './IntersectionDemo'

const meta = {
  argTypes: {
    rootMargin: {
      control: 'text',
      description: 'Root margin for intersection observer',
    },
    threshold: {
      control: {max: 1, min: 0, step: 0.1, type: 'range'},
      description: 'Threshold value for intersection detection (0-1)',
    },
  },
  args: {
    rootMargin: '0px',
    threshold: 0.5,
  },
  component: IntersectionDemo,
  title: 'Hooks/useIntersection',
} satisfies Meta<typeof IntersectionDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    rootMargin: '0px',
    threshold: 0.5,
  },
}

export const HighThreshold: Story = {
  args: {
    rootMargin: '0px',
    threshold: 0.8,
  },
}

export const WithRootMargin: Story = {
  args: {
    rootMargin: '50px',
    threshold: 0.5,
  },
}

export const LowThreshold: Story = {
  args: {
    rootMargin: '0px',
    threshold: 0.1,
  },
}
