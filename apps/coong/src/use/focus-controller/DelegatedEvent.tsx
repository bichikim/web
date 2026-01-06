import {createContext, useContext, createEffect, untrack, onCleanup, type JSX} from 'solid-js'
import {
  createDelegatedEvent,
  delegatedEmit,
  delegatedOn,
  DEFAULT_CHANNEL_PREFIX,
  type DelegatedEventMap,
} from 'src/utils/focus-controller/delegated-event'
import {isServer} from 'solid-js/web'
import {type MaybeAccessor, resolveAccessor} from '@winter-love/solid-use'
import {getDocument} from '@winter-love/utils'

export const DELEGATED_EVENT_KEYS = Symbol('delegated-event-keys')

export const DelegatedEventContext = createContext<{
  delegatedEventMap: DelegatedEventMap
  isFake?: boolean
}>({
  delegatedEventMap: new Map(),
  isFake: true,
})

interface DelegatedEventProviderProps {
  /** The children of the DelegatedEventProvider. */
  children: JSX.Element
}

/**
 * Provides a context for delegated events.
 * @param props - The props for the DelegatedEventProvider.
 * @returns {JSX.Element}
 */
export const DelegatedEventProvider = (props: DelegatedEventProviderProps) => {
  const {delegatedEventMap, unsubscribe} = createDelegatedEvent()

  onCleanup(unsubscribe)

  return (
    <DelegatedEventContext.Provider value={{delegatedEventMap, isFake: false}}>
      {props.children}
    </DelegatedEventContext.Provider>
  )
}

export const useDelegatedEmitHandler = () => {
  const {isFake} = useContext(DelegatedEventContext)

  // only warn on client side
  if (!isServer) {
    // this code is removed at build time in server code
    if (isFake) {
      console.warn('DelegatedEventContext is not provided')
    }
  }

  return (channel: string, key: string, value: any) => {
    delegatedEmit(channel, key, value)
  }
}

export const useGlobalDelegatedEventMap = (target: () => any = getDocument) => {
  const _target = target()

  if (typeof _target !== 'object' || _target === null) {
    return {delegatedEventMap: new Map(), isFake: true}
  }
  const {delegatedEventMap, unsubscribe} = _target[DELEGATED_EVENT_KEYS] ?? createDelegatedEvent()

  _target[DELEGATED_EVENT_KEYS] = {delegatedEventMap, unsubscribe}

  return {delegatedEventMap, isFake: false}
}

export interface UseDelegatedOnOptions {
  globalMap?: boolean
  target?: () => any
}

export const useDelegatedOn = (
  channel: MaybeAccessor<string>,
  key: MaybeAccessor<string>,
  listener: MaybeAccessor<((value: any) => void) | undefined>,
  options: UseDelegatedOnOptions = {},
) => {
  const {target = getDocument, globalMap = false} = options
  const {delegatedEventMap, isFake} = globalMap ? useGlobalDelegatedEventMap(target) : useContext(DelegatedEventContext)
  const channelAccessor = resolveAccessor(channel)
  const keyAccessor = resolveAccessor(key)
  const listenerAccessor = resolveAccessor(listener)

  // only warn on client side
  if (!isServer) {
    // this code is removed at build time in server code
    if (isFake) {
      console.warn('DelegatedEventContext is not provided')
    }
  }

  createEffect(() => {
    const listener = listenerAccessor()

    if (!listener) {
      return
    }

    const {removeListener, addListener} = delegatedOn(
      delegatedEventMap,
      channelAccessor(),
      keyAccessor(),
      listener,
      target,
    )

    if (!isServer) {
      // this code is removed at build time in server code
      addListener()
    }

    onCleanup(removeListener)
  })
}
