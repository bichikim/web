import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {expect, fireEvent, fn, within} from 'storybook/test'

import '../story.css'
import {EditorContextMenu, type EditorContextMenuEntry} from './EditorContextMenu'

const ENTRIES: ReadonlyArray<EditorContextMenuEntry> = [
  {id: 'rename', label: '이름 변경', onSelect: fn(), shortcut: 'Enter', type: 'action'},
  {id: 'duplicate', label: '복제', onSelect: fn(), shortcut: '⌘D', type: 'action'},
  {id: 'divider', type: 'separator'},
  {id: 'delete', label: '삭제', onSelect: fn(), shortcut: '⌫', tone: 'danger', type: 'action'},
]

const meta = {
  args: {
    children: <div class="puppet-context-menu-demo">오른쪽 클릭하여 작업 메뉴 열기</div>,
    entries: ENTRIES,
    label: '레이어 작업',
    onOpenChange: fn(),
  },
  argTypes: {
    children: {control: false, table: {category: 'Props'}},
    disabled: {control: 'boolean', table: {category: 'Props'}},
    entries: {control: false, table: {category: 'Props'}},
    label: {control: 'text', table: {category: 'Props'}},
    onOpenChange: {table: {category: 'Events'}, type: {name: 'function', required: false}},
  },
  component: EditorContextMenu,
  decorators: [
    (Story) => (
      <div class="puppet-editor puppet-story-surface puppet-story-narrow">
        <Story />
      </div>
    ),
  ],
  title: 'Puppet/Editor/Controls/EditorContextMenu',
} satisfies Meta<typeof EditorContextMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Opened: Story = {
  play: async ({canvasElement}) => {
    const page = within(canvasElement.ownerDocument.body)
    fireEvent.contextMenu(page.getByText('오른쪽 클릭하여 작업 메뉴 열기'))
    await expect(page.findByRole('menu', {name: '레이어 작업'})).resolves.toBeVisible()
  },
}
