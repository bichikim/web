import {Meta, StoryObj} from 'storybook-solidjs-vite'
import {DialogProvider} from './DialogProvider'
import {fn} from '@storybook/test'

const meta = {
  argTypes: {
    children: {
      description: '다이얼로그 내용',
    },
    onShowChange: {
      description: '다이얼로그 표시 상태가 변경될 때 호출되는 콜백',
    },
    show: {
      control: 'boolean',
      defaultValue: false,
      description: '다이얼로그 표시 여부',
    },
  },
  component: DialogProvider,
  title: 'Solid/Components/Dialog/HDialog',
} satisfies Meta<typeof DialogProvider>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: (
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center">
        <div class="bg-white p-4 rounded-lg">
          <h2 class="text-lg font-bold mb-2">다이얼로그 제목</h2>
          <p class="mb-4">다이얼로그 내용입니다.</p>
          <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" onClick={fn()}>
            닫기
          </button>
        </div>
      </div>
    ),
    show: true,
  },
}
