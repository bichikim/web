import {
  ComponentProps,
  createEffect,
  createMemo,
  createSignal,
  Show,
  useContext,
} from 'solid-js'
import {preventGlobalTouchAttrs} from 'src/components/real-button/use-global-touch'
import {useServiceWorker} from 'src/components/service-worker'
import {SButton} from 'src/components/button'
import {SDivider} from 'src/components/divider'
// import {ServiceWorkerInfo} from 'src/components/service-worker'
import {createTimeout, ToastContext} from '@winter-love/solid-components'

export interface ReloadPromptProps extends ComponentProps<'div'> {
  //
}

/**
 * @WIP
 */
export const ReloadPrompt = (props: ReloadPromptProps) => {
  const [, {handleSkipWaiting, handleSkipUpdate}] = useServiceWorker()
  const {setMessage} = useContext(ToastContext)

  const [serviceWorkerState, setServiceWorkerState] = createSignal<ServiceWorkerInfo>({
    offline: false,
    state: 'initializing',
  })

  const handleClose = () => {
    handleSkipUpdate()
  }

  const isWaitingForUpdate = createMemo(() => {
    return serviceWorkerState().state === 'waiting'
  })

  const handleUpdateServiceWorker = async () => {
    const result = await handleSkipWaiting()

    if (result) {
      console.info('oh ye!!!')
    }
  }

  const handleTestWait = () => {
    setServiceWorkerState({
      offline: false,
      state: 'waiting',
    })
  }

  createEffect(() => {
    const workerState = serviceWorkerState()

    if (workerState.state === 'waiting') {
      console.info('waiting')

      setMessage({
        actions: [
          {
            action: () => {
              console.info('action')
            },
            label: 'confirm',
            type: 'click',
          },
        ],
        id: 'test',
        message: 'test',
      })
    }
  })

  const handleMesssage = () => {
    setMessage({
      actions: [
        {
          action: () => {
            console.info('action')
          },
          label: 'confirm',
          type: 'click',
        },
        {
          action: () => {
            console.info('action')
          },
          label: 'cancel',
          type: 'click',
        },
      ],
      closeHook: createTimeout(3000),
      id: 'test',
      message: 'test',
      title: 'test',
    })
  }

  return (
    <>
      <div class="fixed top-2 right-2 p-2 bg-white rd-1 backdrop-blur-sm bg-opacity-90 b-1 b-white">
        <span>test</span>
        <SButton variant="transparent" flat onClick={handleTestWait}>
          test waiting
        </SButton>
        <SButton variant="transparent" flat onClick={handleMesssage}>
          test message
        </SButton>
      </div>
      <Show when={isWaitingForUpdate()}>
        <div
          {...props}
          class="fixed top-2 right-2 p-2 bg-white rd-1 backdrop-blur-sm bg-opacity-90 b-1 b-white"
          {...preventGlobalTouchAttrs()}
        >
          <div class="flex flex-col gap-1">
            <div class="p-1">
              <h4 class="font-bold">App Updated</h4>
              <span class="text-md color-gray-600">
                Please Click Reload to use the updated App
              </span>
            </div>
            <SDivider type="horizontal" class="mx-2" />
            <div class="flex gap-2 p-1">
              <SButton variant="primary" flat onClick={handleUpdateServiceWorker}>
                Reload
              </SButton>
              <SButton variant="transparent" flat onClick={handleClose}>
                Skip
              </SButton>
            </div>
          </div>
        </div>
      </Show>
      <div class="fixed top-1 left-1 bg-green-400 rd-1 min-w-2 min-h-2 px-1 text-white duration-300">
        {serviceWorkerState().state}
      </div>
    </>
  )
}
