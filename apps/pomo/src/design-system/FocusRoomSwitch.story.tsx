import {createSignal, untrack} from 'solid-js'
import {expect, fn, userEvent, within} from 'storybook/test'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'

import './focus-room-tokens.css'
import {FocusRoomSwitch, type FocusRoomSwitchProps} from './FocusRoomSwitch'

interface SwitchPlayContext {
  readonly args: FocusRoomSwitchProps
  readonly canvasElement: HTMLElement
}

const meta = {
  args: {
    checked: false,
    description: '집중하는 동안 화면을 계속 켜 둡니다.',
    disabled: false,
    label: '화면 자동 꺼짐 방지',
    onChange: fn(),
  },
  argTypes: {
    checked: {control: 'boolean', table: {category: 'Props'}},
    description: {control: 'text', table: {category: 'Props'}},
    disabled: {control: 'boolean', table: {category: 'Props'}},
    label: {control: 'text', table: {category: 'Props'}},
    onChange: {table: {category: 'Events'}, type: {name: 'function'}},
  },
  component: FocusRoomSwitch,
  decorators: [
    (Story) => (
      <main class="grid min-h-screen place-items-center bg-[var(--focus-room-canvas)] p-6">
        <div
          class={
            'focus-room-backdrop w-full max-w-md rounded-[var(--focus-room-radius-panel)] ' +
            'bg-[var(--focus-room-surface)] p-5'
          }
        >
          <Story />
        </div>
      </main>
    ),
  ],
  parameters: {
    backgrounds: {default: 'black'},
    layout: 'fullscreen',
  },
  render: (props) => {
    const initialChecked = untrack(() => props.checked)
    const [isChecked, setIsChecked] = createSignal(initialChecked)
    const handleChange = (nextChecked: boolean) => {
      setIsChecked(nextChecked)
      props.onChange(nextChecked)
    }

    return (
      <FocusRoomSwitch
        checked={isChecked()}
        class={props.class}
        description={props.description}
        disabled={props.disabled}
        label={props.label}
        onChange={handleChange}
      />
    )
  },
  title: 'Pomo/Components/Focus Room/FocusRoomSwitch',
} satisfies Meta<typeof FocusRoomSwitch>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({args, canvasElement}: SwitchPlayContext) => {
    const canvas = within(canvasElement)
    const wakeLockSwitch = canvas.getByRole('switch', {name: '화면 자동 꺼짐 방지'})
    await userEvent.click(wakeLockSwitch)
    await expect(args.onChange).toHaveBeenCalledWith(true)
    await expect(wakeLockSwitch).toBeChecked()
  },
}

export const Checked: Story = {
  args: {checked: true},
}

export const Disabled: Story = {
  args: {
    description: '이 브라우저에서는 화면 유지 기능을 지원하지 않아요.',
    disabled: true,
  },
}
