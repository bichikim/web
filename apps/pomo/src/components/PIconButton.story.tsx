import {expect, fn, userEvent, waitFor, within} from 'storybook/test'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'

import {PIconButton} from './PIconButton'

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
  component: PIconButton,
  parameters: {
    backgrounds: {default: 'black'},
  },
  title: 'Pomo/Components/PIconButton',
} satisfies Meta<typeof PIconButton>

export default meta
type Story = StoryObj<typeof meta>

export const Medium: Story = {}

export const Small: Story = {
  args: {size: 'small'},
}

export const Tooltip: Story = {
  decorators: [
    (Story) => (
      <div class="h-12 w-12 overflow-hidden rounded-control">
        <Story />
      </div>
    ),
  ],
  play: async (context) => {
    const canvas = within(context.canvasElement)
    const button = canvas.getByRole('button', {name: '설정 열기'})
    await userEvent.hover(button)
    const tooltip = await canvas.findByRole('tooltip')
    await expect(tooltip).toHaveTextContent('설정 열기')
    await expect(button).toHaveAttribute('aria-describedby', tooltip.id)
    await expect(tooltip.matches(':popover-open')).toBe(true)
    await expect(getComputedStyle(tooltip).zIndex).toBe('auto')

    const bounds = tooltip.getBoundingClientRect()
    await expect(bounds.top).toBeGreaterThanOrEqual(0)
    await expect(bounds.left).toBeGreaterThanOrEqual(0)
    await expect(bounds.right).toBeLessThanOrEqual(innerWidth)
    await expect(bounds.bottom).toBeLessThanOrEqual(innerHeight)
    await expect(
      tooltip.contains(
        document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2),
      ),
    ).toBe(true)

    await userEvent.unhover(button)
    await userEvent.hover(tooltip)
    await expect(tooltip).toBeVisible()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(tooltip).not.toBeVisible())
    await expect(button).not.toHaveAttribute('aria-describedby')
  },
}
