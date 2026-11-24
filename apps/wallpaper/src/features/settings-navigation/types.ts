import type {Accessor, JSX} from 'solid-js'
import type {SelectOption} from '../select'

export interface SettingsBreadcrumb {
  readonly label: string
  readonly options: readonly SelectOption<string>[]
  readonly value?: string
  readonly onSelect?: (value: string) => void
  readonly onBack?: () => void
  readonly actions?: () => JSX.Element
}

export interface SettingsBranch {
  readonly pending: Accessor<boolean>
  readonly navigate: (path: readonly SettingsBreadcrumb[], change: () => void) => Promise<void>
  readonly active: Accessor<boolean>
  readonly path: Accessor<readonly SettingsBreadcrumb[]>
  readonly trail: Accessor<readonly SettingsBreadcrumb[]>
  readonly attach: (branch: SettingsBranch) => () => void
  readonly select: (segment: SettingsBreadcrumb, value: string) => Promise<void>
}

export interface SettingsScopeOptions {
  readonly active: Accessor<boolean>
  readonly segment: Accessor<SettingsBreadcrumb | null>
}
