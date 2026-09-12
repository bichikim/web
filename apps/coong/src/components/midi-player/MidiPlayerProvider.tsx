import {MidiPlayerContext} from './context'
import type {MidiPlayerProviderProps} from './types'
import {useMidiPlayerState} from './use-midi-player-state'

export const MidiPlayerProvider = (props: MidiPlayerProviderProps) => {
  const contextValue = useMidiPlayerState(props)

  return (
    <MidiPlayerContext.Provider value={contextValue}>{props.children}</MidiPlayerContext.Provider>
  )
}
