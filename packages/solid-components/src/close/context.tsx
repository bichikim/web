import {Accessor, createContext, useContext} from 'solid-js'

export interface CloseContextProps {
  show: boolean
}

export type CloseContextValue = readonly [
  Accessor<CloseContextProps>,
  {
    handleShow: (value: boolean) => void
  },
]

export interface CloseContextActions {
  handleClose: () => void
}

export const CloseContext = createContext<CloseContextValue>([
  () => ({
    show: true,
  }),
  {
    handleShow: () => {
      throw new Error('handleClose is not implemented')
    },
  },
])

export const useClose = () => {
  return useContext(CloseContext)
}
