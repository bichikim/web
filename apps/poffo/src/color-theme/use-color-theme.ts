import {createSignal, onCleanup} from 'solid-js'
import {normalizeThemeColor} from './normalize-theme-color'
import {COLOR_THEME_FIELDS} from './fields'
import {saveColorTheme} from './color-theme'
import type {ColorTheme, ColorThemeKey} from './types'
import {getColorContrast} from './get-color-contrast'

export const useColorTheme = (root: HTMLElement) => {
  const initial = COLOR_THEME_FIELDS.map(({key}) => ({
    key,
    priority: root.style.getPropertyPriority(`--puppet-color-${key}`),
    value: root.style.getPropertyValue(`--puppet-color-${key}`),
  }))
  const [overrides, setOverrides] = createSignal<ColorTheme>(
    Object.fromEntries(
      initial.filter(({value}) => value !== '').map(({key, value}) => [key, value]),
    ),
  )
  const [error, setError] = createSignal<string | null>(null)
  let applied = false
  const restore = () => {
    for (const {key, priority, value} of initial) {
      root.style.setProperty(`--puppet-color-${key}`, value, priority)
    }
  }
  onCleanup(() => {
    if (!applied) {
      restore()
    }
  })
  const color = (key: ColorThemeKey) => {
    overrides()
    const computed = getComputedStyle(root)
    const value =
      computed.getPropertyValue(`--puppet-color-${key}`).trim() ||
      computed.getPropertyValue(`--puppet-default-color-${key}`).trim()
    return normalizeThemeColor(root, value)
  }
  const change = (key: ColorThemeKey, value: string) => {
    root.style.setProperty(`--puppet-color-${key}`, value)
    setOverrides((previous) => ({...previous, [key]: value}))
    setError(null)
  }
  const reset = () => {
    for (const {key} of COLOR_THEME_FIELDS) {
      root.style.removeProperty(`--puppet-color-${key}`)
    }
    setOverrides({})
    setError(null)
  }
  const apply = () => {
    applied = saveColorTheme(
      Object.fromEntries(
        Object.entries(overrides()).map(([key, value]) => [key, normalizeThemeColor(root, value)]),
      ),
    )
    setError(applied ? null : '색 테마를 저장하지 못했습니다. 다시 시도하세요.')
    return applied
  }
  const MINIMUM_CONTRAST = 4.5
  const MINIMUM_GRAPHIC_CONTRAST = 3
  const lowContrast = () =>
    getColorContrast(color('text'), color('panel')) < MINIMUM_CONTRAST ||
    getColorContrast(color('text-secondary'), color('panel')) < MINIMUM_CONTRAST ||
    getColorContrast(color('error'), color('panel')) < MINIMUM_CONTRAST ||
    getColorContrast(color('warning'), color('panel')) < MINIMUM_CONTRAST ||
    getColorContrast(color('text-muted'), color('panel')) < MINIMUM_GRAPHIC_CONTRAST ||
    getColorContrast(color('on-accent'), color('accent')) < MINIMUM_CONTRAST
  return {apply, change, color, error, lowContrast, reset}
}
