import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {TadaDemo} from './TadaDemo'

const meta = {
  argTypes: {
    // No props for this component as it's a demo component
  },
  component: TadaDemo,
  title: 'Coong/Components/TadaDemo',
} satisfies Meta<typeof TadaDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const WithContainer: Story = {
  args: {},
}
