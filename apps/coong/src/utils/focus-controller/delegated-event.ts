import {getDocument} from './get-document'

export type DelegatedEventMap = Map<string, Set<(value: any) => void>>

export const createDelegatedEvent = (eventName: string) => {
  const delegatedEventMap: DelegatedEventMap = new Map()

  const listener = (event: Event) => {
    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    const _event = event as CustomEvent<{key: string; value: any}>
    const {key, value} = _event.detail
    const listeners = delegatedEventMap.get(key)

    if (listeners) {
      for (const listener of listeners) {
        listener(value)
      }
    }
  }

  getDocument()?.addEventListener(eventName, listener)

  const unsubscribe = () => {
    getDocument()?.removeEventListener(eventName, listener)
    delegatedEventMap.clear()
  }

  return {delegatedEventMap, unsubscribe}
}

export const delegatedEmit = (eventName: string, key: string) => {
  return (value: any) => {
    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    const customEvent = new CustomEvent(eventName, {detail: {key, value}})

    document.dispatchEvent(customEvent)
  }
}

export const delegatedOn = (delegatedEventMap: DelegatedEventMap, key: string, listener: (value: any) => void) => {
  const listeners = delegatedEventMap.get(key) ?? new Set()

  listeners.add(listener)
  delegatedEventMap.set(key, listeners)

  const unsubscribe = () => {
    delegatedEventMap.delete(key)
  }

  return unsubscribe
}
