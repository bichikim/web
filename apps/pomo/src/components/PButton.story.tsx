import {expect, fn, userEvent, within} from 'storybook/test'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'

import smilingFaceSource from './assets/pomodoro-status-icons/break.webp'
import {PButton} from './PButton'

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
    accessibleLabel: {control: 'text', table: {category: 'Accessibility'}},
    disabled: {control: 'boolean', table: {category: 'Props'}},
    icon: {control: 'text', table: {category: 'Props'}},
    leadingImage: {control: 'text', table: {category: 'Props'}},
    onPress: {table: {category: 'Events'}, type: {name: 'function'}},
    size: {
      control: 'select',
      options: ['small', 'medium'],
      table: {category: 'Props'},
    },
    tone: {
      control: 'select',
      options: ['primary', 'secondary', 'glass', 'danger'],
      table: {category: 'Props'},
    },
    trailingIcon: {control: 'text', table: {category: 'Props'}},
  },
  component: PButton,
  decorators: [
    (Story) => (
      <main class="grid min-h-48 place-items-center bg-background p-6">
        <Story />
      </main>
    ),
  ],
  title: 'Pomo/Components/PButton',
} satisfies Meta<typeof PButton>

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

export const Glass: Story = {
  args: {
    children: '입장하기',
    icon: undefined,
    leadingImage: smilingFaceSource,
    tone: 'glass',
    trailingIcon: 'i-tabler-arrow-right',
  },
}

export const Danger: Story = {
  args: {
    children: '현재 세션 종료',
    icon: 'i-tabler-square',
    tone: 'danger',
  },
}
