import {expect, userEvent, within} from 'storybook/test'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'

import dayReadingImage from '../../assets/concept-art/focus-room-day-reading-concept.webp'
import '../design-system/focus-room-tokens.css'
import FocusRoomMusicPlayerClient from './FocusRoomMusicPlayer.client'

const meta = {
  args: {
    tracks: [],
  },
  component: FocusRoomMusicPlayerClient,
  decorators: [
    (Story) => (
      <main
        class="relative h-screen min-h-150 overflow-hidden bg-cover bg-[position:60%_center]"
        style={{'background-image': `url(${dayReadingImage})`}}
      >
        <Story />
      </main>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  title: 'Pomo/Components/Focus Room/Music Player',
} satisfies Meta<typeof FocusRoomMusicPlayerClient>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}

export const Expanded: Story = {
  args: {
    tracks: [
      {
        artist: 'Pomo Sounds',
        durationSeconds: 180,
        id: 'warm-window',
        source: '',
        title: 'Warm Window',
      },
      {
        artist: 'Pomo Sounds',
        durationSeconds: 180,
        id: 'quiet-pages',
        source: '',
        title: 'Quiet Pages',
      },
      {
        artist: 'Pomo Sounds',
        durationSeconds: 180,
        id: 'night-lamp',
        source: '',
        title: 'Night Lamp',
      },
    ],
  },
  play: async ({canvasElement}: {canvasElement: HTMLElement}) => {
    const canvas = within(canvasElement)
    const expandButton = canvas.getByRole('button', {name: '플레이어 펼치기'})
    await userEvent.click(expandButton)
    await expect(canvas.getByRole('button', {name: '플레이어 접기'})).toBeVisible()
    await expect(canvas.getByRole('button', {name: /Quiet Pages/u})).toBeVisible()
  },
}
