import {useElementEvent} from 'src/element-event'
import {onMounted} from 'vue-demi'
import {isSSR} from '@winter-love/utils'

export type OnMountedAndDomLoadedHook = () => void

export const onDomMounted = (handler: OnMountedAndDomLoadedHook) => {
  if (isSSR()) {
    return
  }

  const {active, inactive} = useElementEvent(window, 'load', () => {
    handler()
    inactive()
  }, {
    immediate: false,
  })

  onMounted(() => {
    const isReady = document.readyState === 'complete'
    if (isReady) {
      handler()
      return
    }

    active()
  })
}
