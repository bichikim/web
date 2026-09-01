import {type JSX} from 'solid-js'

import {PEventContext} from '../features/focus-room-dialogue/event-context'
import {usePEventController} from '../features/focus-room-dialogue/use-p-event-controller'

export interface PEventProviderProps {
  readonly children: JSX.Element
  readonly isPlaybackEnabled?: boolean
}

export const PEventProvider = (props: PEventProviderProps) => {
  const value = usePEventController(props)

  return <PEventContext.Provider value={value}>{props.children}</PEventContext.Provider>
}
