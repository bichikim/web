import {onIntersection} from 'src/hooks/intersection'
import {resolveRef} from 'src/refs'
import {MaybeRef} from 'src/types'
import {ComponentPublicInstance, computed, ref, Ref, toRef} from 'vue'

const DEFAULT_THRESHOLD = 0.05

export interface UseElementIntersectionOptions extends IntersectionObserverInit {
  /**
   * @default true
   * 최초 show 후 hide 할지 여부
   */
  hide?: boolean

  initState?: boolean
  threshold?: number
}

/**
 * 엘리먼트가 화면 랜더링 영역 안에 있을 경우 true 아니면 false
 * @param element
 * @param options
 */
export const useIntersectionRef = (
  element: MaybeRef<HTMLElement | ComponentPublicInstance | undefined | null>,
  options: UseElementIntersectionOptions = {},
): Ref<boolean> => {
  const {initState = false} = options
  const hideRef = toRef(options, 'hide', true)
  const elementRef = resolveRef(element)
  const thresholdRef = toRef(options, 'threshold', DEFAULT_THRESHOLD)

  const shownRef = ref(initState)

  // hide 로 다시 바뀔일 없으면 더 이상 옵져빙이 필요 없다
  // 최적화 코드
  const observingElementRef = computed(() => {
    const hide = hideRef.value
    const element = elementRef.value
    const show = shownRef.value
    if (hide) {
      return elementRef.value
    }

    if (show) {
      return null
    }
    return element
  })

  onIntersection(
    observingElementRef,
    (entries) => {
      const hide = hideRef.value
      const threshold = thresholdRef.value
      if (hide) {
        const shouldClose = entries.some((entry) => {
          return entry.intersectionRatio < threshold
        })

        if (shouldClose) {
          shownRef.value = false
          return
        }
      }

      const shouldShow = entries.some((entry) => {
        return entry.intersectionRatio >= threshold
      })

      if (shouldShow) {
        shownRef.value = true
      }
    },
    options,
  )

  return shownRef
}
