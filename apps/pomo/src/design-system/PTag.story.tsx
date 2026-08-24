import type {Meta, StoryObj} from 'storybook-solidjs-vite'

import {PTag} from './PTag'

const meta = {
  args: {
    children: 'AI 음성',
    size: 'small',
    tone: 'neutral',
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium'],
      table: {category: 'Props'},
    },
    tone: {
      control: 'select',
      options: ['neutral', 'highlight', 'danger'],
      table: {category: 'Props'},
    },
  },
  component: PTag,
  decorators: [
    (Story) => (
      <main class="grid min-h-48 place-items-center bg-background p-6">
        <Story />
      </main>
    ),
  ],
  title: 'Pomo/Design System/PTag',
} satisfies Meta<typeof PTag>

export default meta
type Story = StoryObj<typeof meta>

export const Neutral: Story = {}

export const Highlight: Story = {
  args: {children: '새 항목', tone: 'highlight'},
}

export const Danger: Story = {
  args: {children: '오류', tone: 'danger'},
}
