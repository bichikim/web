import {Accessor, createContext, JSX} from 'solid-js'

export type ButtonTag = 'button' | 'a'

export interface ButtonContextValue {
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

export interface ButtonContextProps {
  handleClick: JSX.EventHandler<HTMLButtonElement, MouseEvent | TouchEvent>
  handleTouchEnd: JSX.EventHandler<HTMLButtonElement, TouchEvent>
  handleTouchStart: JSX.EventHandler<HTMLButtonElement, TouchEvent>
  value: Accessor<ButtonContextValue>
}

export const ButtonContext = createContext<ButtonContextProps>({
  handleClick: () => {
    throw new Error('not implemented')
  },
  handleTouchEnd: () => {
    throw new Error('not implemented')
  },
  handleTouchStart: () => {
    throw new Error('not implemented')
  },
  value: () => ({
    disabled: false,
    loading: 'false' as const,
    loadingAnimation: 'false' as const,
    loadingProcess: undefined,
    tag: 'button' as const,
  }),
})
