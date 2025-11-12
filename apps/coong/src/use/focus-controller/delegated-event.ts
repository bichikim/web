import {createContext, onCleanup, useContext} from 'solid-js'
import {
  createDelegatedEvent as createDelegatedEventUtil,
  delegatedEmit as delegatedEmitUtil,
  delegatedOn as delegatedOnUtil,
  type DelegatedEventMap,
} from 'src/utils/focus-controller/delegated-event'

export const DelegatedEventContext = createContext<{
  delegatedEventMap: DelegatedEventMap
  eventName: string
}>({
  delegatedEventMap: new Map(),
  eventName: 'delegated-event',
})

export const createDelegatedEvent = (eventName: string) => {
  const {delegatedEventMap, unsubscribe} = createDelegatedEventUtil(eventName)

  onCleanup(unsubscribe)

  return delegatedEventMap
}

export const useDelegatedEmit = (key: string) => {
  const {eventName} = useContext(DelegatedEventContext)

  return delegatedEmitUtil(eventName, key)
}

export const useDelegatedOn = (key: string, listener: (value: any) => void) => {
  const {delegatedEventMap} = useContext(DelegatedEventContext)

  return delegatedOnUtil(delegatedEventMap, key, listener)
}
