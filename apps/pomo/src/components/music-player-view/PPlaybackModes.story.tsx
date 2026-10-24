import {fn} from 'storybook/test'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {PPlaybackModes} from './PPlaybackModes'

const meta = {
  args: {
    onRepeatModeChange: fn(),
    onShuffleChange: fn(),
    repeatMode: 'repeat-all',
    shuffleEnabled: true,
  },
  argTypes: {
    onRepeatModeChange: {table: {category: 'Events'}},
    onShuffleChange: {table: {category: 'Events'}},
    repeatMode: {control: 'select', options: ['none', 'repeat-all', 'repeat-one']},
    shuffleEnabled: {control: 'boolean'},
  },
  component: PPlaybackModes,
  title: 'Pomo/Components/MusicPlayer/PPlaybackModes',
} satisfies Meta<typeof PPlaybackModes>

export default meta
type Story = StoryObj<typeof meta>

export const RepeatAll: Story = {}

export const RepeatOne: Story = {
  args: {repeatMode: 'repeat-one'},
}
