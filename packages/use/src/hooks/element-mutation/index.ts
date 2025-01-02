import {watchEffect} from 'vue'
import {MaybeRef} from 'src/types'
import {resolveRef} from 'src/refs/resolve-ref'

export const onElementMutation = (
  element: MaybeRef<HTMLElement | undefined>,
  callback: (record: MutationRecord[], observer: MutationObserver) => any,
  options?: MaybeRef<MutationObserverInit>,
) => {
  const elementRef = resolveRef(element)
  const optionsRef = resolveRef(options)
  const mutated = (record: MutationRecord[], observer: MutationObserver) => {
    return callback(record, observer)
  }
  const observer = new MutationObserver(mutated)

  watchEffect((cleanup) => {
    const element = elementRef.value
    const options = optionsRef.value

    if (!element) {
      return
    }

    observer.observe(elementRef.value as any, {attributes: true, ...options})
    cleanup(() => {
      observer.disconnect()
    })
  })
}
