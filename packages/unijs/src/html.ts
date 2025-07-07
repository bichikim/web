import {effectScope} from './signal'
import {createElement} from './create-element'
import {renderChildren} from './render-children'
import {Children} from './types'

export const h = (tag: string, props: Record<string, any> = {}, children: Children[] = []): Children => {
  return () => {
    const [result, stopPropsEffect] = effectScope(() => {
      const {
        element: memoizedElement,
        teardownEventMap,
        ref,
        onMount: onMountProp,
        onUnmount: onUnmountProp,
      } = createElement(tag, props)

      const onUnmount = () => {
        // todo unmount 가 잘되는지 테스트 해야한다
        stopPropsEffect()

        for (const [propKey, listener] of teardownEventMap.entries()) {
          memoizedElement.removeEventListener(propKey, listener)
        }

        if (typeof onUnmountProp === 'function') {
          onUnmountProp(memoizedElement)
        }
      }

      const onMount = (element: HTMLElement) => {
        // mount 시점에 ref를 줍니다
        if (typeof ref === 'function') {
          ref(element)
        }

        if (typeof onMountProp === 'function') {
          onMountProp(memoizedElement)
        }
      }

      return renderChildren(memoizedElement, children, {onMount, onUnmount})
    })

    return result
  }
}
