import {HButton} from './'
import {Meta, StoryObj} from 'storybook-solidjs'
import {fn} from '@storybook/test'

const meta = {
  argTypes: {
    doubleClickGap: {
      control: 'number',
      description: 'The gap between clicks to consider a double click',
      table: {
        category: 'Props',
        defaultValue: {summary: '250'},
      },
    },
    onClick: {
      description: 'Click event handler',
      table: {
        category: 'Events',
        defaultValue: {summary: 'undefined'},
      },
    },
    onDoubleClick: {
      description: 'Double click event handler',
      table: {
        category: 'Events',
        defaultValue: {summary: 'undefined'},
      },
    },
  },
  args: {onClick: fn(), onDoubleClick: fn()},
  component: HButton,
  title: 'Solid/components/button',
} satisfies Meta<typeof HButton>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => <HButton {...args}>Click me</HButton>,
}
