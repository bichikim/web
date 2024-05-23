import {mergeProps, createContext, useContext} from'solid-js'

export const DialogContext = createContext()

export const useDialogContext = () => {
  const context = useContext(DialogContext)

  if (context === undefined) {
    throw new Error('useDialogContext must be used within a DialogContext.Provider')
  }

  return context
}