import {createContext} from 'solid-js'
import type {SettingsBranch} from './types'

export const SettingsNavigationContext = createContext<SettingsBranch>()
