import {Accessor, createContext} from 'solid-js'

export interface DragButtonContextProps {
  dragX: number
  dragY: number
}

export interface DragButtonContextAction {
  handleMouseDown: (event: MouseEvent) => void
  handleTouchStart: (event: TouchEvent) => void
}

export const DragButtonContext = createContext<[Accessor<DragButtonContextProps>, DragButtonContextAction]>([
  () => ({dragX: 0, dragY: 0}),
  {
    handleMouseDown: () => {
      throw new Error('handleMouseDown is not implemented')
    },
    handleTouchStart: () => {
      throw new Error('handleTouchStart is not implemented')
    },
  },
])
