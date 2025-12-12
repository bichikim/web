import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {ToastProvider} from './ToastProvider'
import {useContext} from 'solid-js'
import {createTimeout, ToastContext} from './context'
import {createUuid} from '@winter-love/utils'
import {fn} from '@storybook/test'
import {Toast} from './index'
import {HButton} from '../button'
const uuid = createUuid()

const meta = {
  component: ToastProvider,
  title: 'Solid/Components/Toast',
} satisfies Meta<typeof ToastProvider>

export default meta
type Story = StoryObj<typeof meta>

const DemoContent = () => {
  const {setMessage} = useContext(ToastContext)

  const handleOpenTimeout = () => {
    setMessage({
      actions: [
        {
          action: fn(),
          label: 'Confirm',
          type: 'click',
        },
      ],
      closeHook: createTimeout(3000),
      id: uuid(),
      message: 'Show notification with timeout',
    })
  }

  const handleOpenActionToClose = () => {
    setMessage({
      actions: [
        {
          actionToClose: true,
          label: 'Confirm',
          type: 'click',
        },
      ],
      id: uuid(),
      message: 'Show notification close on action click',
    })
  }

  const handleClickToClose = () => {
    setMessage({
      clickToClose: true,
      id: uuid(),
      message: 'Show notification close on click',
    })
  }

  const handleOpenActions = () => {
    setMessage({
      actions: [
        {
          action: ({setAction}) => {
            handleOpenTimeout()

            setAction((prev) => {
              return {
                ...prev,
                label: 'One more!!!',
              }
            })
          },
          label: 'One more',
          type: 'click',
        },
        {
          actionToClose: true,
          label: 'Cancel',
          type: 'click',
        },
      ],
      id: uuid(),
      message: 'Show notification with actions',
    })
  }

  return (
    <div class="fixed bottom-0 left-0 flex flex-col gap-4">
      <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={handleOpenTimeout}>
        Show notification with timeout
      </button>
      <button
        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={handleOpenActionToClose}
      >
        Show notification close on action click
      </button>
      <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={handleClickToClose}>
        Show notification close on click
      </button>
      <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={handleOpenActions}>
        Show notification with actions
      </button>
    </div>
  )
}

export const Primary: Story = {
  render: () => (
    <Toast.Provider>
      <Toast.Body class="fixed top-0 left-0 flex flex-col gap-2">
        <Toast.Item class="bg-white rounded-lg p-4 shadow-lg">
          <Toast.Title />
          <Toast.Message />
          <Toast.ActionBody>
            <span>Actions list</span>
            <Toast.ActionList>
              <Toast.Action component={HButton} />
            </Toast.ActionList>
          </Toast.ActionBody>
        </Toast.Item>
      </Toast.Body>
      <DemoContent />
    </Toast.Provider>
  ),
}
