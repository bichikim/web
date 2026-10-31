/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {useColorTheme} from '../use-color-theme'

afterEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('style')
  vi.restoreAllMocks()
})

test('should persist an inline CSS color as a reloadable HEX preference', () => {
  const root = document.documentElement
  root.style.setProperty('--puppet-color-accent', 'rgb(120, 60, 180)')
  createRoot((dispose) => {
    const theme = useColorTheme(root)
    theme.change('panel', '#202030')
    expect(theme.apply()).toBe(true)
    dispose()
  })
  expect(JSON.parse(localStorage.getItem('poffo:color-theme:v1')!)).toEqual({
    accent: '#783CB4',
    panel: '#202030',
  })
})

test('should preview colors on root and roll back uncommitted edits on disposal', () => {
  const root = document.documentElement
  root.style.setProperty('--puppet-color-accent', '#123456', 'important')
  createRoot((dispose) => {
    const theme = useColorTheme(root)
    theme.change('accent', '#abcdef')
    expect(root.style.getPropertyValue('--puppet-color-accent')).toBe('#abcdef')
    expect(localStorage.getItem('poffo:color-theme:v1')).toBeNull()
    dispose()
  })
  expect(root.style.getPropertyValue('--puppet-color-accent')).toBe('#123456')
})

test('should keep applied colors and persist only overrides', () => {
  createRoot((dispose) => {
    const theme = useColorTheme(document.documentElement)
    theme.change('panel', '#234567')
    expect(theme.apply()).toBe(true)
    dispose()
  })
  expect(document.documentElement.style.getPropertyValue('--puppet-color-panel')).toBe('#234567')
  expect(JSON.parse(localStorage.getItem('poffo:color-theme:v1')!)).toEqual({panel: '#234567'})
})

test('should preview defaults and restore the previous theme when cancelled', () => {
  const root = document.documentElement
  root.style.setProperty('--puppet-color-panel', '#234567')
  createRoot((dispose) => {
    const theme = useColorTheme(root)
    theme.reset()
    expect(root.style.getPropertyValue('--puppet-color-panel')).toBe('')
    dispose()
  })
  expect(root.style.getPropertyValue('--puppet-color-panel')).toBe('#234567')
})

test('should persist a reset so a refresh uses default colors', () => {
  document.documentElement.style.setProperty('--puppet-color-panel', '#234567')
  createRoot((dispose) => {
    const theme = useColorTheme(document.documentElement)
    theme.reset()
    expect(theme.apply()).toBe(true)
    dispose()
  })
  expect(document.documentElement.style.getPropertyValue('--puppet-color-panel')).toBe('')
  expect(JSON.parse(localStorage.getItem('poffo:color-theme:v1')!)).toEqual({})
})

test('should keep failed saves editable and roll them back on cancellation', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Full', 'QuotaExceededError')
  })
  createRoot((dispose) => {
    const theme = useColorTheme(document.documentElement)
    theme.change('accent', '#abcdef')
    expect(theme.apply()).toBe(false)
    expect(theme.error()).toBe('색 테마를 저장하지 못했습니다. 다시 시도하세요.')
    dispose()
  })
  expect(document.documentElement.style.getPropertyValue('--puppet-color-accent')).toBe('')
})

test('should warn about unreadable text colors without blocking customization', () => {
  const root = document.documentElement
  root.style.setProperty('--puppet-default-color-text', '#ffffff')
  root.style.setProperty('--puppet-default-color-text-secondary', '#eeeeee')
  root.style.setProperty('--puppet-default-color-text-muted', '#eeeeee')
  root.style.setProperty('--puppet-default-color-panel', '#111111')
  root.style.setProperty('--puppet-default-color-on-accent', '#000000')
  root.style.setProperty('--puppet-default-color-accent', '#ffffff')
  root.style.setProperty('--puppet-default-color-error', '#ff7a76')
  root.style.setProperty('--puppet-default-color-warning', '#e5b55a')
  createRoot((dispose) => {
    const theme = useColorTheme(root)
    expect(theme.lowContrast()).toBe(false)
    theme.change('text', '#111111')
    expect(theme.lowContrast()).toBe(true)
    expect(theme.apply()).toBe(true)
    dispose()
  })
})

test('should warn when a status color blends into the panel', () => {
  const root = document.documentElement
  root.style.setProperty('--puppet-default-color-text', '#ffffff')
  root.style.setProperty('--puppet-default-color-text-secondary', '#eeeeee')
  root.style.setProperty('--puppet-default-color-text-muted', '#eeeeee')
  root.style.setProperty('--puppet-default-color-panel', '#111111')
  root.style.setProperty('--puppet-default-color-on-accent', '#000000')
  root.style.setProperty('--puppet-default-color-accent', '#ffffff')
  root.style.setProperty('--puppet-default-color-error', '#ff7a76')
  root.style.setProperty('--puppet-default-color-warning', '#e5b55a')
  createRoot((dispose) => {
    const theme = useColorTheme(root)
    expect(theme.lowContrast()).toBe(false)
    theme.change('error', '#111111')
    expect(theme.lowContrast()).toBe(true)
    theme.change('error', '#ff7a76')
    theme.change('warning', '#111111')
    expect(theme.lowContrast()).toBe(true)
    dispose()
  })
})
