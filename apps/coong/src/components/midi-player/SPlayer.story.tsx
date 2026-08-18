import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {MidiPlayerProvider, type MidiPlayerProviderProps} from './context'
import {SPlayer} from './SPlayer'

const SPlayerStory = (props: MidiPlayerProviderProps) => (
  <MidiPlayerProvider {...props}>
    <SPlayer />
  </MidiPlayerProvider>
)

const meta = {
  component: SPlayerStory,
  parameters: {
    backgrounds: {
      default: 'chessboard',
    },
    layout: 'centered',
  },
  title: 'Coong/Components/MidiPlayer/SPlayer',
} satisfies Meta<typeof SPlayerStory>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithPlaylist: Story = {
  args: {
    initMusics: [
      {
        ext: 'midi',
        id: 'storybook-track',
        name: 'Storybook Track',
        totalDuration: 100,
      },
    ],
  },
}

export const Playing: Story = {
  args: {
    initMusics: [
      {
        ext: 'midi',
        id: 'storybook-track',
        name: 'Storybook Track',
        totalDuration: 100,
      },
    ],
    playState: {
      leftTime: 70,
      loaded: true,
      playedTime: 30,
      playingId: 'storybook-track',
      startedAt: 0,
      suspended: false,
      totalDuration: 100,
    },
  },
}
