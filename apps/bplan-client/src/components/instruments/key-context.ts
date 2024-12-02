import {Accessor, createContext} from 'solid-js'

export interface KeyContextProps {
  disabled: Accessor<boolean>
  key?: string | number
  name?: string
}

export const KeyContext = createContext<KeyContextProps>({disabled: () => false})
