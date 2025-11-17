import {useDelegatedOn} from './DelegatedEvent'
import {nonAccessor} from '@winter-love/solid-use'
import {NONE_CUSTOM_EVENT_KEY} from 'src/utils/focus-controller/delegated-event'

export interface KeyMoveProps {
  onKeyDown?: (event: KeyboardEvent) => void
  onKeyUp?: (event: KeyboardEvent) => void
}

export const SolidWindow = (props: KeyMoveProps) => {
  useDelegatedOn(
    'keydown',
    NONE_CUSTOM_EVENT_KEY,
    nonAccessor((event) => {
      props.onKeyDown?.(event)
    }),
  )

  useDelegatedOn(
    'keyup',
    NONE_CUSTOM_EVENT_KEY,
    nonAccessor((event) => {
      props.onKeyUp?.(event)
    }),
  )

  return null
}
