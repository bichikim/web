import {Meta, StoryObj} from 'storybook-solidjs'
import {HDrag} from './HDrag'
import {HDragBody} from 'src/components/drag/HDragBody'
import {useGlobalTouchEmitter} from 'src/components/real-button/use-global-touch'

const Root = (props: any) => {
  useGlobalTouchEmitter({preventTouchContext: true, topLevelElementOnly: true})

  return (
    <HDragBody as="div" class="relative h-300px w-1000px">
      <HDrag as="div" class="absolute w-100px h-100px bg-red" {...props} />
      {/*<Drag as="div" class="absolute w-100px h-100px bg-yellow" {...props} />*/}
      {/*<Drag as="div" class="absolute w-100px h-100px bg-green" {...props} />*/}
    </HDragBody>
  )
}

const meta: Meta<typeof HDrag> = {
  component: Root,
}

// storybook meta
// noinspection JSUnusedGlobalSymbols
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
