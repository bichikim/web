import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import tadaJson from './tada.json?url'
import tadaLottie from './tada.lottie?url'
import {LottieFile} from './LottieFile'
import {fn} from 'storybook/test'

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
  component: LottieFile,
  title: 'Coong/Components/LottieFile',
} satisfies Meta<typeof LottieFile>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    loop: true,
    onPlay: fn(),
    play: 'autoplay',
    src: tadaLottie,
  },
}

export const WithJson: Story = {
  args: {
    loop: true,
    onPlay: fn(),
    play: 'autoplay',
    src: tadaJson,
  },
}
