import type {Meta, StoryObj} from 'storybook-solidjs-vite'

import breakStatusIcon from '../../assets/pomodoro-status-icons/break-face.webp'
import focusStatusIcon from '../../assets/pomodoro-status-icons/focus-face.webp'
import './focus-room-tokens.css'
import {FocusRoomCharacterEmotion} from './FocusRoomCharacterEmotion'

const meta = {
  args: {
    active: true,
    emotion: 'focus',
    image: focusStatusIcon,
  },
  argTypes: {
    emotion: {
      control: 'select',
      options: ['focus', 'rest'],
      table: {category: 'Props'},
    },
  },
  component: FocusRoomCharacterEmotion,
  parameters: {
    backgrounds: {default: 'black'},
  },
  title: 'Pomo/Design System/FocusRoomCharacterEmotion',
} satisfies Meta<typeof FocusRoomCharacterEmotion>

export default meta
type Story = StoryObj<typeof meta>

export const Focus: Story = {}

export const Rest: Story = {
  args: {
    emotion: 'rest',
    image: breakStatusIcon,
  },
}
