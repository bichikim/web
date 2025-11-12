import {delegatedOn, DelegatedEventMap, delegatedEmit} from './delegated-event'
import {type DeepPosition, getDeepPositionKey, type KeyDeepPositionOptions, DEFAULT_KEY_OPTIONS} from './deep-position'

export const delegatedFocusOn = (
  delegatedEventMap: DelegatedEventMap,
  deepPosition: DeepPosition,
  listener: (value: boolean, options: any) => void,
  options: KeyDeepPositionOptions = DEFAULT_KEY_OPTIONS,
) => {
  const eventKey = getDeepPositionKey(deepPosition, options)

  const _listener = (value: {focused: boolean; options: any}) => {
    listener(value.focused, value.options)
  }

  return delegatedOn(delegatedEventMap, eventKey, _listener)
}

export const delegatedFocusEmit = (
  eventName: string,
  deepPosition: DeepPosition,
  options: KeyDeepPositionOptions = DEFAULT_KEY_OPTIONS,
) => {
  const eventKey = getDeepPositionKey(deepPosition, options)

  return delegatedEmit(eventName, eventKey)
}
