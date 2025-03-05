import type {Meta, StoryObj} from 'storybook-solidjs'
import {useContext} from 'solid-js'
import {createUuid} from '@winter-love/utils'
import {fn} from '@storybook/test'
import {SToastProvider} from './SToastProvider'
import {createTimeout, NotificationContext} from '@winter-love/solid-components'

const uuid = createUuid()

const meta = {
  component: SToastProvider,
  title: 'BPlan/Components/SToast',
} satisfies Meta<typeof SToastProvider>

export default meta
type Story = StoryObj<typeof meta>

const DemoContent = () => {
  const {setMessage} = useContext(NotificationContext)

  const handleAddTimeout = () => {
    const id = uuid()

    setMessage({
      actions: [
        {
          action: fn(),
          label: '확인',
          type: 'click',
        },
      ],
      closeHook: createTimeout(3000),
      id,
      message: `알림 메시지입니다 3초 후 사라집니다 ${id}`,
    })
  }

  const handleAddWait = () => {
    const id = uuid()

    setMessage({
      clickToClose: true,
      id,
      message: `알림 메시지입니다 닫기전 까지 사라지지 않습니다 ${id}`,
    })
  }

  return (
    <div class="fixed top-0 left-0 flex flex-col gap-4">
      <button
        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={handleAddTimeout}
      >
        알림 표시 3초
      </button>
      <button
        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={handleAddWait}
      >
        알림 표시 닫기전 까지 사라지지 않음
      </button>
    </div>
  )
}

export const Primary: Story = {
  render: () => (
    <SToastProvider>
      <DemoContent />
    </SToastProvider>
  ),
}
