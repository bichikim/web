import {effectScope, Signal, effect, ArraySignal, ItemSignal} from './signal'
import {createElementItem, ElementItem} from './create-element'
import {renderChildren} from './render-children'
import {Children, Child, UniFragment} from './types'
import {createOnce} from './once'
import { createChild } from './create-child'

export const h = (tag: string, props: Record<string, any> = {}, children: Children[] = []): (cache?: Child) => Child => {
  const {key} = props

  return createOnce((cache?: Child) => {
    if (cache) {
      return cache
    }

    const [result, stopPropsEffect] = effectScope(() => {
      const {
        element: memoizedElement,
        ref,
        onMount: onMountProp,
        onUnmount: onUnmountProp,
        key,
      } = createElementItem(tag, props)

      const onUnmount = () => {
        // todo unmount 가 잘되는지 테스트 해야한다
        stopPropsEffect()

        if (typeof onUnmountProp === 'function') {
          onUnmountProp(memoizedElement)
        }
      }

      const onMount = (element: Element) => {
        // mount 시점에 ref를 줍니다
        if (typeof ref === 'function') {
          ref(element)
        }

        if (typeof onMountProp === 'function') {
          onMountProp(memoizedElement)
        }
      }

      return renderChildren(memoizedElement, children, {key, onMount, onUnmount})
    })

    return result
  })
}

export const Fragment = (children: Child[]): (cache?: Map<any, Child>) => Child => {
  return createOnce((cache?: Child) => {
    if (cache) {
      return cache
    }

    const [result, stopPropsEffect] = effectScope(() => {
      const fragment = document.createDocumentFragment()

      return renderChildren(fragment, children, {key: null, onMount: () => {}, onUnmount: () => {}})
    })

    return result
  })
}

export const For = <T>(props: {of: ArraySignal<T>}, children: Children[]) => {
  return createOnce((cache?: Child) => {
    if (cache) {
      return cache
    }

    const [result, stopPropsEffect] = effectScope(() => {
      const fragment: UniFragment = document.createDocumentFragment()
      const {of} = props

      effect((prevValue?: ItemSignal<T>[]) => {
        const value = of()

        for (let index = 0; index < value.length; index += 1) {
          const item = value[index]
          const prevItem = prevValue?.[index]

          if(prevItem?.signal !== item.signal) {
            console.log('update', index, item)
          }
        }

        return value
      })

      return fragment
    })


  return createChild(result, null)
  })
}
