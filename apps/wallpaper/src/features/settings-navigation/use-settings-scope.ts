import {createEffect, createMemo, onCleanup, useContext} from 'solid-js'
import {SettingsNavigationContext} from './context'
import type {SettingsBranch, SettingsScopeOptions} from './types'

export const useSettingsScope = (options: SettingsScopeOptions): SettingsBranch | undefined => {
  const parent = useContext(SettingsNavigationContext)
  if (parent === undefined) {
    return undefined
  }
  const path = createMemo(() => {
    const segment = options.active() ? options.segment() : null
    return segment === null ? parent.path() : [...parent.path(), segment]
  })
  const branch: SettingsBranch = {
    ...parent,
    active: () => parent.active() && options.active(),
    path,
  }
  createEffect(() => {
    const detach = parent.attach(branch)
    onCleanup(detach)
  })
  return branch
}
