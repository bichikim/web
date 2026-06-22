import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {fn} from 'storybook/test'
import {SSelectButton, type SSelectButtonProps} from './SSelectButton'

const meta = {
  args: {
    children: 'user@example.com',
    onClick: fn(),
  },
  argTypes: {
    children: {
      table: {category: 'Props'},
    },
    onClick: {
      table: {category: 'Events'},
      type: {name: 'function', required: true},
    },
    onMouseEnter: {
      table: {category: 'Events'},
      type: {name: 'function', required: false},
    },
  },
  component: SSelectButton,
  tags: ['autodocs'],
  title: 'Coong/Components/SelectMenu/SSelectButton',
} satisfies Meta<typeof SSelectButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithChevron: Story = {
  render: (args: SSelectButtonProps) => (
    <SSelectButton {...args}>
      {args.children}
      <span class=":uno: h-4 w-4 i-tabler:chevron-down" aria-hidden="true" />
    </SSelectButton>
  ),
}
