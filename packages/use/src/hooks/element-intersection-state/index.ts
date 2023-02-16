import {MaybeRef} from 'src/types'
import {ComponentPublicInstance, computed, Ref, ref} from 'vue'
import {onElementIntersection} from 'src/hooks/element-intersection'
import {resolveRef} from 'src/refs/resolve-ref'

const defaultThreshold = 0.05

export interface UseElementIntersectionOptions extends IntersectionObserverInit {
  /**
   * @default true
   * 최초 show 후 hide 할지 여부
   */
  hide?: boolean
}

/**
 * 엘리먼트가 화면 랜더링 영역 안에 있을 경우 true 아니면 false
 * @param element
 * @param options
 */
export const useElementIntersection = (
  element: MaybeRef<HTMLElement | ComponentPublicInstance | undefined>,
  options: MaybeRef<UseElementIntersectionOptions> = {},
): Ref<boolean> => {
  const optionsRef = resolveRef(options)

  const showRef = ref(false)

  const hideRef = computed(() => {
    return optionsRef.value.hide ?? true
  })

  const thresholdRef = computed(() => {
    return optionsRef.value.threshold ?? defaultThreshold
  })

  onElementIntersection(
    element,
    (entries) => {
      const hide = hideRef.value
      const threshold = thresholdRef.value
      if (hide) {
        const shouldClose = entries.some((entry) => {
          return entry.intersectionRatio < threshold
        })

        if (shouldClose) {
          showRef.value = false
          return
        }
      }

      const shouldShow = entries.some((entry) => {
        return entry.intersectionRatio >= threshold
      })

      if (shouldShow) {
        showRef.value = true
      }
    },
    optionsRef,
  )

  return showRef
}
