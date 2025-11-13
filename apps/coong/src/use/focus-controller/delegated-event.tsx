import {createContext, useContext, createEffect, untrack, onCleanup, type JSX} from 'solid-js'
import {
  createDelegatedEvent,
  delegatedEmit,
  delegatedOn,
  DEFAULT_CHANNEL_PREFIX,
  type DelegatedEventMap,
} from 'src/utils/focus-controller/delegated-event'
import {type MaybeAccessor, resolveAccessor} from '@winter-love/solid-use'

export const DelegatedEventContext = createContext<{
  prefix: string
  delegatedEventMap: DelegatedEventMap
  isFake?: boolean
}>({
  prefix: DEFAULT_CHANNEL_PREFIX,
  delegatedEventMap: new Map(),
  isFake: true,
})

interface DelegatedEventProviderProps {
  initialEventNamePrefix?: string
  children: JSX.Element
}

export const DelegatedEventProvider = (props: DelegatedEventProviderProps) => {
  const initialEventNamePrefix = untrack(() => props.initialEventNamePrefix ?? DEFAULT_CHANNEL_PREFIX)
  const {delegatedEventMap, unsubscribe} = createDelegatedEvent()

  onCleanup(unsubscribe)

  return <DelegatedEventContext.Provider value={{delegatedEventMap, isFake: false, prefix: initialEventNamePrefix}}>{props.children}</DelegatedEventContext.Provider>
}

export const useDelegatedEmitHandler = () => {
  const {isFake, prefix} = useContext(DelegatedEventContext)

  // only warn on client side
  if (isFake && !import.meta.env.SSR) {
    console.warn('DelegatedEventContext is not provided')
  }

  return (channel: string, key: string, value: any) => {
    delegatedEmit(channel, key, value, prefix)
  }
}

export const useDelegatedOn = (channel: MaybeAccessor<string>, key: MaybeAccessor<string>, listener: (value: any) => void) => {
  const {delegatedEventMap, isFake, prefix} = useContext(DelegatedEventContext)
  const channelAccessor = resolveAccessor(channel)
  const keyAccessor = resolveAccessor(key)

  // only warn on client side
  if (isFake && !import.meta.env.SSR) {
    console.warn('DelegatedEventContext is not provided')
  }

  createEffect(() => {
    const {unsubscribe, addListener} = delegatedOn(delegatedEventMap, channelAccessor(), keyAccessor(), listener, prefix)

    if (!import.meta.env.SSR) {
      addListener()
    }

    onCleanup(unsubscribe)
  })
}
