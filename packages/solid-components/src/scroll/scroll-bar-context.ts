import {Accessor, createContext, useContext} from 'solid-js'
import {ScrollBarType} from './types'

export interface ScrollBarContext {
  containerPosition: number
  containerSize: number
  percent: number
  scrollId: string
  scrollPosition: number
  scrollSize: number
  type: ScrollBarType
}
export const ScrollBarContext = createContext<Accessor<ScrollBarContext>>()

export const useScrollBar = (): Accessor<ScrollBarContext> => {
  const context = useContext(ScrollBarContext)

  if (context === undefined) {
    throw new Error('useScrollBarContext must be used within a ScrollBar')
  }

  return context
}
