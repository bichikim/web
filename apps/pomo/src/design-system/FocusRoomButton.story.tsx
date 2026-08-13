import {expect, fn, userEvent, within} from 'storybook/test'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'

import './focus-room-tokens.css'
import {FocusRoomButton} from './FocusRoomButton'

interface ButtonPlayContext {
  readonly canvasElement: HTMLElement
}

const meta = {
  args: {
    children: '집중 시작',
    disabled: false,
    icon: 'i-tabler-player-play',
    onPress: fn(),
    size: 'medium',
    tone: 'primary',
  },
  argTypes: {
    disabled: {control: 'boolean', table: {category: 'Props'}},
    icon: {control: 'text', table: {category: 'Props'}},
    onPress: {table: {category: 'Events'}, type: {name: 'function'}},
    size: {
      control: 'select',
      options: ['small', 'medium'],
      table: {category: 'Props'},
    },
    tone: {
      control: 'select',
      options: ['primary', 'secondary', 'danger'],
      table: {category: 'Props'},
    },
  },
  component: FocusRoomButton,
  decorators: [
    (Story) => (
      <main class="grid min-h-48 place-items-center bg-[var(--focus-room-canvas)] p-6">
        <Story />
      </main>
    ),
  ],
  title: 'Pomo/Components/Focus Room/FocusRoomButton',
} satisfies Meta<typeof FocusRoomButton>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  play: async ({canvasElement}: ButtonPlayContext) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', {name: '집중 시작'}))
    await expect(meta.args.onPress).toHaveBeenCalledOnce()
  },
}

export const Secondary: Story = {
  args: {
    children: '나중에',
    icon: 'i-tabler-clock-pause',
    tone: 'secondary',
  },
}

export const Danger: Story = {
  args: {
    children: '현재 세션 종료',
    icon: 'i-tabler-square',
    tone: 'danger',
  },
}
