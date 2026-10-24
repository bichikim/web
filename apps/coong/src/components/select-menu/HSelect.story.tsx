import {cx} from 'class-variance-authority'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {fn} from 'storybook/test'
import {HSelectContent} from './HSelectContent'
import {HSelectItem} from './HSelectItem'
import {HSelectRoot} from './HSelectRoot'
import {HSelectSeparator} from './HSelectSeparator'
import {HSelectTrigger} from './HSelectTrigger'
import {SSelectItem} from './SSelectItem'
import {SSelectList} from './SSelectList'
import {SSelectTrigger} from './SSelectTrigger'

const headlessItemClass = cx(
  ':uno: flex w-full cursor-pointer items-center rounded-2 border-0 bg-transparent px-3 py-2.5 text-left',
  'text-3.5 font-600 text-#101114 hover:bg-black/5 data-focused:bg-black/8',
)

const Template = () => {
  return (
    <HSelectRoot>
      <div class=":uno: min-h-80 p-8">
        <HSelectTrigger
          class={`:uno: flex h-9 items-center gap-2 rounded-full border border-black/12
            px-4 text-3.5 font-600`}
        >
          Headless menu
        </HSelectTrigger>
        <HSelectContent class=":uno: fixed m-0 w-56 rounded-3 bg-white p-1 shadow-lg ring-1 ring-black/8">
          <HSelectItem class={headlessItemClass} onSelect={fn()}>
            Profile
          </HSelectItem>
          <HSelectItem class={headlessItemClass} onSelect={fn()}>
            Settings
          </HSelectItem>
          <HSelectSeparator class=":uno: my-1 h-px bg-black/8" />
          <HSelectItem class={headlessItemClass} onSelect={fn()}>
            Sign out
          </HSelectItem>
        </HSelectContent>
      </div>
    </HSelectRoot>
  )
}

const meta = {
  component: Template,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Coong/Components/SelectMenu/HSelect',
} satisfies Meta<typeof Template>

export default meta
type Story = StoryObj<typeof meta>

export const Headless: Story = {}

export const StyledCompound: Story = {
  render: () => (
    <HSelectRoot>
      <div class=":uno: min-h-80 p-8">
        <SSelectTrigger>Open styled menu</SSelectTrigger>
        <SSelectList>
          <SSelectItem onSelect={fn()}>First option</SSelectItem>
          <SSelectItem onSelect={fn()}>Second option</SSelectItem>
        </SSelectList>
      </div>
    </HSelectRoot>
  ),
}

export const CustomTrigger: Story = {
  render: () => (
    <HSelectRoot>
      <div class=":uno: min-h-80 p-8">
        <HSelectTrigger class=":uno: rounded-full bg-#101114 px-4 py-2 text-3.5 font-600 text-white">
          Open custom trigger
        </HSelectTrigger>
        <SSelectList>
          <SSelectItem onSelect={fn()}>Custom trigger item</SSelectItem>
        </SSelectList>
      </div>
    </HSelectRoot>
  ),
}
