import {Accessor, createContext, JSX} from 'solid-js'

export type ButtonTag = 'button' | 'a'

export interface ButtonContextProps {
  disabled: boolean
  href?: string
  /**
   * number: loading process percentage
   * boolean: auto loading state
   */
  loading: 'true' | 'false'
  loadingAnimation: 'true' | 'false'
  loadingProcess?: number
  tag: ButtonTag
}

export interface ButtonContextActions {
  handleClick: JSX.EventHandler<HTMLButtonElement, MouseEvent | TouchEvent>
  handleTouchEnd: JSX.EventHandler<HTMLButtonElement, TouchEvent>
  handleTouchStart: JSX.EventHandler<HTMLButtonElement, TouchEvent>
}

export const ButtonContext = createContext<[Accessor<ButtonContextProps>, ButtonContextActions]>([
  () => ({
    disabled: false,
    loading: 'false' as const,
    loadingAnimation: 'false' as const,
    loadingProcess: undefined,
    tag: 'button' as const,
  }),
  {
    handleClick: () => {
      throw new Error('not implemented')
    },
    handleTouchEnd: () => {
      throw new Error('not implemented')
    },
    handleTouchStart: () => {
      throw new Error('not implemented')
    },
  },
])
