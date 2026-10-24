import {useDelegatedOn} from './DelegatedEvent'
import {nonAccessor} from '@winter-love/solid-use'
import {untrack} from 'solid-js'
import {NONE_CUSTOM_EVENT_KEY} from 'src/utils/focus-controller/delegated-event'

export interface KeyMoveProps {
  readonly globalMap?: boolean
  onKeyDown?: (event: KeyboardEvent) => void
  onKeyUp?: (event: KeyboardEvent) => void
}

export const SolidWindow = (props: KeyMoveProps) => {
  const globalMap = untrack(() => props.globalMap ?? false)

  useDelegatedOn(
    'keydown',
    NONE_CUSTOM_EVENT_KEY,
    nonAccessor((event) => {
      props.onKeyDown?.(event)
    }),
    {
      globalMap,
    },
  )

  useDelegatedOn(
    'keyup',
    NONE_CUSTOM_EVENT_KEY,
    nonAccessor((event) => {
      props.onKeyUp?.(event)
    }),
    {
      globalMap,
    },
  )

  return null
}
