import {fn} from 'storybook/test'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'

import './focus-room-tokens.css'
import {FocusRoomIconButton} from './FocusRoomIconButton'

const meta = {
  args: {
    accessibleLabel: '설정 열기',
    feedback: '설정',
    icon: 'i-tabler-settings',
    onPress: fn(),
    size: 'medium',
  },
  argTypes: {
    onPress: {table: {category: 'Events'}},
    size: {
      control: 'select',
      options: ['small', 'medium'],
      table: {category: 'Props'},
    },
  },
  component: FocusRoomIconButton,
  parameters: {
    backgrounds: {default: 'black'},
  },
  title: 'Pomo/Design System/FocusRoomIconButton',
} satisfies Meta<typeof FocusRoomIconButton>

export default meta
type Story = StoryObj<typeof meta>

export const Medium: Story = {}

export const Small: Story = {
  args: {size: 'small'},
}
