import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import tadaJson from './tada.json?url'
import tadaLottie from './tada.lottie'
import {Lottie} from './Lottie'
import {fn} from '@storybook/test'

const meta = {
  argTypes: {
    loop: {
      control: 'boolean',
    },
    play: {
      control: 'select',
      options: [true, 'autoplay', false],
    },
    src: {
      control: 'text',
    },
  },
  component: Lottie,
  title: 'Coong/Components/Lottie',
} satisfies Meta<typeof Lottie>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    loop: true,
    onPlay: fn(),
    play: 'autoplay',
    src: tadaJson,
  },
}

export const WithFile: Story = {
  args: {
    loop: true,
    onPlay: fn(),
    play: 'autoplay',
    src: tadaLottie,
    type: 'file',
  },
}
