import {createSignal, untrack} from 'solid-js'
import {expect, fn, userEvent, within} from 'storybook/test'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'

import {PRadioSwitch, type PRadioSwitchProps} from './PRadioSwitch'

const OPTIONS = [
  {icon: 'i-tabler-sun', label: '낮', value: 'day'},
  {icon: 'i-tabler-moon', label: '밤', value: 'night'},
  {icon: 'i-tabler-sun-moon', label: '자동', value: 'auto'},
] as const

interface RadioSwitchPlayContext {
  readonly args: PRadioSwitchProps<'auto' | 'day' | 'night'>
  readonly canvasElement: HTMLElement
}

const meta = {
  args: {
    label: '시간',
    onChange: fn(),
    options: OPTIONS,
    value: 'day',
  },
  argTypes: {
    label: {control: 'text', table: {category: 'Props'}},
    onChange: {table: {category: 'Events'}, type: {name: 'function'}},
    value: {control: 'select', options: ['day', 'night', 'auto'], table: {category: 'Props'}},
  },
  component: PRadioSwitch,
  decorators: [
    (Story) => (
      <main class="grid min-h-screen place-items-center bg-[var(--pomo-canvas)] p-6">
        <div class="pomo-backdrop w-full max-w-md rounded-5 bg-[var(--pomo-surface)] p-5">
          <Story />
        </div>
      </main>
    ),
  ],
  parameters: {backgrounds: {default: 'black'}, layout: 'fullscreen'},
  render: (props) => {
    const initialValue = untrack(() => props.value)
    const [value, setValue] = createSignal(initialValue)
    const handleChange = (nextValue: 'auto' | 'day' | 'night') => {
      setValue(nextValue)
      props.onChange(nextValue)
    }

    return (
      <PRadioSwitch
        label={props.label}
        onChange={handleChange}
        options={props.options}
        value={value()}
      />
    )
  },
  title: 'Pomo/Design System/PRadioSwitch',
} satisfies Meta<typeof PRadioSwitch<'auto' | 'day' | 'night'>>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({args, canvasElement}: RadioSwitchPlayContext) => {
    const canvas = within(canvasElement)
    const nightOption = canvas.getByRole('radio', {name: '밤'})
    const automaticOption = canvas.getByRole('radio', {name: '자동'})

    await userEvent.click(nightOption)
    await expect(args.onChange).toHaveBeenCalledWith('night')
    await expect(nightOption).toBeChecked()

    nightOption.focus()
    await userEvent.keyboard('{ArrowRight}')
    await expect(args.onChange).toHaveBeenCalledWith('auto')
    await expect(automaticOption).toBeChecked()
    await expect(automaticOption).toHaveFocus()
  },
}
