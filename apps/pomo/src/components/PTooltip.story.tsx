import {expect, userEvent, within} from 'storybook/test'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {PTooltip} from './PTooltip'
import {useTooltipTrigger} from './tooltip'

const meta = {
  args: {show: false, text: '전역 포털에 표시되는 설명'},
  argTypes: {
    show: {control: 'boolean'},
    target: {control: false},
    text: {control: 'text'},
  },
  component: PTooltip,
  render: (args) => {
    const trigger = useTooltipTrigger()
    return (
      <div class="grid min-h-48 place-items-center">
        <button {...trigger.events} ref={trigger.setTarget} type="button">
          툴팁 대상
        </button>
        <PTooltip target={trigger.target()} show={args.show || trigger.show()} text={args.text} />
      </div>
    )
  },
  title: 'Pomo/Components/PTooltip',
} satisfies Meta<typeof PTooltip>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Interactions: Story = {
  play: async ({canvasElement}) => {
    const button = within(canvasElement).getByRole('button')
    await userEvent.hover(button)
    const tooltip = await within(document.body).findByRole('tooltip')
    await expect(canvasElement.contains(tooltip)).toBe(false)
    await expect(tooltip.matches(':popover-open')).toBe(true)
    await expect(button).toHaveAttribute('aria-describedby', tooltip.id)
    const style = getComputedStyle(tooltip)
    await expect(style.zIndex).toBe('auto')
    await expect(style.position).toBe('fixed')
    await expect(style.getPropertyValue('position-area')).toBe('top')
    await expect(style.getPropertyValue('position-try-fallbacks')).toContain('flip-block')
    await expect(style.getPropertyValue('position-anchor')).toBe(
      getComputedStyle(button).getPropertyValue('anchor-name'),
    )
    await expect(style.overflowWrap).toBe('anywhere')
    await userEvent.keyboard('{Escape}')
    await expect(tooltip).not.toBeVisible()
    await userEvent.unhover(button)
    await userEvent.hover(button)
    await expect(await within(document.body).findByRole('tooltip')).toBeVisible()
    await userEvent.unhover(button)
  },
}
