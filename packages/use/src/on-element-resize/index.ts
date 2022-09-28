import {Size} from '@winter-love/utils'
import {computed, onScopeDispose, Ref, watch} from 'vue'
import {MaybeRef} from 'src/types'
import {resolveRef} from 'src/resolve-ref'
import {isElement} from 'src/is-element'

/**
 * 지정된 엘리먼트의 사이즈가 바뀌면 크기를 callback 호출 합니다
 * @param element
 * @param callback
 * @param isActive
 */
export const onElementResize = (
  element?: MaybeRef<Element | undefined>,
  callback?: (size: Size) => any | null | undefined,
  isActive: MaybeRef<boolean> = true,
) => {
  const elementRef = resolveRef(element)
  const observerRef = computed(() => {
    return new ResizeObserver((entries: ResizeObserverEntry[]) => {
      if (entries.length === 0) {
        return
      }
      const {width, height} = entries[0].contentRect
      callback?.({height, width})
    })
  })
  const isActiveRef = resolveRef(isActive)

  watch(
    [observerRef, elementRef, isActiveRef],
    ([observer, element, isActive], [oldObserver]) => {
      oldObserver?.disconnect()
      if (isElement(element) && isActive) {
        observer.observe(element)
      }
    },
    {flush: 'post', immediate: true},
  )

  onScopeDispose(() => {
    observerRef.value?.disconnect()
  })
}
