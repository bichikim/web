import {effect, untrack, isSignal} from './signal'
import type {Child, Children, UniElement, UniText, UniExtend, UniFragment} from './types'
import {createChild, isChild} from './create-child'

export interface RenderOptions {
  key: string | null
  onMount: (element: Element) => void
  onUnmount: () => void
}

type CompareReference = Record<string, any> | ((...args: any) => any) | null

const renderChild = (
  child: Children,
  parentElement: UniElement | UniText | UniFragment,
  maxDepth: number = 2,
): Child => {
  // todo 자식이 자기 자리를 지켜야 함
  // 리스트 렌더링에서 위치 변경 등에 최적화 되어야 한다
  if (maxDepth === 0) {
    return createChild(null, child)
  }

  const currentResult: Child = {
    element: null,
    key: null,
  }

  const cache = parentElement.cacheChild

  const result = isSignal(child) ? child() : typeof child === 'function' ? child(cache) : child

  if (isChild(result)) {
    const {element: childElement, onUnmount, key} = result

    currentResult.element = childElement
    currentResult.key = key
    currentResult.onUnmount = onUnmount
  } else if (Array.isArray(result)) {
    console.log('$$ array', result)
  } else if (result === null) {
    currentResult.element = null
  } else {
    const childElement = document.createTextNode(String(result))

    currentResult.element = childElement
    currentResult.key = child
  }

  parentElement.cacheChild = cache
  console.log('currentResult', currentResult)

  return currentResult
}

const existRun = (prevTeardown?: (() => void) | null) => {
  if (prevTeardown) {
    prevTeardown()
  }
}

export function renderChildren(fragment: UniFragment, children: Child[], options: RenderOptions): Child
export function renderChildren(fragment: UniElement, children: Children[], options: RenderOptions): Child

export function renderChildren(element: any, children: any[], options: RenderOptions): Child {
  const {onMount, onUnmount, key} = options

  for (const child of children) {
    effect((prevValue?: Child) => {
      const currentResult: Child = renderChild(child, element)

      untrack(() => {
        const {element: currentChildElement, onUnmount: currentOnUnmount} = currentResult
        const {element: prevChildElement, onUnmount: prevOnUnmount} = prevValue ?? {}

        if (prevChildElement && currentChildElement && prevChildElement !== currentChildElement) {
          existRun(prevOnUnmount)
          console.log('replaceWith', key, prevChildElement, currentChildElement)

          if ('replaceWith' in prevChildElement) {
            prevChildElement.replaceWith(currentChildElement)
          } else {
            element.removeChild(prevChildElement)
            element.appendChild(currentChildElement)
          }
          // skip
        } else if (!prevChildElement && currentChildElement) {
          existRun(prevOnUnmount)
          console.log('append', element, prevChildElement, currentChildElement)
          element.append(currentChildElement)
        } else if (prevChildElement && !currentChildElement) {
          existRun(prevOnUnmount)
          console.log('remove', key, prevChildElement)
          element.removeChild(prevChildElement)
        }

        // for (const [key, {element: prevChildElement, onUnmount: prevOnUnmount}] of prevValue.entries()) {
        //   existRun(prevOnUnmount)
        //   console.log('remove left logic', prevChildElement)
        //   if (prevChildElement) {
        //     element.removeChild(prevChildElement)
        //   }
        // }
      })

      return currentResult
    })
  }

  // element.append(fragment)
  // append 호 mount 를 호출 합니다
  // todo next tick 으로 실행 해야하나?
  onMount(element)

  return createChild(element, key, onUnmount)
}

export const render = (element: Element, children: Children[], options: Partial<RenderOptions> = {}) => {
  return renderChildren(element, children, {
    key: null,
    onMount:
      options.onMount ??
      (() => {
        // skip
      }),
    onUnmount:
      options.onUnmount ??
      (() => {
        // skip
      }),
  })
}
