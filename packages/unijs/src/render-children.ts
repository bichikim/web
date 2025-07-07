import {effect, signal, untrack} from './signal'
import type {Children} from './types'

export interface RenderOptions {
  onMount: (element: HTMLElement) => void
  onUnmount: () => void
}

interface EffectResult {
  childElement: HTMLElement | Text | null
  key: string | null
  teardown: (() => void) | null
}

const renderChild = (child: Children, maxDepth: number = 2) => {
  // todo 자식이 자기 자리를 지켜야 함
  // 리스트 렌더링에서 위치 변경 등에 최적화 되어야 한다
  if (maxDepth === 0) {
    return {
      childElement: null,
      key: null,
      teardown: null,
    }
  }

  const currentResult: EffectResult = {
    childElement: null,
    key: null,
    teardown: null,
  }
  const result = typeof child === 'function' ? child() : child

  if (Array.isArray(result)) {
    const [childElement, teardown, key] = result

    currentResult.childElement = childElement
    currentResult.teardown = teardown
    currentResult.key = key
  } else if (result === null) {
    currentResult.childElement = null
    currentResult.teardown = null
  } else if (typeof result === 'function') {
    return renderChild(result, maxDepth - 1)
  } else {
    const childElement = document.createTextNode(String(result))

    currentResult.childElement = childElement
    currentResult.teardown = null
  }

  return currentResult
}

export const renderChildren = (
  element: HTMLElement,
  children: Children[],
  options: RenderOptions,
): [HTMLElement, teardown: () => void, key: string | null] => {
  const {onMount, onUnmount} = options
  const isChildrenChangedSignal = signal(true)

  for (const child of children) {
    effect((prevValue?: EffectResult) => {
      const {childElement: prevChildElement, teardown: prevTeardown} = prevValue ?? {}
      const currentResult: EffectResult = renderChild(child)

      untrack(() => {
        const {childElement: currentChildElement} = currentResult

        if (prevTeardown) {
          prevTeardown()
        }

        if (prevChildElement && currentChildElement) {
          prevChildElement.replaceWith(currentChildElement)
          // skip
        } else if (currentChildElement) {
          element.append(currentChildElement)
        } else if (prevChildElement) {
          prevChildElement.remove()
        }
      })

      return currentResult
    })
  }

  // element.append(fragment)
  // append 호 mount 를 호출 합니다
  // todo next tick 으로 실행 해야하나?
  onMount(element)

  return [element, onUnmount, null]
}

export const render = (element: HTMLElement, children: Children[], options: Partial<RenderOptions> = {}) => {
  return renderChildren(element, children, {
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
