import {createSignal, untrack} from 'solid-js'
import {expect, fn, userEvent, within} from 'storybook/test'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'

import './focus-room-tokens.css'
import {FocusRoomRadioSwitch, type FocusRoomRadioSwitchProps} from './FocusRoomRadioSwitch'

const OPTIONS = [
  {icon: 'i-tabler-sun', label: '낮', value: 'day'},
  {icon: 'i-tabler-moon', label: '밤', value: 'night'},
  {icon: 'i-tabler-sun-moon', label: '자동', value: 'auto'},
] as const

interface RadioSwitchPlayContext {
  readonly args: FocusRoomRadioSwitchProps<'auto' | 'day' | 'night'>
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
  component: FocusRoomRadioSwitch,
  decorators: [
    (Story) => (
      <main class="grid min-h-screen place-items-center bg-[var(--focus-room-canvas)] p-6">
        <div class="focus-room-backdrop w-full max-w-md rounded-5 bg-[var(--focus-room-surface)] p-5">
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
      <FocusRoomRadioSwitch
        label={props.label}
        onChange={handleChange}
        options={props.options}
        value={value()}
      />
    )
  },
  title: 'Pomo/Components/Focus Room/FocusRoomRadioSwitch',
} satisfies Meta<typeof FocusRoomRadioSwitch<'auto' | 'day' | 'night'>>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({args, canvasElement}: RadioSwitchPlayContext) => {
    const canvas = within(canvasElement)
    const nightOption = canvas.getByRole('radio', {name: '밤'})

    await userEvent.click(nightOption)
    await expect(args.onChange).toHaveBeenCalledWith('night')
    await expect(nightOption).toBeChecked()
  },
}
