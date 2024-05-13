import {createContext, useContext} from 'solid-js'

export type ScrollBarType = 'horizontal' | 'vertical'

export const ScrollBarTypeContext = createContext<ScrollBarType>()

export const useScrollBarType = (): ScrollBarType => {
  return useContext(ScrollBarTypeContext) ?? 'horizontal'
}
