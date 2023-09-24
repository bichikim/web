import {getWindow} from '@winter-love/utils'
import {resolveRef} from 'src/refs/resolve-ref'
import {getComponentElement} from 'src/rendering-utils/get-component-element'
import {MaybeRef} from 'src/types'
import {ComponentPublicInstance, computed, ref, watchEffect} from 'vue'

const DEFAULT_THRESHOLD = 0.05

/**
 * 엘리먼트가 화면랜더링 영역에 들어오거나 나가면 callback 을 호출 합니다
 * @param element
 * @param callback
 * @param options
 */
export const onIntersection = (
  element: MaybeRef<ComponentPublicInstance | HTMLElement | undefined | null>,
  callback?: IntersectionObserverCallback,
  options: IntersectionObserverInit = {},
) => {
  // skip in ssr environment
  if (!getWindow()) {
    return
  }
  const optionsRef = ref(options)
  const elementRef = resolveRef(element)

  const updateState: IntersectionObserverCallback = (entries, observer) => {
    callback?.(entries, observer)
  }

  const observerRef = computed(() => {
    // for node.js env
    if (!globalThis.IntersectionObserver) {
      return
    }
    return new IntersectionObserver(updateState, {
      // todo fix type error
      threshold: DEFAULT_THRESHOLD,
      ...optionsRef.value,
    } as any)
  })

  watchEffect(
    (onCleanup) => {
      const observer = observerRef.value
      if (!observer) {
        return
      }
      onCleanup(() => {
        observer.disconnect()
      })
      const element = getComponentElement(elementRef.value)

      if (!element) {
        return
      }
      observer.observe(element as any)
    },
    {
      flush: 'post',
    },
  )
}
