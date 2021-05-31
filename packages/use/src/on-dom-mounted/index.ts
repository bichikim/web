import {useElementEvent} from 'src/element-event'
import {onMounted} from 'vue-demi'

export type OnMountedAndDomLoadedHook = () => void

export const onDomMounted = (hook: OnMountedAndDomLoadedHook) => {
  const {active, inactive} = useElementEvent(window, 'load', () => {
    hook()
    inactive()
  }, {
    immediate: false,
  })

  onMounted(() => {
    const isReady = document.readyState === 'complete'
    if (isReady) {
      hook()
      return
    }

    active()
  })
}
