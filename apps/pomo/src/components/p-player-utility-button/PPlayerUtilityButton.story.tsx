import {createSignal} from 'solid-js'
import {expect, fn, userEvent, within} from 'storybook/test'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {PPlayerUtilityButton} from './PPlayerUtilityButton'

const meta = {
  args: {
    accessibleLabel: '앨범 목록 열기',
    icon: 'i-tabler-disc',
    onPress: fn(),
    purpose: 'album',
  },
  argTypes: {
    accessibleLabel: {control: 'text', table: {category: 'Accessibility'}},
    expanded: {control: 'boolean'},
    icon: {control: 'text'},
    onPress: {table: {category: 'Events'}},
    purpose: {control: 'select', options: ['album', 'expand']},
  },
  component: PPlayerUtilityButton,
  decorators: [
    (Story) => (
      <main class="grid min-h-48 place-items-center bg-background p-6">
        <Story />
      </main>
    ),
  ],
  title: 'Pomo/Components/PPlayerUtilityButton',
} satisfies Meta<typeof PPlayerUtilityButton>

export default meta
type Story = StoryObj<typeof meta>

export const Album: Story = {
  play: async ({args, canvasElement}) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', {name: args.accessibleLabel})
    await expect(button).not.toHaveAttribute('aria-expanded')
    await userEvent.hover(button)
    await expect(await within(document.body).findByRole('tooltip')).toHaveTextContent(
      args.accessibleLabel,
    )
    await userEvent.click(button)
    await expect(args.onPress).toHaveBeenCalledOnce()
    await expect(args.onPress).toHaveBeenCalledWith(button)
  },
}

export const Collapsed: Story = {
  args: {
    accessibleLabel: '플레이어 펼치기',
    expanded: false,
    icon: 'i-tabler-chevron-up',
    purpose: 'expand',
  },
  play: async ({args, canvasElement}) => {
    const button = within(canvasElement).getByRole('button', {name: '플레이어 펼치기'})
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    button.focus()
    await userEvent.keyboard('{Enter}')
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    await expect(button).toHaveAccessibleName('플레이어 접기')
    await userEvent.keyboard('{Enter}')
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(args.onPress).toHaveBeenCalledTimes(2)
  },
  render: (args) => {
    const [expanded, setExpanded] = createSignal(args.expanded)
    return (
      <PPlayerUtilityButton
        {...args}
        accessibleLabel={expanded() ? '플레이어 접기' : '플레이어 펼치기'}
        expanded={expanded()}
        icon={expanded() ? 'i-tabler-chevron-down' : 'i-tabler-chevron-up'}
        onPress={(source) => {
          args.onPress(source)
          setExpanded((value) => !value)
        }}
      />
    )
  },
}

export const Expanded: Story = {
  args: {
    accessibleLabel: '플레이어 접기',
    expanded: true,
    icon: 'i-tabler-chevron-down',
    purpose: 'expand',
  },
}
