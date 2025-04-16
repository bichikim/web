import {Meta, StoryObj} from 'storybook-solidjs'
import {SLunchKey} from './SLunchKey'
import {useGlobalTouchEmitter} from 'src/components/real-button/use-global-touch'

const Root = (props: any) => {
  useGlobalTouchEmitter({preventTouchContext: true, topLevelElementOnly: true})

  return (
    <div class="flex gap-20px">
      <SLunchKey {...props} key="1" />
      <SLunchKey {...props} key="2" />
      <SLunchKey {...props} key="3" />
    </div>
  )
}

const meta = {
  component: Root,
  title: 'BPlan/components/instruments/SLunchKey',
} satisfies Meta<typeof SLunchKey>

// storybook meta
// noinspection JSUnusedGlobalSymbols
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    class: 'w-200px h-200px',
  },
}
