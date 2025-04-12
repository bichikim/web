import {createContext, useContext} from 'solid-js'

export type CloseContextProps = () => void

export const CloseContext = createContext<CloseContextProps>(() => {
  //
})

export const useClose = () => {
  return useContext(CloseContext)
}
