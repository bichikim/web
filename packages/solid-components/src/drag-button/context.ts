import {Accessor, createContext} from 'solid-js'

export interface DragButtonContextProps {
  dragX: number
  dragY: number
}

export interface DragButtonContextAction {
  handleMouseDown: (event: MouseEvent) => void
  handleMouseMove: (event: MouseEvent) => void
  handleTouchEnd: (event: TouchEvent) => void
  handleTouchMove: (event: TouchEvent) => void
  handleTouchStart: (event: TouchEvent) => void
}

export const DragButtonContext = createContext<
  [Accessor<DragButtonContextProps>, DragButtonContextAction]
>([
  () => ({dragX: 0, dragY: 0}),
  {
    handleMouseDown: () => {
      throw new Error('handleMouseDown is not implemented')
    },
    handleMouseMove: () => {
      throw new Error('handleMouseMove is not implemented')
    },
    handleTouchEnd: () => {
      throw new Error('handleTouchEnd is not implemented')
    },
    handleTouchMove: () => {
      throw new Error('handleTouchMove is not implemented')
    },
    handleTouchStart: () => {
      throw new Error('handleTouchStart is not implemented')
    },
  },
])
