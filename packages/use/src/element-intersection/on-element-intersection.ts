import {isSSR} from '@winter-love/utils'
import {wrapRef} from 'src/wrap-ref'
import {MayRef, PossibleElement} from 'src/types'
import {onBeforeUnmount, ref, watch} from 'vue-demi'
import {pickElement} from '../pick-element'

const defaultThreshold = 0.05

export const onElementIntersection = <MyElement extends PossibleElement> (
  element: MayRef<MyElement | undefined>,
  handle?: IntersectionObserverCallback,
  options: IntersectionObserverInit = {},
) => {
  if (isSSR()) {
    return
  }

  const elementRef = wrapRef(element)

  const updateState: IntersectionObserverCallback = (entries, observer) => {
    handle?.(entries, observer)
  }

  const observerRef = ref<IntersectionObserver>(new IntersectionObserver(updateState, {
    threshold: defaultThreshold,
    ...options,
  }))

  watch(elementRef, (element) => {
    observerRef.value.disconnect()
    const _element = pickElement(element)
    if (_element) {
      // using any owing to typescript bug
      observerRef.value.observe(_element as any)
    }
  })

  onBeforeUnmount(() => {
    observerRef.value.disconnect()
  })
}

/**
 * @deprecated please use onElementIntersection
 */
export const onIntersectionElement = onElementIntersection
