import {createContext, useContext} from 'solid-js'
import {ScrollBarType} from './types'

export interface ScrollEventContextProps {
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
}

export const ScrollEventContext = createContext<ScrollEventContextProps>({
  moveScroll: () => {
    // empty
  },
  setScroll: () => {
    // empty
  },
})

/**
 * The child component provides a set of functions that execute the scrolling action to the WScrollBody as a context
 */
export const useScrollEvent = () => {
  const context = useContext(ScrollEventContext)
  if (context === undefined) {
    throw new Error('useScrollEventContext must be used within a ScrollEventContext')
  }
  return context
}
