import type {Meta, StoryObj} from 'storybook-solidjs'
import {SHiddenPlayer} from './SHiddenPlayer'
import midiData from './hidden-teenieping.json'

const meta = {
  args: {
    class: 'absolute bottom-1 right-1 max-w-100vw',
  },
  component: SHiddenPlayer,
  parameters: {
    layout: 'centered',
  },
  title: 'BPlan/Components/MidiPlayer/SHiddenPlayer',
} satisfies Meta<typeof SHiddenPlayer>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    initMusics: midiData,
    initShow: true,
    playState: {
      leftTime: 0,
      loaded: false,
      playedTime: 0,
      playingId: '',
      startedAt: 0,
      suspended: false,
      totalDuration: 0,
    },
  },
}

export const WithInitialMusics: Story = {
  args: {
    initMusics: [
      {
        id: '1',
        name: 'Sample MIDI 1',
        url: '/sample1.mid',
      },
      {
        id: '2',
        name: 'Sample MIDI 2',
        url: '/sample2.mid',
      },
    ],
    playState: {
      leftTime: 0,
      loaded: false,
      playedTime: 0,
      playingId: '',
      startedAt: 0,
      suspended: false,
      totalDuration: 0,
    },
  },
}

export const Playing: Story = {
  args: {
    initMusics: [
      {
        id: '1',
        name: 'Now Playing',
        url: '/sample.mid',
      },
    ],
    playState: {
      leftTime: 120,
      loaded: true,
      playedTime: 30,
      playingId: '1',
      startedAt: Date.now(),
      suspended: false,
      totalDuration: 150,
    },
  },
}
