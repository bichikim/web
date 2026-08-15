import {createSignal, untrack} from 'solid-js'
import {expect, fn, userEvent, waitFor, within} from 'storybook/test'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'

import {PModal} from './PModal'

interface ModalPlayContext {
  readonly canvasElement: HTMLElement
}

const meta = {
  args: {
    children: <p class="m-0 text-sm leading-6">모달의 주요 콘텐츠가 들어가는 영역입니다.</p>,
    description: '필요한 설정을 변경할 수 있어요.',
    isOpen: false,
    onCloseAutoFocus: fn(),
    onOpenChange: fn(),
    title: '설정',
  },
  argTypes: {
    description: {control: 'text', table: {category: 'Props'}},
    isOpen: {control: 'boolean', table: {category: 'Props'}},
    onCloseAutoFocus: {table: {category: 'Events'}, type: {name: 'function'}},
    onOpenChange: {table: {category: 'Events'}, type: {name: 'function'}},
    title: {control: 'text', table: {category: 'Props'}},
  },
  component: PModal,
  parameters: {
    backgrounds: {default: 'black'},
    layout: 'fullscreen',
  },
  render: (props) => {
    const initialOpen = untrack(() => props.isOpen)
    const [isOpen, setIsOpen] = createSignal(initialOpen)
    const [triggerElement, setTriggerElement] = createSignal<HTMLButtonElement | null>(null)
    const handleOpenChange = (nextOpen: boolean) => {
      setIsOpen(nextOpen)
      props.onOpenChange(nextOpen)
    }
    const handleCloseAutoFocus = () => {
      triggerElement()?.focus()
      props.onCloseAutoFocus?.()
    }

    return (
      <main class="grid min-h-screen place-items-center bg-[var(--pomo-canvas)] p-6">
        <button
          class="rounded-full bg-[var(--pomo-accent)] px-5 py-3 text-sm font-700 text-white"
          onClick={(event) => {
            setTriggerElement(event.currentTarget)
            setIsOpen(true)
          }}
          type="button"
        >
          모달 열기
        </button>
        <PModal
          description={props.description}
          isOpen={isOpen()}
          onCloseAutoFocus={handleCloseAutoFocus}
          onOpenChange={handleOpenChange}
          title={props.title}
        >
          {props.children}
        </PModal>
      </main>
    )
  },
  title: 'Pomo/Design System/PModal',
} satisfies Meta<typeof PModal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({canvasElement}: ModalPlayContext) => {
    const page = within(canvasElement.ownerDocument.body)
    await userEvent.click(page.getByRole('button', {name: '모달 열기'}))
    const dialog = page.getByRole('dialog', {name: '설정'})

    await waitFor(() => expect(dialog).toBeVisible())
    await userEvent.click(page.getByRole('button', {name: '닫기'}))
    await waitFor(() => expect(page.queryByRole('dialog', {name: '설정'})).not.toBeInTheDocument())
    await waitFor(() => expect(page.getByRole('button', {name: '모달 열기'})).toHaveFocus())
  },
}

export const Open: Story = {
  args: {isOpen: true},
}
