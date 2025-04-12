import {createUniqueId, JSX} from 'solid-js'
import {Meta, StoryObj} from 'storybook-solidjs'
import {
  ELEMENT_IDENTIFIER_GLOBAL_TOUCH,
  useGlobalDown,
  useGlobalTouchEmitter,
} from './use-global-touch'

export interface UseGlobalTouchProps extends JSX.HTMLAttributes<HTMLButtonElement> {}

const UseGlobalTouch = (props: UseGlobalTouchProps) => {
  const id = createUniqueId()
  const isDown = useGlobalDown(id)
  const attrs = {...props, [ELEMENT_IDENTIFIER_GLOBAL_TOUCH]: id}

  return (
    <button {...attrs} class={`select-none ${props.class}`}>
      touch {isDown().down ? 'down' : 'up'}
    </button>
  )
}

const Root = () => {
  useGlobalTouchEmitter({preventTouchContext: true, topLevelElementOnly: true})

  return (
    <div class="relative">
      <UseGlobalTouch class="w-50px h-100px bg-red" />
      <UseGlobalTouch class="w-50px h-100px bg-red" />
      <UseGlobalTouch class="absolute left-25px w-50px h-50px bg-red" />
    </div>
  )
}

const meta = {
  component: Root,
  title: 'BPlan/components/real-button/UseGlobalTouch',
} satisfies Meta<typeof Root>

// storybook meta
// noinspection JSUnusedGlobalSymbols
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  //
}
