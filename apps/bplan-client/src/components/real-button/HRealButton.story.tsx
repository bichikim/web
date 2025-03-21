import {Meta, StoryObj} from 'storybook-solidjs'
import {HRealButton} from './HRealButton'
import {useGlobalTouchEmitter} from 'src/components/real-button/use-global-touch'

const Root = (props: any) => {
  useGlobalTouchEmitter({preventTouchContext: true, topLevelElementOnly: true})

  return (
    <div>
      <HRealButton {...props} />
      <HRealButton {...props} />
      <HRealButton {...props} />
    </div>
  )
}

const meta = {
  component: Root,
  title: 'BPlan/components/real-button/HRealButton',
} satisfies Meta<typeof HRealButton>

// storybook meta
// noinspection JSUnusedGlobalSymbols
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'hello',
    class: 'w-200px h-200px data data-[state="down"]:bg-red data-[state="up"]:bg-white',
  },
}
