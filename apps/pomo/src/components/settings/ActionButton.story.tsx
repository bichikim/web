import {MemoryRouter} from '@solidjs/router'
import {expect, fn, within} from 'storybook/test'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {PSettingsActionButton} from './ActionButton'
import {PSettingsActionLink} from './ActionLink'

const meta = {
  args: {children: '추가', disabled: false, icon: 'i-tabler-plus', onPress: fn(), size: 'medium'},
  argTypes: {
    disabled: {control: 'boolean'},
    icon: {control: 'text'},
    onPress: {table: {category: 'Events'}},
    size: {control: 'select', options: ['small', 'medium']},
  },
  component: PSettingsActionButton,
  title: 'Pomo/Components/Settings/ActionButton',
} satisfies Meta<typeof PSettingsActionButton>
export default meta
type Story = StoryObj<typeof meta>

export const Medium: Story = {}
export const Small: Story = {args: {size: 'small'}}
export const Disabled: Story = {
  args: {disabled: true},
  play: async ({canvasElement}) => {
    const button = within(canvasElement).getByRole('button')
    await expect(button).toBeDisabled()
    await expect(getComputedStyle(button).opacity).toBe('0.55')
  },
}
export const LinkAndButton: Story = {
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button')
    const link = canvas.getByRole('link')
    const buttonStyle = getComputedStyle(button)
    const linkStyle = getComputedStyle(link)
    await Promise.all(
      ['height', 'padding', 'border-radius', 'border-color', 'background-color', 'color'].map(
        (property) =>
          expect(buttonStyle.getPropertyValue(property)).toBe(linkStyle.getPropertyValue(property)),
      ),
    )
    await expect(button.getBoundingClientRect().height).toBe(44)
  },
  render: (args) => (
    <MemoryRouter
      root={() => (
        <div class="flex items-center gap-4">
          <PSettingsActionButton {...args} />
          <PSettingsActionLink href="/dialogue" size={args.size} icon={args.icon}>
            새 대화
          </PSettingsActionLink>
        </div>
      )}
    />
  ),
}
export const SmallLinkAndButton: Story = {
  ...LinkAndButton,
  args: {size: 'small'},
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('button').getBoundingClientRect().height).toBe(36)
    await expect(canvas.getByRole('link').getBoundingClientRect().height).toBe(36)
  },
}
