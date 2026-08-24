export type PSelectAppearance = 'default' | 'detailed' | 'icon'

export interface PSelectOption<TValue extends string> {
  readonly description?: string
  readonly icon?: string
  readonly label: string
  readonly value: TValue
}
