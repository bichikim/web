import {Accessor, createContext} from 'solid-js'

export interface TabObjectItem {
  icon?: string
  label?: string
  value: string
}
export type TabItem = string | TabObjectItem

export const getTabId = (id: string, value: string) => {
  return `coong:${id}-${value}`
}

export interface TabContextValue<T extends TabItem> {
  id: string
  setTabValue: (tabValue: T) => void
  tabValue: Accessor<T>
}

export const TabContext = createContext<TabContextValue<string>>({
  id: 'unknown',
  setTabValue: () => {
    console.warn('setTabValue is not implemented')
  },
  tabValue: () => '',
})
