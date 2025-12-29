import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {SCard, SCardProps} from './SCard'
import {SButton} from '../button/SButton'

const meta: Meta<SCardProps> = {
  argTypes: {
    glass: {
      control: 'boolean',
      description: 'Whether the card is glass or not',
      table: {
        category: 'Props',
      },
    },
  },
  args: {
    children: 'Card',
    glass: true,
  },
  component: SCard,
  title: 'Coong/Components/SCard',
}

export default meta

type Story = StoryObj<SCardProps>

export const Default: Story = {
  args: {
    children: (
      <div class=":uno: flex flex-col gap-2">
        <div class=":uno: font-600">Title</div>
        <div class=":uno: text-sm c-gray-600">This is a reusable card container.</div>
        <SButton color="primary">Click me</SButton>
      </div>
    ),
  },
}

export const WithoutGlass: Story = {
  args: {
    children: (
      <div class=":uno: flex flex-col gap-2">
        <div class=":uno: font-600">Title</div>
        <div class=":uno: text-sm c-gray-600">This is a reusable card container.</div>
        <SButton color="primary">Click me</SButton>
      </div>
    ),
    glass: false,
  },
}

export const WithSize: Story = {
  args: {
    children: (
      <div class=":uno: flex flex-col gap-2">
        <div class=":uno: font-600">Title</div>
        <div class=":uno: text-sm c-gray-600">This is a reusable card container.</div>
        <SButton color="primary">Click me</SButton>
      </div>
    ),
    size: 'lg',
  },
}
