import {createContext, useContext} from 'solid-js'

export interface ScrollEventContextProps {
  onScrollX: (scrollPosition: number) => void
  onScrollY: (scrollPosition: number) => void
}

export const ScrollEventContext = createContext<ScrollEventContextProps>({
  onScrollX: () => {
    //
  },
  onScrollY: () => {
    //
  },
})

export const useScrollEvent = () => {
  const context = useContext(ScrollEventContext)
  if (context === undefined) {
    throw new Error('useScrollEventContext must be used within a ScrollEventContext')
  }
  return context
}
