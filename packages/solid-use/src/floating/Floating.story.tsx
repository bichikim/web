import {autoUpdate, flip, shift} from '@floating-ui/dom'
import {createMemo, createSignal, Show} from 'solid-js'
import {StoryObj} from 'storybook-solidjs-vite'
import {useFloating} from '../'

const Floating = () => {
  const [reference, setReference] = createSignal<HTMLElement | null>(null)
  const [floatingElement, setFloatingElement] = createSignal<HTMLElement | null>(null)

  const floating = useFloating(reference, floatingElement, {
    autoUpdate,
    middleware: [
      flip(),
      shift({
        crossAxis: true,
      }),
    ],
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
      <button
        class="mb-4 c-white p-2 rd-4 bg-blue-500 text-sm font-medium shadow"
        onClick={() => setShow((show) => !show)}
      >
        toggle show
      </button>
      <div class="h-400px w-200px overflow-auto relative bg-gray-100 border-2 border-dashed border-gray-300">
        <div class="h-1200px w-500px bg-transparent relative">
          <div ref={setReference} class="w-100px h-50px bg-blue absolute left-200px top-500px c-white p-2 rd-4">
            reference
          </div>
          <Show when={show()}>
            <div
              ref={setFloatingElement}
              class="w-70px h-50px bg-red absolute rd-4 c-white p-2 shadow-md"
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
  title: 'Solid/Use/useFloating',
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
