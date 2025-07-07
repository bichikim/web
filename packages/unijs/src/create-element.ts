import {getEventPropName} from './get-event-prop-name'
import {effect, isSignal} from './signal'

export interface SpecialProps {
  onMount?: (element: HTMLElement) => void
  onUnmount?: (element: HTMLElement) => void
  ref?: (element: HTMLElement) => void
}

export interface CreateElementResult extends SpecialProps {
  element: HTMLElement
  teardownEventMap: Map<string, (event: Event) => void>
}

export const createElement = (tag: string, props: Record<string, any>): CreateElementResult => {
  const teardownEventMap: Map<string, (event: Event) => void> = new Map()
  const element = document.createElement(tag)
  let ref: ((element: HTMLElement) => void) | undefined
  const specialProps: SpecialProps = {}

  for (const propKey of Object.keys(props)) {
    const prop = props[propKey]
    const eventName = getEventPropName(propKey)

    if (isSignal(prop)) {
      effect(() => {
        element.setAttribute(propKey, prop())
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
