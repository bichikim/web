export type ColorThemeKey =
  | 'accent'
  | 'border'
  | 'canvas'
  | 'control'
  | 'divider'
  | 'error'
  | 'hover'
  | 'input'
  | 'on-accent'
  | 'panel'
  | 'selected'
  | 'text'
  | 'text-muted'
  | 'text-secondary'
  | 'warning'
  | 'axis-x'
  | 'axis-y'
  | 'axis-z'
  | 'weight-low'
  | 'weight-high'
  | 'overlay-light'
  | 'overlay-dark'
  | 'backdrop'
  | 'shadow'
  | 'light'

export type ColorTheme = Readonly<Partial<Record<ColorThemeKey, string>>>

export interface ColorThemeField {
  readonly key: ColorThemeKey
  readonly label: string
  readonly advanced?: boolean
}
