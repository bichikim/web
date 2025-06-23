import {createEffect, useContext} from 'solid-js'
import {ToastContext} from '@winter-love/solid-components'
import {useServiceWorker} from 'src/components/service-worker'

export interface ReloadPromptProps {
  pageReload: boolean
}

/**
 * Prompt PWA update message toast
 */
export const ReloadPrompt = (props: ReloadPromptProps) => {
  const [serviceWorkerState, {handleSkipWaiting, handleSkipUpdate}] = useServiceWorker()
  const {setMessage, turnOffMessage} = useContext(ToastContext)

  createEffect(() => {
    const id = '__confirm_pwa_update__'
    const workerState = serviceWorkerState()

    const message = 'Please confirm to update the app'
    const title = 'App Updated'
    const confirmLabel = 'Confirm'
    const skipLabel = 'Skip for now'

    const waitingConfirmProcess = async () => {
      setMessage({
        actions: [
          {
            label: confirmLabel,
            props: {color: 'primary', loading: true},
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
          close()
        },
        id,
        message,
        title,
      })
      console.log('skip waiting ...')
      await handleSkipWaiting()

      if (props.pageReload) {
        location.reload()
      }
    }

    if (workerState.state === 'waiting') {
      setMessage({
        actions: [
          {
            action: () => {
              waitingConfirmProcess()
            },
            label: confirmLabel,
            props: {color: 'primary'},
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
    } else {
      turnOffMessage(id)
    }
  })

  return null
}
