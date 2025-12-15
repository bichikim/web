import {createSignal} from 'solid-js'
import {ElementRef} from './ElementRef'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'

const meta = {
  component: ElementRef,
  title: 'Solid/Components/ElementRef',
} satisfies Meta<typeof ElementRef>

export default meta
type Story = StoryObj<typeof ElementRef>

export const Default: Story = {
  render: () => {
    const [show, setShow] = createSignal(true)
    const [element, setElement] = createSignal<HTMLElement | null>(null)

    return (
      <div>
        <button onClick={() => setShow((prev) => !prev)}>Toggle</button>
        {show() && (
          <ElementRef component="div" ref={setElement}>
            Element Reference Component
          </ElementRef>
        )}
        <div>Does element exist?: {element() ? 'Yes' : 'No'}</div>
      </div>
    )
  },
}

export const DirectDomExample: Story = {
  render: () => {
    const [show, setShow] = createSignal(true)
    const [elementDirect, setElementDirect] = createSignal<HTMLElement | null>(null)

    return (
      <div>
        <button onClick={() => setShow((prev) => !prev)}>Toggle</button>
        {show() && <div ref={setElementDirect}>Element using direct ref</div>}
        <div>Direct ref exists?: {elementDirect() ? 'Yes' : 'No'}</div>
      </div>
    )
  },
}
