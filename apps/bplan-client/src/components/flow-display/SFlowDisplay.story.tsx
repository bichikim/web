import type {Meta, StoryObj} from 'storybook-solidjs'
import {SFlowDisplay, SFlowDisplayProps} from '.'

const meta = {
  argTypes: {
    move: {
      control: 'boolean',
      defaultValue: false,
      description: '애니메이션 활성화 여부',
    },
    speed: {
      control: 'number',
      defaultValue: 1,
      description: '애니메이션 속도',
    },
  },
  component: SFlowDisplay,
  title: 'BPlan/Components/FlowDisplay',
} satisfies Meta<typeof SFlowDisplay>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: '흐르는 텍스트입니다',
    class: 'text-2xl text-nowrap bg-red-500',
    move: true,
    speed: 2,
  },
  render: (args: SFlowDisplayProps) => {
    return (
      <div class="overflow-hidden bg-red-500 w-20 flex">
        <SFlowDisplay {...args} />
      </div>
    )
  },
}
