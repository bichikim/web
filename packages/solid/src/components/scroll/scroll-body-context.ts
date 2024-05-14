import {createContext, Signal, useContext} from 'solid-js'

export type ScrollBodyContextProps = Signal<HTMLElement | null>

export const ScrollBodyContext = createContext<ScrollBodyContextProps>()

export const useScrollBodyContext = (): ScrollBodyContextProps => {
  const context = useContext(ScrollBodyContext)
  if (context === undefined) {
    throw new Error('useScrollBodyContext must be used within a ScrollBody')
  }
  return context
}
