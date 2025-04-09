import {
  Accessor,
  createContext,
  createSignal,
  ParentProps,
  Setter,
  untrack,
} from 'solid-js'

export interface SHiddenPanelContextValue {
  isOpen: Accessor<boolean>
  setIsOpen: Setter<boolean>
}

export const SHiddenPanelContext = createContext<SHiddenPanelContextValue>({
  isOpen: () => false,
  setIsOpen: () => {
    console.warn('setIsOpen is not implemented')
  },
})

export interface SHiddenPanelProviderProps extends ParentProps {
  initShow?: boolean
}

export const SHiddenPanelProvider = (props: SHiddenPanelProviderProps) => {
  const initShow = untrack(() => props.initShow ?? false)
  const [isOpen, setIsOpen] = createSignal<boolean>(initShow)

  return (
    <SHiddenPanelContext.Provider value={{isOpen, setIsOpen}}>
      {props.children}
    </SHiddenPanelContext.Provider>
  )
}
