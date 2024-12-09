import {Meta, StoryObj} from 'storybook-solidjs'
import {Drag} from './Drag'
import {useGlobalTouchEmitter} from 'src/components/real-button/use-global-touch'

const Root = (props: any) => {
  useGlobalTouchEmitter({preventTouchContext: true, topLevelElementOnly: true})
  return (
    <div>
      <Drag {...props} />
      <Drag {...props} />
      <Drag {...props} />
    </div>
  )
}

const meta: Meta<typeof Drag> = {
  component: Root,
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
