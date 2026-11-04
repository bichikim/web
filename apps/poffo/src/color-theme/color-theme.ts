import {COLOR_THEME_FIELDS} from './fields'
import type {ColorTheme} from './types'

const STORAGE_KEY = 'poffo:color-theme:v1'

const parseColorTheme = (value: unknown): ColorTheme | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }
  const entries = COLOR_THEME_FIELDS.flatMap(({key}) => {
    const color: unknown = Reflect.get(value, key)
    return color === undefined ? [] : [[key, color] as const]
  })
  if (entries.some(([, color]) => typeof color !== 'string' || !/^#[\da-f]{6}$/iu.test(color))) {
    return null
  }
  return Object.fromEntries(entries)
}

export const restoreColorTheme = (root: HTMLElement) => {
  try {
    const stored = globalThis.localStorage.getItem(STORAGE_KEY)
    if (stored === null) {
      return
    }
    const theme = parseColorTheme(JSON.parse(stored))
    if (theme === null) {
      return
    }
    const computed = getComputedStyle(root)
    for (const [key, value] of Object.entries(theme)) {
      const property = `--puppet-color-${key}`
      if (computed.getPropertyValue(property).trim() === '') {
        root.style.setProperty(property, value)
      }
    }
  } catch (error) {
    console.warn('Poffo color theme could not be restored.', error)
  }
}

export const saveColorTheme = (theme: ColorTheme): boolean => {
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(theme))
    return true
  } catch {
    return false
  }
}
