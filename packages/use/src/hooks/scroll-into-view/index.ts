import {scrollIntoView, StandardBehaviorOptions} from '@winter-love/utils'
import {resolveRef} from 'src/refs'
import {MaybeRef} from 'src/types'

export const useScrollIntoView = (element: MaybeRef<HTMLElement | null | undefined>) => {
  const elementRef = resolveRef(element)
  return (options?: StandardBehaviorOptions) => {
    const element = elementRef.value
    if (element) {
      scrollIntoView(element, options)
    }
  }
}
