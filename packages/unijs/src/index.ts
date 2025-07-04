import {compare, effect, effectScope, isSignal, teardown} from './signal'
import {getEventPropName} from './get-event-prop-name'

type ComponentShape = (props: any) => any

const endTagRegex = /<\/[-a-zA-Z0-9]+>$/u

/**
 * null: should not render
 * [HTMLElement, teardown: () => void, key: string | null]: should render
 * [Children]: should call children
 */
type Children = () => [HTMLElement, teardown: () => void, key: string | null] | Children | null

const createElement = (
  tag: string,
  props: Record<string, any>,
): [HTMLElement, Map<string, (event: Event) => void>, ((element: HTMLElement) => void) | undefined] => {
  const teardownEventMap: Map<string, (event: Event) => void> = new Map()
  const element = document.createElement(tag)
  let ref: ((element: HTMLElement) => void) | undefined

  for (const propKey of Object.keys(props)) {
    const prop = props[propKey]
    const eventName = getEventPropName(propKey)

    if (isSignal(prop)) {
      effect(() => {
        element.setAttribute(propKey, prop())
      })
    } else if (eventName) {
      element.addEventListener(propKey, prop)
      teardownEventMap.set(propKey, prop)
    } else if (propKey === 'ref') {
      ref = prop
    } else {
      element.setAttribute(propKey, prop)
    }
  }

  return [element, teardownEventMap, ref]
}

export interface RenderOptions {
  onMount: (element: HTMLElement) => void
  onUnmount: () => void
}

export const render = (element: HTMLElement, children: Children[], options: Partial<RenderOptions>) => {
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

export const renderChildren = (
  element: HTMLElement,
  children: Children[],
  options: RenderOptions,
): [HTMLElement, teardown: () => void, key: string | null] => {
  const {onMount, onUnmount} = options
  const fragment = document.createDocumentFragment()

  for (const child of children) {
    effect(() => {
      let currentChildElement: HTMLElement | null = null
      const result = child()

      if (Array.isArray(result)) {
        const [childElement, teardown, key] = result

        fragment.append(childElement)
        currentChildElement = childElement
      } else if (typeof result === 'function') {
        const _nextResult = result()

        if (Array.isArray(_nextResult)) {
          const [childElement, teardown, key] = _nextResult

          fragment.append(childElement)
          currentChildElement = childElement
        }
        // skip double child return
      }

      compare((prevChildElement) => {
        if (prevChildElement !== currentChildElement) {
          prevChildElement?.remove()
        }
      })

      return currentChildElement
    })
  }

  element.append(fragment)
  // append 호 mount 를 호출 합니다
  // todo next tick 으로 실행 해야하나?
  onMount(element)

  return [element, onUnmount, null]
}

export const h = (tag: string, props: Record<string, any>, children: Children[]): Children => {
  const [[memoizedElement, teardownEventMap, ref], stopPropsEffect] = effectScope(() => createElement(tag, props))

  const onUnmount = () => {
    stopPropsEffect()

    for (const [propKey, teardown] of teardownEventMap.entries()) {
      memoizedElement.removeEventListener(propKey, teardown)
    }
  }

  const onMount = (element: HTMLElement) => {
    // mount 시점에 ref를 줍니다
    if (typeof ref === 'function') {
      ref(element)
    }
  }

  return () => {
    return renderChildren(memoizedElement, children, {onMount, onUnmount})
  }
}

const createComponent = (shape: ComponentShape) => {
  return (props: any) => {
    return shape(props)
  }
}
