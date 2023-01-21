import {isSSR} from '@winter-love/utils'
import {onEvent} from 'src/hooks/event'
import {onMounted} from 'vue'

export type OnDomMountedHandle = () => void

export const onDomMounted = (handle: OnDomMountedHandle) => {
  if (isSSR()) {
    return
  }

  const isActive = onEvent(
    window,
    'load',
    () => {
      handle()
      isActive.value = false
    },
    false,
  )

  onMounted(() => {
    const isReady = document.readyState === 'complete'
    if (isReady) {
      handle()
      return
    }

    isActive.value = true
  })
}