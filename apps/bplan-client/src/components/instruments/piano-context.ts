import {createContext} from 'solid-js'

export interface PianoContextProps {
  onDown: (key: string | number) => any
  onUp: (key: string | number) => any
  scale: number
}

export const PianoContext = createContext<PianoContextProps>({
  onDown: () => {
    console.warn('PianoContext onDown not implemented')
  },
  onUp: () => {
    console.warn('PianoContext onUp not implemented')
  },
  scale: 100,
})
