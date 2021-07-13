import {useElementEvent} from 'src/element-event'
import {onMounted} from 'vue-demi'
import {isSSR} from '@winter-love/utils'

export type OnDomMountedHandle = () => void

export const onDomMounted = (handle: OnDomMountedHandle) => {
  if (isSSR()) {
    return
  }

  const isActive = useElementEvent(window, 'load', () => {
    handle()
    isActive.value = false
  }, false)

  onMounted(() => {
    const isReady = document.readyState === 'complete'
    if (isReady) {
      handle()
      return
    }

    isActive.value = true
  })
}
