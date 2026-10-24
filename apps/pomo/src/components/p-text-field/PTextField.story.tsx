import {fn} from 'storybook/test'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {PTextField} from './PTextField'

const meta = {
  args: {
    label: '제목',
    onChange: fn(),
    placeholder: '내용을 입력해 주세요',
    value: '',
  },
  argTypes: {
    disabled: {control: 'boolean'},
    errorMessage: {control: 'text'},
    multiline: {control: 'boolean'},
    onChange: {table: {category: 'Events'}},
    readOnly: {control: 'boolean'},
    rows: {control: 'number'},
    value: {control: 'text'},
  },
  component: PTextField,
  decorators: [
    (Story) => (
      <div class="w-full max-w-md p-4">
        <Story />
      </div>
    ),
  ],
  title: 'Pomo/Components/PTextField',
} satisfies Meta<typeof PTextField>

export default meta
type Story = StoryObj<typeof meta>

export const SingleLine: Story = {}
export const Multiline: Story = {args: {label: '메모', multiline: true, rows: 4}}
export const Invalid: Story = {args: {errorMessage: '내용을 확인해 주세요.', value: '확인할 내용'}}
export const Disabled: Story = {args: {disabled: true, value: '편집할 수 없는 내용'}}
