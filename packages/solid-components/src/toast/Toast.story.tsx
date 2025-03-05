import type {Meta, StoryObj} from 'storybook-solidjs'
import {ToastProvider} from './ToastProvider'
import {ToastBody} from './ToastBody'
import {useContext} from 'solid-js'
import {createTimeout, Message, NotificationContext} from './context'
import {createUuid} from '@winter-love/utils'
import {fn} from '@storybook/test'

const uuid = createUuid()

const meta = {
  component: ToastProvider,
  title: 'Solid/Components/Toast',
} satisfies Meta<typeof ToastProvider>

export default meta
type Story = StoryObj<typeof meta>

const DemoContent = () => {
  const {setMessage} = useContext(NotificationContext)

  const handleClick = () => {
    setMessage({
      actions: [
        {
          action: fn(),
          label: '확인',
          type: 'click',
        },
      ],
      closeHook: createTimeout(3000),
      id: uuid(),
      message: '알림 메시지입니다',
    })
  }

  return (
    <div class="fixed bottom-0 left-0 flex flex-col gap-4">
      <button
        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={handleClick}
      >
        알림 표시
      </button>
    </div>
  )
}

interface NotificationItemProps extends Message {}

const NotificationItem = (props: NotificationItemProps) => {
  return (
    <div class="bg-white rounded-lg p-4 shadow-lg">
      <div class="text-lg font-bold">{props.message}</div>
    </div>
  )
}

export const Primary: Story = {
  render: () => (
    <ToastProvider>
      <ToastBody>{(message) => <NotificationItem {...message} />}</ToastBody>
      <DemoContent />
    </ToastProvider>
  ),
}
