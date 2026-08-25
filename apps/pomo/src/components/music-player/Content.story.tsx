import {expect, userEvent, waitFor, within} from 'storybook/test'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'

import dayReadingImage from '../../features/focus-room-animation/assets/concept-art/day-reading.webp'
import * as m from '@paraglide/message'
import PMusicPlayerContent from './Content'

const meta = {
  args: {
    tracks: [],
  },
  component: PMusicPlayerContent,
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
} satisfies Meta<typeof PMusicPlayerContent>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}

export const Expanded: Story = {
  args: {
    tracks: [
      {
        artist: 'Pomo Sounds',
        artworkUrl: '/audio/artwork/breeze-between-pages.jpg',
        durationSeconds: 180,
        id: 'warm-window',
        source: '',
        title: 'Warm Window',
      },
      {
        artist: 'Pomo Sounds',
        artworkUrl: '/audio/artwork/sunlit-desk-notes.jpg',
        durationSeconds: 180,
        id: 'quiet-pages',
        source: '',
        title: 'Quiet Pages',
      },
      {
        artist: 'Pomo Sounds',
        artworkUrl: '/audio/artwork/sunday-bookstore-glow.jpg',
        durationSeconds: 180,
        id: 'night-lamp',
        source: '',
        title: 'Night Lamp',
      },
    ],
  },
  play: async ({canvasElement}: {canvasElement: HTMLElement}) => {
    const canvas = within(canvasElement)
    const expandButton = canvas.getByRole('button', {name: m.player_expand()})
    await userEvent.click(expandButton)
    await waitFor(() =>
      expect(canvas.getByRole('button', {name: m.player_collapse()})).toBeVisible(),
    )
    await waitFor(() => expect(canvas.getByRole('button', {name: /Quiet Pages/u})).toBeEnabled())
  },
}
