import {MaybeRef, useEvent} from '@winter-love/use'
import {readonly, ref} from 'vue'

export interface UseEventDownOptions<KeyMap> {
  /**
   * @default pointerdown
   */
  down?: KeyMap
  /**
   * @default pointerup
   */
  up?: KeyMap
}
export function useEventDown(
  element: MaybeRef<Window | undefined | null>,
  options?: UseEventDownOptions<keyof WindowEventMap>,
)
export function useEventDown(
  element: MaybeRef<HTMLElement>,
  options?: UseEventDownOptions<keyof HTMLElementEventMap>,
)
export function useEventDown(element: MaybeRef<any>, options: UseEventDownOptions<any> = {}) {
  const {down = 'pointerdown', up = 'pointerup'} = options
  const downState = ref(false)
  useEvent(element, down, () => {
    downState.value = true
  })
  useEvent(element, up, () => {
    downState.value = false
  })

  return readonly(downState)
}
