import {JSX, Show} from 'solid-js'
import {preventGlobalTouchAttrs} from 'src/components/real-button/use-global-touch'
import {useRegisterSW} from 'virtual:pwa-register/solid'
import {getWindow} from '@winter-love/utils'

export interface ReloadPromptProps extends JSX.HTMLAttributes<HTMLDivElement> {
  //
}

const useRegisterSW2 = () => {
  // empty
}

export const ReloadPrompt = (props: ReloadPromptProps) => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      console.info(`Service worker at: ${swUrl}`)
    },
  })

  const handleClose = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  const handleUpdateServiceWorker = async () => {
    console.info('handleUpdateServiceWorker')
    await updateServiceWorker()
    handleClose()
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
