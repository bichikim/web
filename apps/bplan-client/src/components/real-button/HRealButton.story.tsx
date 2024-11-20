import {Meta, StoryObj} from 'storybook-solidjs'
import {HRealButton} from './HRealButton'

const meta = {
  component: HRealButton,
} satisfies Meta<typeof HRealButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
