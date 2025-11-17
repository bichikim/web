import {getDocument} from '@winter-love/utils'

export type DelegatedPayload = {
  delegatedListener: (value: any) => void
  keyMap: Map<string, Set<(value: any) => void>>
  unsubscribe: () => void
}

export type DelegatedEventMap = Map<string, DelegatedPayload>

const createNewDelegatedPayload = (
  channel: string,
  eventNamePrefix: string = DEFAULT_CHANNEL_PREFIX,
): DelegatedPayload => {
  const keyMap = new Map()
  const eventName = createChannelEventName(eventNamePrefix)(channel)

  const delegatedListener = (event: Event) => {
    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    const _event = event as CustomEvent<{key: string; value: any}>
    const {key, value} = _event.detail
    const listeners = keyMap.get(key) ?? new Set()

    if (listeners) {
      for (const listener of listeners) {
        listener(value)
      }
    }
  }

  getDocument()?.addEventListener(eventName, delegatedListener)

  const unsubscribe = () => {
    getDocument()?.removeEventListener(eventName, delegatedListener)
  }

  return {delegatedListener, keyMap, unsubscribe}
}

export const DEFAULT_CHANNEL_PREFIX = '$$channel__'

export const createChannelEventName = (prefix: string = DEFAULT_CHANNEL_PREFIX) => {
  return (channel: string) => {
    return `${prefix}${channel}`
  }
}

export const addListener = (
  delegatedEventMap: DelegatedEventMap,
  channel: string,
  key: string,
  listener: (value: any) => void,
  eventNamePrefix: string = DEFAULT_CHANNEL_PREFIX,
) => {
  const delegatedPayload = delegatedEventMap.get(channel) ?? createNewDelegatedPayload(channel, eventNamePrefix)

  delegatedEventMap.set(channel, delegatedPayload)

  const listeners = delegatedPayload.keyMap.get(key) ?? new Set()

  delegatedPayload.keyMap.set(key, listeners)
  listeners.add(listener)
}

export const removeListener = (
  delegatedEventMap: DelegatedEventMap,
  channel: string,
  key: string,
  listener: (value: any) => void,
): boolean => {
  const delegatedPayload = delegatedEventMap.get(channel)

  if (!delegatedPayload) {
    return false
  }

  const listeners = delegatedPayload.keyMap.get(key)

  if (!listeners) {
    return false
  }

  listeners.delete(listener)

  return true
}

export const createDelegatedEvent = () => {
  const delegatedEventMap: DelegatedEventMap = new Map()

  const unsubscribe = () => {
    for (const delegatedPayload of delegatedEventMap.values()) {
      delegatedPayload.unsubscribe()
    }

    delegatedEventMap.clear()
  }

  return {delegatedEventMap, unsubscribe}
}

export const delegatedEmit = (
  channel: string,
  key: string,
  value: any,
  eventNamePrefix: string = DEFAULT_CHANNEL_PREFIX,
) => {
  const eventName = createChannelEventName(eventNamePrefix)(channel)
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  const customEvent = new CustomEvent(eventName, {detail: {key, value}})

  getDocument()?.dispatchEvent(customEvent)
}

export const delegatedEmitHandler = (channel: string, key: string) => {
  return (value: any) => {
    delegatedEmit(channel, key, value)
  }
}

export const delegatedOn = (
  delegatedEventMap: DelegatedEventMap,
  channel: string,
  key: string,
  listener: (value: any) => void,
  eventNamePrefix: string = DEFAULT_CHANNEL_PREFIX,
) => {
  const _addListener = () => {
    addListener(delegatedEventMap, channel, key, listener, eventNamePrefix)
  }

  const unsubscribe = () => {
    removeListener(delegatedEventMap, channel, key, listener)
  }

  return {addListener: _addListener, unsubscribe}
}
