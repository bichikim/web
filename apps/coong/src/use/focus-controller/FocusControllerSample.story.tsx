import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import type {DeepPosition} from 'src/utils/focus-controller/deep-position'
import {
  FocusControllerSampleContainer,
  FocusItemsSameLevel,
  FocusItemsDifferentLevel,
  FocusControllerSampleBody,
} from './FocusControllerSample'
import {FocusControllerProvider, type FocusControllerProviderProps} from './FocusController'

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

const FocusControllerSampleGlobalMap = (props: FocusControllerProviderProps) => {
  return (
    <FocusControllerProvider globalMap={props.globalMap}>
      <FocusControllerSampleBody globalMap={props.globalMap}>
        <FocusItemsSameLevel />
      </FocusControllerSampleBody>
    </FocusControllerProvider>
  )
}

/** Story configuration for the focus controller sample */
export interface FocusControllerSampleStoryProps {
  globalMap?: boolean
}

const meta = {
  argTypes: {
    globalMap: {
      control: 'boolean',
    },
  },
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

export const UseGlobalMap: Story = {
  args: {
    globalMap: true,
  },
  render: (args: FocusControllerSampleStoryProps) => (
    <div class="flex flex-col gap-6">
      <FocusControllerSampleGlobalMap globalMap={args.globalMap} />
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
