import {useElementEvent} from 'src/element-event'
import {onMounted} from 'vue-demi'
import {isSSR} from '@winter-love/utils'

export type OnDomMountedHandle = () => void

export const onDomMounted = (handle: OnDomMountedHandle) => {
  if (isSSR()) {
    return
  }

  const {active, inactive} = useElementEvent(window, 'load', () => {
    handle()
    inactive()
  }, {
    immediate: false,
  })

  onMounted(() => {
    const isReady = document.readyState === 'complete'
    if (isReady) {
      handle()
      return
    }

    active()
  })
}
