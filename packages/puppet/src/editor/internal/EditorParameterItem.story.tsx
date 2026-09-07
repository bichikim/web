import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {expect, fn, userEvent, within} from 'storybook/test'

import {EditorParameterItem} from './EditorParameterItem'

const meta = {
  args: {
    name: 'Angle X',
    onDelete: fn(),
    onNameChange: fn(),
    onNameEdit: fn(),
    onSelect: fn(),
  },
  argTypes: {
    name: {control: 'text', table: {category: 'Props'}},
    onDelete: {table: {category: 'Events'}, type: {name: 'function', required: false}},
    onNameChange: {table: {category: 'Events'}, type: {name: 'function', required: false}},
    onNameEdit: {table: {category: 'Events'}, type: {name: 'function', required: false}},
    onSelect: {table: {category: 'Events'}, type: {name: 'function', required: false}},
    pressed: {control: 'boolean', table: {category: 'Props'}},
  },
  component: EditorParameterItem,
  decorators: [
    (Story) => (
      <div class="puppet-editor puppet-story-surface puppet-story-narrow">
        <Story />
      </div>
    ),
  ],
  title: 'Puppet/Editor/Parameters/EditorParameterItem',
} satisfies Meta<typeof EditorParameterItem>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Selected: Story = {
  args: {pressed: true},
}

export const RenameByDoubleClick: Story = {
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement)
    await userEvent.dblClick(canvas.getByRole('button', {name: 'Angle X'}))
    await expect(canvas.getByRole('textbox', {name: 'Parameter 이름'})).toHaveValue('Angle X')
  },
}
