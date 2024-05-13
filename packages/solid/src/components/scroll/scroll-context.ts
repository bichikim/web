import {Accessor, createContext, useContext} from 'solid-js'

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

export interface WScrollContextProps extends ScrollState {
  id: string
  percentX: number
  percentY: number
}

export const ScrollContext = createContext<Accessor<WScrollContextProps>>()

export const useScroll = (): Accessor<WScrollContextProps> => {
  const context = useContext(ScrollContext)

  if (context === undefined) {
    throw new Error('useScrollContext must be used within a ScrollContext.Provider')
  }

  return context
}
