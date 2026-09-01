import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {expect, fn, userEvent, within} from 'storybook/test'

import '../story.css'
import {EditorParameterItem} from './EditorParameterItem'

const meta = {
  args: {
    keyformCount: 3,
    maximum: 30,
    minimum: -30,
    name: 'Angle X',
    onDelete: fn(),
    onNameChange: fn(),
    onNameEdit: fn(),
    onSelect: fn(),
    value: 0,
  },
  argTypes: {
    keyformCount: {control: {min: 0, type: 'number'}, table: {category: 'Props'}},
    maximum: {control: 'number', table: {category: 'Props'}},
    minimum: {control: 'number', table: {category: 'Props'}},
    name: {control: 'text', table: {category: 'Props'}},
    onDelete: {table: {category: 'Events'}, type: {name: 'function', required: false}},
    onNameChange: {table: {category: 'Events'}, type: {name: 'function', required: false}},
    onNameEdit: {table: {category: 'Events'}, type: {name: 'function', required: false}},
    onSelect: {table: {category: 'Events'}, type: {name: 'function', required: false}},
    pressed: {control: 'boolean', table: {category: 'Props'}},
    value: {control: 'number', table: {category: 'Props'}},
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
