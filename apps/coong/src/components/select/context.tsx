import {type Accessor, createContext, useContext} from 'solid-js'

export interface SelectContext {
  onOpenChange: (open: boolean) => void
  open: Accessor<boolean>
}

export const SelectContext = createContext<SelectContext>({
  onOpenChange: () => {
    // void
  },
  open: () => false,
})

export const useSelectContext = () => {
  const context = useContext(SelectContext)

  if (!context) {
    throw new Error('useSelectContext must be used within HSelectRoot')
  }

  return context
}
