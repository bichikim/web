import {createEffect, createSignal, JSX, onCleanup, Show} from 'solid-js'
import {preventGlobalTouchAttrs} from 'src/components/real-button/use-global-touch'
import {getWindow} from '@winter-love/utils'

export interface ReloadPromptProps extends JSX.HTMLAttributes<HTMLDivElement> {
  //
}

type ServiceWorkerState = 'active' | 'installing' | 'waiting'

const useServiceWorker = (path: string) => {
  const [state, setState] = createSignal<ServiceWorkerState | undefined>()
  let _registration: ServiceWorkerRegistration | undefined

  const handleSkipWaiting = () => {
    _registration?.waiting?.postMessage({type: 'SKIP_WAITING'})
  }

  createEffect(async () => {
    const window = getWindow()
    const {navigator} = window || {}
    const {serviceWorker} = navigator || {}

    if (import.meta.env.DEV || !window || !navigator || !serviceWorker) {
      return
    }

    const registration = await serviceWorker.register(path)

    _registration = registration

    const statechange = () => {
      if (registration.installing) {
        setState('installing')
      } else if (registration.waiting) {
        setState('waiting')
      } else if (registration.active) {
        setState('active')
      }
    }

    const updatefound = () => {
      setState('installing')
      registration.installing?.addEventListener('statechange', statechange)
    }

    registration.addEventListener('updatefound', updatefound)
    registration.addEventListener('statechange', statechange)

    onCleanup(() => {
      registration.removeEventListener('updatefound', updatefound)
      registration.removeEventListener('statechange', statechange)
    })
  })

  return [state, {handleSkipWaiting}]
}

/**
 * @WIP
 */
export const ReloadPrompt = (props: ReloadPromptProps) => {
  const [offlineReady, setOfflineReady] = createSignal(false)
  const [needRefresh, setNeedRefresh] = createSignal(false)

  const [state] = useServiceWorker('/sw.js')

  const handleClose = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  const handleUpdateServiceWorker = async () => {
    console.info('handleUpdateServiceWorker')
    handleClose()
    // await updateServiceWorker()
  }

  return (
    <Show when={offlineReady() || needRefresh()}>
      <div {...props} {...preventGlobalTouchAttrs()}>
        <Show when={offlineReady()}>
          <div class="flex flex-col gap-2">
            <span>App ready to work offline</span>
            <button class="" onClick={handleClose} onTouchEnd={handleClose}>
              OK
            </button>
          </div>
        </Show>
        <Show when={needRefresh()}>
          <div class="flex flex-col gap-2">
            <span>App Updated Please Click Reload to use the updated App</span>
            <div class="flex gap-2">
              <button
                class="b-0 cusor-pointer rd-1 px-5 py-1"
                onClick={handleUpdateServiceWorker}
                onTouchEnd={handleUpdateServiceWorker}
              >
                Reload
              </button>
              <button
                class="b-0 cusor-pointer rd-1 px-2 py-1"
                onClick={handleClose}
                onTouchEnd={handleClose}
              >
                Skip
              </button>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  )
}
