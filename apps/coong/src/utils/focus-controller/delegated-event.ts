// oxlint-disable max-params
import {getDocument} from '@winter-love/utils'

export const NONE_CUSTOM_EVENT_KEY = 'none-custom-event-key'

/**
 * The payload of delegated event.
 */
export type DelegatedEventPayload = {
  /**
   * The listener function for the delegated event.
   * @param value - The value of the delegated event.
   */
  delegatedListener: (value: any) => void
  /**
   * The map of key and listeners.
   * The map that stores all listener functions registered for a specific key.
   */
  keyMap: Map<string, Set<(value: any) => void>>
  /**
   * The function to unsubscribe the delegated event listener.
   */
  unsubscribe: () => void
}

/**
 * The map of DelegatedPayload.
 */
export type DelegatedEventMap = Map<string, DelegatedEventPayload>

const createNewDelegatedPayload = (
  eventName: string,
  target: () => any = getDocument,
): DelegatedEventPayload => {
  const keyMap = new Map()

  const delegatedListener = (event: Event) => {
    const _event = event as any
    const {detail} = _event
    const isCustomEvent = typeof detail === 'object' && detail !== null
    const key = isCustomEvent ? _event.detail?.key : NONE_CUSTOM_EVENT_KEY
    const value = isCustomEvent ? _event.detail?.value : _event
    const listeners = keyMap.get(key) ?? new Set()

    if (listeners) {
      for (const listener of listeners) {
        listener(value)
      }
    }
  }

  target()?.addEventListener(eventName, delegatedListener)

  const unsubscribe = () => {
    target()?.removeEventListener(eventName, delegatedListener)
  }

  return {delegatedListener, keyMap, unsubscribe}
}

export const DEFAULT_CHANNEL_PREFIX = ''

export const addListener = (
  delegatedEventMap: DelegatedEventMap,
  eventName: string,
  key: string,
  listener: (value: any) => void,
  target: () => any = getDocument,
) => {
  const delegatedPayload =
    delegatedEventMap.get(eventName) ?? createNewDelegatedPayload(eventName, target)

  delegatedEventMap.set(eventName, delegatedPayload)

  const listeners = delegatedPayload.keyMap.get(key) ?? new Set()

  delegatedPayload.keyMap.set(key, listeners)
  listeners.add(listener)
}

export const removeListener = (
  delegatedEventMap: DelegatedEventMap,
  eventName: string,
  key: string,
  listener: (value: any) => void,
): boolean => {
  const delegatedPayload = delegatedEventMap.get(eventName)

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

/**
 * Creates a delegated event.
 * Creates the delegatedEventMap used by delegatedEmit and delegatedOn, and returns an unsubscribe function to clean up the event map.
 * @returns {DelegatedEventMap} - The delegated event map.
 * @returns {() => void} - The unsubscribe function.
 */
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

export const delegatedEmit = (eventName: string, key: string, value: any) => {
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
  target: () => any = getDocument,
) => {
  const _addListener = () => {
    addListener(delegatedEventMap, channel, key, listener, target)
  }

  const _removeListener = () => {
    removeListener(delegatedEventMap, channel, key, listener)
  }

  return {addListener: _addListener, removeListener: _removeListener}
}
