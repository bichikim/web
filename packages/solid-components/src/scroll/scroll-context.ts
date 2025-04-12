import {Accessor, createContext, Setter, useContext} from 'solid-js'
import {ScrollBarType} from '../scroll/types'

export interface ScrollState {
  containerHeight: number
  containerLeft: number
  containerTop: number
  containerWidth: number
  scrollHeight: number
  scrollLeft: number
  scrollTop: number
  scrollWidth: number
}

export interface WScrollContextProps {
  /**
   * move the scroll by a set amount and direction
   * @param type direction to be changed
   * @param amount how much will be changed
   */
  moveScroll: (type: ScrollBarType, amount: number) => void
  /**
   * change the scroll position
   */
  setScroll: (type: ScrollBarType, scrollPosition: number) => void
  setScrollBodyElement: Setter<HTMLElement | null>
  value: Accessor<WScrollValue>
}

export interface WScrollValue extends ScrollState {
  id: string
  percentX: number
  percentY: number
  showXBar: boolean
  showYBar: boolean
}

export const ScrollContext = createContext<WScrollContextProps>()

export const useScrollContext = (): WScrollContextProps => {
  const context = useContext(ScrollContext)

  if (context === undefined) {
    throw new Error('useScrollContext must be used within a ScrollContext.Provider')
  }

  return context
}
