import {getEventPropName} from './get-event-prop-name'
import {effect, isSignal} from './signal'
import {UniElement, UniText} from './types'

export interface SpecialProps {
  key: string | null
  onMount?: (element: UniElement) => void
  ref?: (element: UniElement) => void
}

export interface ElementItem extends SpecialProps {
  element: UniElement
  onUnmount: (element: UniElement) => void
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

export const createElementItem = (tag: string, props: Record<string, any>): ElementItem => {
  const teardownEventMap: Map<string, (event: Event) => void> = new Map()
  const element = document.createElement(tag)
  let ref: ((element: Element) => void) | undefined

  const specialProps: SpecialProps = {
    key: props.key ?? null,
  }

  const onUnmount = () => {
    for (const [propKey, listener] of teardownEventMap.entries()) {
      element.removeEventListener(propKey, listener)
    }

    props.onUnmount?.(element)
  }

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

        case 'key': {
          specialProps.key = prop
          break
        }

        case 'onUnmount': {
          // skip
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
    onUnmount,
  }
}
