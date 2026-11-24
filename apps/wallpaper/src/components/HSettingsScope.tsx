import type {JSX} from 'solid-js'
import {
  type SettingsBreadcrumb,
  SettingsNavigationContext,
  useSettingsScope,
} from '../features/settings-navigation'

interface HSettingsScopeProps {
  readonly active?: boolean
  readonly segment?: SettingsBreadcrumb | null
  readonly children?: JSX.Element
}

export const HSettingsScope = (props: HSettingsScopeProps) => {
  const scope = useSettingsScope({
    active: () => props.active !== false,
    segment: () => props.segment ?? null,
  })
  return (
    <SettingsNavigationContext.Provider value={scope}>
      {props.children}
    </SettingsNavigationContext.Provider>
  )
}
