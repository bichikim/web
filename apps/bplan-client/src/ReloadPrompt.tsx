import {useRegisterSW} from 'virtual:pwa-register/solid'
import {createSignal, JSX, Show} from 'solid-js'
import {preventGlobalTouchAttrs} from 'src/components/real-button/use-global-touch'

export interface ReloadPromptProps extends JSX.HTMLAttributes<HTMLDivElement> {
  //
}

export const ReloadPrompt = (props: ReloadPromptProps) => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl) {
      console.info(`Service worker at: ${swUrl}`)
    },
  })
  const handleClose = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return (
    <Show when={offlineReady() || needRefresh()}>
      <div {...props} {...preventGlobalTouchAttrs()}>
        <Show when={offlineReady()}>
          <div class="flex flex-col gap-2">
            <span>App ready to work offline</span>
            <button class="" onClick={handleClose}>
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
                onClick={() => updateServiceWorker(true)}
              >
                Reload
              </button>
              <button class="b-0 cusor-pointer rd-1 px-2 py-1" onClick={handleClose}>
                Skip
              </button>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  )
}
