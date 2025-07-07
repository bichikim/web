import {getEventPropName} from './get-event-prop-name'
import {effect, isSignal} from './signal'

export interface SpecialProps {
  onMount?: (element: Element) => void
  onUnmount?: (element: Element) => void
  ref?: (element: Element) => void
}

export interface CreateElementResult extends SpecialProps {
  element: HTMLElement
  teardownEventMap: Map<string, (event: Event) => void>
}

const toStringStyle = (style: Record<string, any> | string) => {
  if (typeof style === 'string') {
    return style
  }

  let result = ''

  for (const [key, value] of Object.entries(style)) {
    result += `${key}: ${value};`
  }

  return result
}

export const createElement = (tag: string, props: Record<string, any>): CreateElementResult => {
  const teardownEventMap: Map<string, (event: Event) => void> = new Map()
  const element = document.createElement(tag)
  let ref: ((element: Element) => void) | undefined
  const specialProps: SpecialProps = {}

  for (const propKey of Object.keys(props)) {
    const prop = props[propKey]
    const eventName = getEventPropName(propKey)

    if (isSignal(prop)) {
      effect(() => {
        const propValue = prop()

        if (propKey === 'style') {
          element.setAttribute(propKey, toStringStyle(propValue))
        } else {
          element.setAttribute(propKey, propValue)
        }
      })
    } else if (eventName) {
      element.addEventListener(eventName, prop)
      teardownEventMap.set(eventName, prop)
    } else {
      switch (propKey) {
        case 'ref': {
          specialProps.ref = prop
          break
        }

        case 'onMount': {
          specialProps.onMount = prop
          break
        }

        case 'onUnmount': {
          specialProps.onUnmount = prop
          break
        }

        default: {
          element.setAttribute(propKey, prop)
        }
      }
    }
  }

  return {
    ...specialProps,
    element,
    teardownEventMap,
  }
}
