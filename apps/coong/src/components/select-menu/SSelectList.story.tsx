import {cx} from 'class-variance-authority'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {expect, fn, userEvent, within} from 'storybook/test'
import {createSignal, onMount} from 'solid-js'
import {HSelectRoot} from './HSelectRoot'
import {SSelectButton} from './SSelectButton'
import {SSelectItem} from './SSelectItem'
import {SSelectList} from './SSelectList'
import {SSelectTrigger} from './SSelectTrigger'
import {useSelectMenu} from './use-select-menu'

const menuItemClass = cx(
  ':uno: flex w-full cursor-pointer items-center rounded-2 border-0 bg-transparent px-3 py-2.5 text-left',
  'text-3.5 font-600 text-#101114 hover:bg-black/5',
)

const meta = {
  component: SSelectList,
  tags: ['autodocs'],
  title: 'Coong/Components/SelectMenu/SSelectList',
} satisfies Meta<typeof SSelectList>

export default meta
type Story = StoryObj<typeof meta>

interface SelectListPlayContext {
  readonly canvasElement: HTMLElement
}

export const Open: Story = {
  play: async ({canvasElement}: SelectListPlayContext) => {
    const menu = await within(canvasElement).findByRole('menu')

    expect(menu).toBeVisible()
    expect(menu.matches(':popover-open')).toBe(true)
  },
  render: () => {
    const menu = useSelectMenu()
    const [left] = createSignal(24)
    const [top] = createSignal(24)

    onMount(() => {
      document.getElementById(`${menu.listId}-trigger`)?.click()
    })

    return (
      <div class=":uno: min-h-80 p-6">
        <button
          id={`${menu.listId}-trigger`}
          type="button"
          class=":uno: sr-only"
          aria-hidden="true"
          onClick={menu.handleTriggerClick}
        />
        <SSelectList controller={menu} id={menu.listId} left={left} top={top} onToggle={fn()}>
          <button type="button" role="menuitem" class={menuItemClass}>
            First option
          </button>
          <button type="button" role="menuitem" class={menuItemClass}>
            Second option
          </button>
        </SSelectList>
      </div>
    )
  },
}

export const WithCustomWidth: Story = {
  play: async ({canvasElement}: SelectListPlayContext) => {
    const menu = await within(canvasElement).findByRole('menu')

    expect(menu).toBeVisible()
    expect(getComputedStyle(menu).width).toBe('288px')
  },
  render: () => {
    const menu = useSelectMenu()
    const [left] = createSignal(24)
    const [top] = createSignal(24)

    onMount(() => {
      document.getElementById(`${menu.listId}-trigger`)?.click()
    })

    return (
      <div class=":uno: min-h-80 p-6">
        <button
          id={`${menu.listId}-trigger`}
          type="button"
          class=":uno: sr-only"
          aria-hidden="true"
          onClick={menu.handleTriggerClick}
        />
        <SSelectList controller={menu} id={menu.listId} left={left} top={top} widthPx={288}>
          <button type="button" role="menuitem" class={menuItemClass}>
            Wider panel
          </button>
        </SSelectList>
      </div>
    )
  },
}

export const PairedWithTrigger: Story = {
  render: () => (
    <HSelectRoot>
      <div class=":uno: min-h-80 p-8">
        <SSelectTrigger>Open menu</SSelectTrigger>
        <SSelectList>
          <SSelectItem onSelect={fn()}>Action one</SSelectItem>
          <SSelectItem onSelect={fn()}>Action two</SSelectItem>
        </SSelectList>
      </div>
    </HSelectRoot>
  ),
}

export const PairedWithCustomWidth: Story = {
  render: () => (
    <HSelectRoot>
      <div class=":uno: min-h-80 p-8">
        <SSelectTrigger>Open wide menu</SSelectTrigger>
        <SSelectList widthPx={288}>
          <SSelectItem onSelect={fn()}>Wider panel</SSelectItem>
        </SSelectList>
      </div>
    </HSelectRoot>
  ),
}

export const LegacyController: Story = {
  play: async ({canvasElement}: SelectListPlayContext) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', {name: 'Legacy wiring'}))

    const menu = await canvas.findByRole('menu')

    expect(menu).toBeVisible()

    await userEvent.click(canvas.getByRole('menuitem', {name: 'Close menu'}))
    expect(menu).not.toBeVisible()
  },
  render: () => {
    const menu = useSelectMenu()

    return (
      <div class=":uno: min-h-80 p-8">
        <SSelectButton
          aria-controls={menu.listId}
          aria-expanded={menu.isOpen()}
          aria-haspopup="menu"
          onClick={menu.handleTriggerClick}
        >
          Legacy wiring
        </SSelectButton>
        <SSelectList controller={menu} id={menu.listId}>
          <button type="button" role="menuitem" class={menuItemClass} onClick={menu.onHide}>
            Close menu
          </button>
        </SSelectList>
      </div>
    )
  },
}
