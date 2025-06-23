import type {Meta, StoryObj} from 'storybook-solidjs'
import {TadaDemo} from './TadaDemo'

const meta = {
  argTypes: {
    // No props for this component as it's a demo component
  },
  component: TadaDemo,
  title: 'BPlan/Components/TadaDemo',
} satisfies Meta<typeof TadaDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const WithContainer: Story = {
  args: {},
}
