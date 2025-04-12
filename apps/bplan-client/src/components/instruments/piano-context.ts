import {Accessor, createContext} from 'solid-js'

export interface PianoContextProps {
  down: Accessor<Set<string | number>>
  onDown: (key: string | number) => any
  onUp: (key: string | number) => any
  scale?: number
}

export const PianoContext = createContext<PianoContextProps>({
  down: () => new Set<string | number>(),
  onDown: () => {
    console.warn('PianoContext onDown not implemented')
  },
  onUp: () => {
    console.warn('PianoContext onUp not implemented')
  },
  scale: 100,
})
