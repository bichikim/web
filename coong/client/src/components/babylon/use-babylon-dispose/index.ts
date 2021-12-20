import {onBeforeUnmount, Ref} from 'vue'

export const useBabylonDispose = (target: Ref<any>) => {
  onBeforeUnmount(() => {
    const targetValue = target.value
    if (targetValue && typeof targetValue.dispose === 'function') {
      targetValue.dispose()
    }
  })
}
