import {createSignal, Show} from 'solid-js'
import {Meta, StoryObj} from 'storybook-solidjs-vite'
import {useEvent} from './'
import {expect, userEvent, within} from '@storybook/test'

interface EventProps {
  show?: boolean
}

const Event = (props: EventProps) => {
  const [count, setCount] = createSignal(0)
  const [element, setElement] = createSignal<HTMLButtonElement | null>(null)

  useEvent(element, 'click', () => {
    setCount((count) => count + 1)
  })

  return (
    <Show when={props.show}>
      <button aria-label="count button" ref={setElement}>
        count {count()}
      </button>
    </Show>
  )
}

const meta: Meta = {
  args: {
    show: true,
  },
  component: Event,
  title: 'Solid/Use/useEvent',
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  //
  play: async ({canvasElement, args}) => {
    if (!args.show) {
      return
    }

    const canvas = within(canvasElement)
    const button = canvas.getByLabelText('count button')

    await userEvent.click(button)
    await expect(button.textContent).toBe('count 1')
  },
}
