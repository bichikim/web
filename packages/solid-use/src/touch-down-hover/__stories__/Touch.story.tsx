import {Meta, StoryObj} from 'storybook-solidjs'
import {createSignal} from 'solid-js'
import {useTouchDownHover} from '../'
import {ref} from 'src/use/ref'

const Floating = () => {
  const [element1, setElement1] = createSignal<HTMLElement | null>(null)
  const [element2, setElement2] = createSignal<HTMLElement | null>(null)

  const element1Down = useTouchDownHover(element1)
  const element2Down = useTouchDownHover(element2)

  return (
    <div class="flex flex-row gap-50px">
      <div data-touch-down-hover="" class="h-200px w-200px bg-green" use:ref={setElement1}>
        Floating1 {element1Down() ? 'down' : 'up'}
      </div>
      <div class="h-200px w-200px bg-red"></div>
      <div data-touch-down-hover="" class="h-200px w-200px bg-green" use:ref={setElement2}>
        Floating2 {element2Down() ? 'down' : 'up'}
      </div>
    </div>
  )
}

const meta = {
  component: Floating,
} satisfies Meta<typeof Floating>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  //
}
