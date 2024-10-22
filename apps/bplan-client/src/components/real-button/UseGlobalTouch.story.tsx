import {createEffect, createSignal, createUniqueId} from 'solid-js'
import {Meta, StoryObj} from 'storybook-solidjs'
import {
  ELEMENT_IDENTIFIER_DATA_ATTR,
  useGlobalTouch,
  useGlobalTouchEmitter,
} from './use-global-touch'

const UseGlobalTouch = (props) => {
  const id = createUniqueId()
  const isDown = useGlobalTouch(id)

  const attrs = {...props, [ELEMENT_IDENTIFIER_DATA_ATTR]: id}

  return (
    <button {...attrs} class={`select-none ${props.class}`}>
      touch {isDown() ? 'down' : 'up'}
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
} satisfies Meta<typeof Root>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  //
}
