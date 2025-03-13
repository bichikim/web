import {createEffect, useContext} from 'solid-js'
import {ToastContext} from '@winter-love/solid-components'
import {useServiceWorker} from 'src/components/service-worker'

/**
 * @WIP
 */
export const ReloadPrompt = () => {
  const [serviceWorkerState, {handleSkipWaiting, handleSkipUpdate}] = useServiceWorker()
  const {setMessage} = useContext(ToastContext)

  createEffect(() => {
    const id = '__confirm_pwa_update__'
    const workerState = serviceWorkerState()

    const message = 'Please confirm to update the app'
    const title = 'App Updated'
    const confirmLabel = 'Confirm'
    const skipLabel = 'Skip for now'

    const waitingConfirmProcess = () => {
      setMessage({
        actions: [
          {
            label: confirmLabel,
            props: {loading: true, variant: 'primary'},
            type: 'click',
          },
          {
            actionToClose: false,
            label: skipLabel,
            props: {disabled: true, flat: true},
            type: 'click',
          },
        ],
        closeHook: async (close) => {
          await handleSkipWaiting()
          close()
        },
        id,
        message,
        title,
      })
    }

    if (workerState.state === 'waiting') {
      console.info('waiting')

      setMessage({
        actions: [
          {
            action: () => {
              waitingConfirmProcess()
            },
            label: confirmLabel,
            props: {variant: 'primary'},
            type: 'click',
          },
          {
            action: ({close}) => {
              handleSkipUpdate()
              close()
            },
            label: skipLabel,
            props: {flat: true},
            type: 'click',
          },
        ],
        id,
        message,
        title,
      })
    }
  })

  return null
}
