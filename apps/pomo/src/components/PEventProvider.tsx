import {type JSX} from 'solid-js'

import {PEventContext, usePEventController} from '../features/focus-room-dialogue'

export interface PEventProviderProps {
  readonly children: JSX.Element
  readonly isPlaybackEnabled?: boolean
}

export const PEventProvider = (props: PEventProviderProps) => {
  const value = usePEventController(props)

  return <PEventContext.Provider value={value}>{props.children}</PEventContext.Provider>
}
