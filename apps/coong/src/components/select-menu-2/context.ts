import {type Rect} from '@winter-love/utils'
import {type Accessor, createContext, useContext} from 'solid-js'

export interface SelectMenu2ContextValue {
  anchorBounds: Accessor<Rect | undefined>
  left: Accessor<number>
  listId: string
  onClose: () => void
  onOpen: (element: HTMLElement) => void
  open: Accessor<boolean>
  registerPanel: (element: HTMLDivElement) => void
  top: Accessor<number>
  unregisterPanel: (element: HTMLDivElement) => void
}

export const SelectMenu2Context = createContext<SelectMenu2ContextValue>()

export const useSelectMenu2Context = (): SelectMenu2ContextValue => {
  const value = useContext(SelectMenu2Context)

  if (!value) {
    throw new Error('useSelectMenu2Context must be used within HSelectRoot')
  }

  return value
}
