import {delegatedEmit, DelegatedEventMap, delegatedOn} from './delegated-event'
import {
  type DeepPosition,
  DEFAULT_ID,
  DEFAULT_KEY_OPTIONS,
  getDeepPositionKey,
  type KeyDeepPositionOptions,
} from './deep-position'

export type DelegatedFocusOnOptions = KeyDeepPositionOptions

export const delegatedFocusOn = (
  delegatedEventMap: DelegatedEventMap,
  deepPosition: DeepPosition,
  listener: (value: boolean, options: any) => void,
  options: DelegatedFocusOnOptions = DEFAULT_KEY_OPTIONS,
) => {
  const {id = DEFAULT_ID} = options
  const eventKey = getDeepPositionKey(deepPosition, options)

  const _listener = (value: {focused: boolean; options: any}) => {
    listener(value.focused, value.options)
  }

  return delegatedOn(delegatedEventMap, id, eventKey, _listener)
}

export const delegatedFocusEmit = (
  deepPosition: DeepPosition,
  focused: boolean,
  payload: any,
  options: KeyDeepPositionOptions = DEFAULT_KEY_OPTIONS,
) => {
  const {id = DEFAULT_ID} = options
  const eventKey = getDeepPositionKey(deepPosition, options)

  return delegatedEmit(id, eventKey, {
    focused,
    payload,
  })
}
