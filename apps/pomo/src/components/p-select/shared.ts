export type PSelectAppearance = 'default' | 'detailed' | 'icon'

export interface PSelectOption<TValue extends string> {
  readonly disabled?: boolean
  readonly description?: string
  readonly icon?: string
  readonly label: string
  readonly value: TValue
}
