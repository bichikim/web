import {onEvent} from 'src/hooks/event'
import {resolveRef} from 'src/refs/resolve-ref'
import {MaybeRef} from 'src/types'
import {ref} from 'vue'

const isFocused = (element?: HTMLElement | undefined | null) => {
  if (!element) {
    return false
  }

  return element === globalThis.document?.activeElement
}

export const useElementFocus = (element?: MaybeRef<HTMLElement | undefined | null>) => {
  const elementRef = resolveRef(element)
  const focusedRef = ref(isFocused(elementRef.value))

  onEvent(element, 'focus', () => {
    focusedRef.value = true
  })

  onEvent(element, 'blur', () => {
    focusedRef.value = false
  })

  return focusedRef
}
