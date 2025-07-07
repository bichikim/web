import {effect, signal, untrack} from './signal'
import type {Children} from './types'
import {Child, createChild, isChild} from './create-child'

export interface RenderOptions {
  key: string | null
  onMount: (element: Element) => void
  onUnmount: () => void
}

interface EffectResult {
  childElement: Element | Text | null
  key: string | null
  teardown: (() => void) | null
}

const renderChild = (child: Children, maxDepth: number = 2): EffectResult[] => {
  // todo 자식이 자기 자리를 지켜야 함
  // 리스트 렌더링에서 위치 변경 등에 최적화 되어야 한다
  if (maxDepth === 0) {
    return [
      {
        childElement: null,
        key: null,
        teardown: null,
      },
    ]
  }

  const currentResult: EffectResult = {
    childElement: null,
    key: null,
    teardown: null,
  }
  const result = typeof child === 'function' ? child() : child

  if (isChild(result)) {
    const {element: childElement, teardown, key} = result

    currentResult.childElement = childElement
    currentResult.teardown = teardown
    currentResult.key = key
  } else if (Array.isArray(result)) {
    return result.flatMap((child) => renderChild(child, maxDepth - 1))
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

  return [currentResult]
}

export const renderChildren = (element: Element, children: Children[], options: RenderOptions): Child => {
  const {onMount, onUnmount, key} = options

  for (const child of children) {
    effect((prevValue: EffectResult[] = []) => {
      const currentResult: EffectResult[] = renderChild(child)

      console.log('currentResult', currentResult)
      console.log('prevValue', prevValue)

      untrack(() => {
        for (const [index, {childElement: currentChildElement, teardown: currentTeardown}] of currentResult.entries()) {
          const {childElement: prevChildElement, teardown: prevTeardown} = prevValue[index] ?? {}

          const teardown = () => {
            if (prevTeardown) {
              prevTeardown()
            }
          }

          if (prevChildElement && currentChildElement && prevChildElement !== currentChildElement) {
            teardown()
            prevChildElement.replaceWith(currentChildElement)
            // skip
          } else if (currentChildElement) {
            teardown()
            element.append(currentChildElement)
          } else if (prevChildElement) {
            teardown()
            prevChildElement.remove()
          }
        }
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
