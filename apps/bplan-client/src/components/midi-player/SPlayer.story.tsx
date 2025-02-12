import type {Meta, StoryObj} from 'storybook-solidjs'
import {SPlayer} from './SPlayer'

const meta = {
  argTypes: {
    onPause: {action: 'pause clicked'},
    onPlay: {action: 'play clicked'},
    onSeek: {action: 'seek changed'},
    onStop: {action: 'stop clicked'},
  },
  component: SPlayer,
  parameters: {
    backgrounds: {
      default: 'chessboard',
    },
    layout: 'centered',
  },
  title: 'BPlan/Components/MidiPlayer/SPlayer',
} satisfies Meta<typeof SPlayer>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    midiUrl: '/midi/test.mid',
  },
}

export const Playing: Story = {
  args: {
    isPlaying: true,
    midiUrl: '/midi/test.mid',
  },
}

export const WithProgress: Story = {
  args: {
    currentTime: 30,
    duration: 100,
    midiUrl: '/midi/test.mid',
  },
}
