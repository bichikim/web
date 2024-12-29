import {Accessor, createContext} from 'solid-js'
import {Position} from '@winter-love/utils'

export interface DragContextProps {
  parentPosition: Accessor<Position>
}

export const DragContext = createContext<DragContextProps>({
  parentPosition: () => ({x: 0, y: 0}),
})
