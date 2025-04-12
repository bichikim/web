import type {Meta, StoryObj} from 'storybook-solidjs'
import {STopLevelPanel} from './STopLevelPanel'

const meta = {
  args: {
    //
  },
  component: STopLevelPanel,
  parameters: {
    layout: 'centered',
  },
  title: 'BPlan/Components/HiddenPanel/STopLevelPanel',
} satisfies Meta<typeof STopLevelPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}
