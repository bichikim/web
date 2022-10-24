import {useEvent} from '@winter-love/use'
import {computed, ref} from 'vue'

export const usePointerDown = (element: HTMLElement) => {
  const mousedown = ref(false)
  useEvent(element, 'pointerdown', () => {
    mousedown.value = true
  })

  useEvent(element, 'pointerup', () => {
    mousedown.value = false
  })

  return computed(() => mousedown.value)
}
