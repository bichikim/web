import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import type {DeepPosition} from 'src/utils/focus-controller/deep-position'
import {FocusControllerSample} from './FocusControllerSample'

/** Story configuration for the focus controller sample */
export interface FocusControllerSampleStoryProps {
  /** List of deep positions that will render focusable buttons */
  positions: Readonly<DeepPosition[]>
}

const meta = {
  argTypes: {},
  args: {},
  component: FocusControllerSample,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Coong/Use/FocusControllerSample',
} satisfies Meta<typeof FocusControllerSample>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <FocusControllerSample />,
}

export const Variants: Story = {
  args: {},
  render: (args: FocusControllerSampleStoryProps) => (
    <div class="flex flex-col gap-6">
      <FocusControllerSample />
    </div>
  ),
}
