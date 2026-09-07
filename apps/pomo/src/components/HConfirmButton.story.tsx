import {expect, fn, userEvent, within} from 'storybook/test'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {HConfirmButton} from './HConfirmButton'
import {pButtonClasses} from './PButton'

const meta = {
  args: {
    accessibleLabel: '일기 삭제',
    children: '삭제',
    class: pButtonClasses({bordered: true, size: 'small', tone: 'danger', transparent: true}),
    confirmationAccessibleLabel: '일기를 삭제하려면 한 번 더 누르세요',
    confirmationChildren: '한 번 더 눌러 삭제',
    disabled: false,
    onConfirm: fn(),
  },
  argTypes: {
    accessibleLabel: {control: 'text', table: {category: 'Accessibility'}},
    children: {control: 'text'},
    class: {control: 'text'},
    confirmationAccessibleLabel: {control: 'text', table: {category: 'Accessibility'}},
    confirmationChildren: {control: 'text'},
    disabled: {control: 'boolean'},
    onConfirm: {table: {category: 'Events'}},
  },
  component: HConfirmButton,
  decorators: [
    (Story) => (
      <main class="grid min-h-48 place-items-center bg-background p-6">
        <Story />
      </main>
    ),
  ],
  title: 'Pomo/Components/HConfirmButton',
} satisfies Meta<typeof HConfirmButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({args, canvasElement}) => {
    const button = within(canvasElement).getByRole('button', {name: args.accessibleLabel})
    await userEvent.click(button)
    await expect(args.onConfirm).not.toHaveBeenCalled()
    await expect(button).toHaveAccessibleName(args.confirmationAccessibleLabel)
    await userEvent.click(button)
    await expect(args.onConfirm).toHaveBeenCalledOnce()
    await expect(button).not.toHaveAttribute('data-confirming')
  },
}

export const Confirming: Story = {
  play: async ({args, canvasElement}) => {
    const button = within(canvasElement).getByRole('button', {name: args.accessibleLabel})
    await userEvent.click(button)
    await expect(button).toHaveAttribute('data-confirming')
    await expect(args.onConfirm).not.toHaveBeenCalled()
  },
}

export const KeyboardCancellation: Story = {
  play: async ({args, canvasElement}) => {
    const button = within(canvasElement).getByRole('button', {name: args.accessibleLabel})
    button.focus()
    await userEvent.keyboard('{Enter}')
    await expect(button).toHaveAttribute('data-confirming')
    await userEvent.keyboard('{Escape}')
    await expect(button).not.toHaveAttribute('data-confirming')
    await userEvent.keyboard(' ')
    await expect(button).toHaveAttribute('data-confirming')
    await userEvent.tab()
    await expect(button).not.toHaveAttribute('data-confirming')
    await expect(args.onConfirm).not.toHaveBeenCalled()
  },
}

export const Disabled: Story = {
  args: {disabled: true},
  play: async ({args, canvasElement}) => {
    const button = within(canvasElement).getByRole('button', {name: args.accessibleLabel})
    await expect(button).toBeDisabled()
    await userEvent.click(button)
    await expect(args.onConfirm).not.toHaveBeenCalled()
    await expect(button).not.toHaveAttribute('data-confirming')
  },
}
