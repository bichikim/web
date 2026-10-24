import {createEffect, createSignal, createUniqueId, ParentProps, untrack} from 'solid-js'
import {TabContext} from './context'

export interface TabObjectItem {
  icon?: string
  label?: string
  value: string
}
export type TabItem = string | TabObjectItem

export interface HTabProviderProps extends ParentProps {
  activeTab?: string
}

export const HTabProvider = (props: HTabProviderProps) => {
  const id = createUniqueId()
  const initTabValue = untrack(() => props.activeTab ?? 'default')
  const [tabValue, setTabValue] = createSignal(initTabValue)

  createEffect(() => {
    setTabValue(props.activeTab ?? 'default')
  })

  return (
    <TabContext.Provider value={{id, setTabValue, tabValue: tabValue}}>
      {props.children}
    </TabContext.Provider>
  )
}
