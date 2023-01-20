import {isSSR} from '@winter-love/utils'
import {getComponentElement} from 'src/utils/get-component-element'
import {resolveRef} from 'src/refs/resolve-ref'
import {MaybeRef} from 'src/types'
import {ComponentPublicInstance, computed, onBeforeUnmount, watch} from 'vue'

const defaultThreshold = 0.05

/**
 * 엘리먼트가 화면랜더링 영역에 들어오거나 나가면 callback 을 호출 합니다
 * @param element
 * @param callback
 * @param options
 */
export const onElementIntersection = (
  element: MaybeRef<ComponentPublicInstance | HTMLElement | undefined>,
  callback?: IntersectionObserverCallback,
  options: MaybeRef<IntersectionObserverInit> = {},
) => {
  // skip in ssr environment
  if (isSSR()) {
    return
  }

  const elementRef = resolveRef(element)
  const optionsRef = resolveRef(options)

  const updateState: IntersectionObserverCallback = (entries, observer) => {
    callback?.(entries, observer)
  }

  const observerRef = computed(() => {
    return new IntersectionObserver(updateState, {
      threshold: defaultThreshold,
      ...optionsRef.value,
    })
  })

  watch([observerRef, elementRef], ([observer, element], [oldObserver]) => {
    oldObserver.disconnect()
    const _element = getComponentElement(element)
    if (_element) {
      // using any owing to typescript bug
      observer.observe(_element as any)
    }
  })

  onBeforeUnmount(() => {
    observerRef.value.disconnect()
  })
}
