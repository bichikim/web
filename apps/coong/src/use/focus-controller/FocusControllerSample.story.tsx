import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import type {DeepPosition} from 'src/utils/focus-controller/deep-position'
import {FocusControllerSampleContainer, FocusItemsSameLevel, FocusItemsDifferentLevel} from './FocusControllerSample'

const FocusControllerSample = () => {
  return (
    <FocusControllerSampleContainer>
      <FocusItemsSameLevel />
    </FocusControllerSampleContainer>
  )
}

const FocusControllerSampleJumpDifferentLevel = () => {
  return (
    <FocusControllerSampleContainer>
      <FocusItemsDifferentLevel />
    </FocusControllerSampleContainer>
  )
}

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
  title: 'Coong/Use/FocusControllerSample',
} satisfies Meta<typeof FocusControllerSample>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <FocusControllerSample />,
}

export const JumpVisualDifferentLevel: Story = {
  args: {},
  render: (args: FocusControllerSampleStoryProps) => (
    <div class="flex flex-col gap-6">
      <FocusControllerSampleJumpDifferentLevel />
    </div>
  ),
}

export const JumpVisualNext: Story = {
  args: {},
  render: (args: FocusControllerSampleStoryProps) => (
    <div class="flex flex-col gap-6">
      <FocusControllerSample />
    </div>
  ),
}
