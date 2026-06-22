import {cx} from 'class-variance-authority'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {fn} from 'storybook/test'
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

export const Open: Story = {
  render: () => {
    const listId = 'select-list-open-story'
    const [left] = createSignal(24)
    const [top] = createSignal(24)

    onMount(() => {
      document.getElementById(`${listId}-trigger`)?.click()
    })

    return (
      <div class=":uno: min-h-80 p-6">
        <button
          id={`${listId}-trigger`}
          type="button"
          class=":uno: sr-only"
          popovertarget={listId}
          aria-hidden="true"
        />
        <SSelectList id={listId} left={left} top={top} onToggle={fn()}>
          <button type="button" class={menuItemClass}>
            First option
          </button>
          <button type="button" class={menuItemClass}>
            Second option
          </button>
        </SSelectList>
      </div>
    )
  },
}

export const WithCustomWidth: Story = {
  render: () => {
    const listId = 'select-list-custom-width-story'
    const [left] = createSignal(24)
    const [top] = createSignal(24)

    onMount(() => {
      document.getElementById(`${listId}-trigger`)?.click()
    })

    return (
      <div class=":uno: min-h-80 p-6">
        <button
          id={`${listId}-trigger`}
          type="button"
          class=":uno: sr-only"
          popovertarget={listId}
          aria-hidden="true"
        />
        <SSelectList id={listId} class=":uno: w-72" left={left} top={top} onToggle={fn()}>
          <button type="button" class={menuItemClass}>
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
    <HSelectRoot listWidthPx={288}>
      <div class=":uno: min-h-80 p-8">
        <SSelectTrigger>Open wide menu</SSelectTrigger>
        <SSelectList class=":uno: w-72">
          <SSelectItem onSelect={fn()}>Wider panel</SSelectItem>
        </SSelectList>
      </div>
    </HSelectRoot>
  ),
}

export const LegacyController: Story = {
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
          <SSelectItem onSelect={menu.onHide}>Close menu</SSelectItem>
        </SSelectList>
      </div>
    )
  },
}
