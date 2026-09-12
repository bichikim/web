import {useContext} from 'solid-js'
import {MidiPlayerContext} from './context'

export const useMidiPlayer = () => {
  return useContext(MidiPlayerContext)
}
