import {useRegisterSW} from 'virtual:pwa-register/solid'
import {JSX, Show} from 'solid-js'

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
      <div {...props}>
        <Show when={offlineReady()}>
          <div>
            <span>App ready to work offline</span>
            <button class="" onClick={handleClose}>
              OK
            </button>
          </div>
        </Show>
        <Show when={needRefresh()}>
          <div>
            <span>App Updated Please Click Reload to use the updated App</span>
            <button class="" onClick={() => updateServiceWorker(true)}>
              Reload
            </button>
            <button class="" onClick={handleClose}>
              Skip
            </button>
          </div>
        </Show>
      </div>
    </Show>
  )
}
