import {MayRef} from 'src/types'
import {ref} from 'vue-demi'
import {onElementIntersection} from './on-element-intersection'

const defaultThreshold = 0.05

export interface UseElementIntersectionOptions extends IntersectionObserverInit {
  /**
   * @default true
   * 최초 show 후 hide 할지 여부
   */
  hide?: boolean
}

export const useElementIntersection = <MyElement extends Element>(
  element: MayRef<MyElement | undefined>,
  options: UseElementIntersectionOptions = {},
) => {
  const {threshold = defaultThreshold, hide = true, ...rest} = options

  const showRef = ref(false)

  onElementIntersection(
    element,
    (entries) => {
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
    {
      ...rest,
      threshold,
    },
  )

  return showRef
}
