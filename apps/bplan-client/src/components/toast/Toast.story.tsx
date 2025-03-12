import type {Meta, StoryObj} from 'storybook-solidjs'
import {useContext} from 'solid-js'
import {createUuid} from '@winter-love/utils'
import {fn} from '@storybook/test'
import {SToastProvider} from './SToastProvider'
import {createTimeout, ToastContext} from '@winter-love/solid-components'

const uuid = createUuid()

const meta = {
  component: SToastProvider,
  title: 'BPlan/Components/SToast',
} satisfies Meta<typeof SToastProvider>

export default meta
type Story = StoryObj<typeof meta>

const DemoContent = () => {
  const {setMessage} = useContext(ToastContext)

  const handleAddTimeout = () => {
    const id = uuid()

    setMessage({
      actions: [
        {
          action: fn(),
          label: 'Confirm',
          type: 'click',
        },
      ],
      closeHook: createTimeout(3000),
      id,
      message: `This is a notification message that will disappear after 3 seconds ${id}`,
      title: 'Message Title',
    })
  }

  const handleAddWait = () => {
    const id = uuid()

    setMessage({
      clickToClose: true,
      id,
      // eslint-disable-next-line max-len
      message: `This is a notification message that will not disappear until closed ${id} This is a notification message that will not disappear until closed`,
      title: 'Message Title',
    })
  }

  const handleActions = () => {
    const id = uuid()

    setMessage({
      actions: [
        {
          action: fn(),
          label: 'Confirm',
          type: 'click',
        },
        {
          action: fn(),
          actionToClose: true,
          label: 'Cancel',
          type: 'click',
        },
      ],
      id,
      message: `This is a notification message that will disappear after 3 seconds ${id}`,
      title: 'Message Title',
    })
  }

  return (
    <div class="fixed top-0 left-0 flex flex-col gap-4">
      <button
        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={handleAddTimeout}
      >
        Show notification for 3 seconds
      </button>
      <button
        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={handleAddWait}
      >
        Show notification until closed
      </button>
      <button
        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={handleActions}
      >
        Show notification with actions
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
