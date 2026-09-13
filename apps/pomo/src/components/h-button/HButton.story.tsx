import {fn} from 'storybook/test'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {HButton} from '.'

const meta = {
  args: {onClick: fn()},
  argTypes: {onClick: {table: {category: 'Events'}}},
  component: HButton.Root,
  title: 'Pomo/Components/HButton',
} satisfies Meta<typeof HButton.Root>

export default meta
type Story = StoryObj<typeof meta>

export const Composition: Story = {
  render: (args) => (
    <HButton.Root {...args}>
      <HButton.Icon class="i-tabler-check" />
      <HButton.Content>확인</HButton.Content>
    </HButton.Root>
  ),
}
