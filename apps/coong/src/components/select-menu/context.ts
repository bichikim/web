import {createContext, useContext} from 'solid-js'
import type {SelectMenuController} from './use-select-menu'

export interface SelectMenuContextValue {
  controller: SelectMenuController
}

export const SelectMenuContext = createContext<SelectMenuContextValue>()

export const useSelectMenuContext = (): SelectMenuContextValue => {
  const value = useContext(SelectMenuContext)

  if (!value) {
    throw new Error('useSelectMenuContext must be used within HSelectRoot')
  }

  return value
}
