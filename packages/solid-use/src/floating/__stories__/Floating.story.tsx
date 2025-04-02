import {autoUpdate, flip} from '@floating-ui/dom'
import {createMemo, createSignal, Show} from 'solid-js'
import {StoryObj} from 'storybook-solidjs'
import {useFloating} from '../'
// eslint-disable-next-line  @typescript-eslint/no-unused-vars
import {ref} from 'src/ref'

const Floating = () => {
  const [reference, setReference] = createSignal<HTMLElement | null>(null)
  const [floatingElement, setFloatingElement] = createSignal<HTMLElement | null>(null)

  const floating = useFloating(reference, floatingElement, {
    autoUpdate,
    middleware: [flip()],
  })

  const style = createMemo(() => {
    const {x, y} = floating()

    return {
      left: `${x}px`,
      top: `${y}px`,
    }
  })
  const [show, setShow] = createSignal(true)

  return (
    <>
      <button onClick={() => setShow((show) => !show)}>toggle show</button>
      <div class="h-300px w-200px overflow-auto relative">
        <div class="h-600px w-500px bg-yellow relative">
          <div
            use:ref={setReference}
            class="w-100px h-50px bg-blue absolute left-100px top-300px"
          >
            reference
          </div>
          <Show when={show()}>
            <div
              use:ref={setFloatingElement}
              class="w-50px h-50px bg-red absolute"
              style={style()}
            >
              floating
            </div>
          </Show>
        </div>
      </div>
    </>
  )
}

const meta = {
  component: Floating,
  title: 'solid/use/floating',
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
