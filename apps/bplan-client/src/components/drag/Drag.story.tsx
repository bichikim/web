import {Meta, StoryObj} from 'storybook-solidjs'
import {Drag} from './Drag'
import {DragBody} from './DragBody'
import {useGlobalTouchEmitter} from 'src/components/real-button/use-global-touch'

const Root = (props: any) => {
  useGlobalTouchEmitter({preventTouchContext: true, topLevelElementOnly: true})

  return (
    <DragBody as="div" class="relative h-300px w-1000px">
      <Drag as="div" class="absolute w-100px h-100px bg-red" {...props} />
      {/*<Drag as="div" class="absolue w-100px h-100px bg-yellow" {...props} />*/}
      {/*<Drag as="div" class="absolue w-100px h-100px bg-green" {...props} />*/}
    </DragBody>
  )
}

const meta: Meta<typeof Drag> = {
  component: Root,
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
