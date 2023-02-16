import {scrollIntoView, StandardBehaviorOptions} from 'src/_imports/utils'
import {MaybeElement, MaybeRef} from 'src/types'
import {resolveElementRef} from 'src/refs'
export const useScrollIntoView = (element: MaybeRef<MaybeElement>) => {
  const elementRef = resolveElementRef(element)
  return (options?: StandardBehaviorOptions | boolean) => {
    const element = elementRef.value
    if (element) {
      scrollIntoView(element, options)
    }
  }
}
