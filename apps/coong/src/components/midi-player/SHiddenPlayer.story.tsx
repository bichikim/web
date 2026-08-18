import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {splitProps} from 'solid-js'
import {MidiPlayerProvider, type MidiPlayerProviderProps} from './context'
import {SHiddenPlayer, type SHiddenPlayerProps} from './SHiddenPlayer'
import midiData from './hidden-teenieping.json'

type SHiddenPlayerStoryProps = SHiddenPlayerProps & Pick<MidiPlayerProviderProps, 'initMusics'>

const SHiddenPlayerStory = (props: SHiddenPlayerStoryProps) => {
  const [providerProps, playerProps] = splitProps(props, ['initMusics'])

  return (
    <MidiPlayerProvider initMusics={providerProps.initMusics}>
      <SHiddenPlayer {...playerProps} />
    </MidiPlayerProvider>
  )
}

const meta = {
  args: {
    class: 'absolute bottom-1 right-1 max-w-100vw',
  },
  component: SHiddenPlayerStory,
  parameters: {
    layout: 'centered',
  },
  title: 'Coong/Components/MidiPlayer/SHiddenPlayer',
} satisfies Meta<typeof SHiddenPlayerStory>

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
        totalDuration: 120,
      },
      {
        id: '2',
        name: 'Sample MIDI 2',
        totalDuration: 120,
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
        totalDuration: 150,
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
