import {Meta, StoryObj} from 'storybook-solidjs'
import {createSignal} from 'solid-js'
import {useTouch} from '../'
import {ref} from 'src/use/ref'

const Floating = () => {
  const [element, setElement] = createSignal<HTMLElement | null>(null)

  useTouch(element)

  return (
    <div class="h-200px w-200px bg-green" use:ref={setElement}>
      Floating
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
