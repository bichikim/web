import {SText, STextProps} from './SText'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'

const meta: Meta<STextProps> = {
  args: {
    children: 'Hello',
    class: 'bg-white',
    size: 'md',
  },
  argTypes: {
    size: {
      control: {
        options: ['sm', 'md', 'lg'],
        type: 'select',
      },
    },
  },
  component: SText,
  title: 'Coong/Components/SText',
}

export default meta

type Story = StoryObj<STextProps>

export const Default: Story = {
  args: {
    children: 'Hello',
  },
}

export const Small: Story = {
  args: {
    children: 'Hello',
    size: 'sm',
  },
}

export const Medium: Story = {
  args: {
    children: 'Hello',
    size: 'md',
  },
}

export const Large: Story = {
  args: {
    children: 'Hello',
    size: 'lg',
  },
}

export const ExtraLarge: Story = {
  args: {
    children: 'Hello',
    size: 'xl',
  },
}
