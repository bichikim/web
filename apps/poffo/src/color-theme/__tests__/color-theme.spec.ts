/** @vitest-environment jsdom */
import {afterEach, expect, test, vi} from 'vitest'
import {restoreColorTheme, saveColorTheme} from '../color-theme'

afterEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('style')
  vi.restoreAllMocks()
})

test('should restore recognized colors without replacing an explicit root color', () => {
  localStorage.setItem(
    'poffo:color-theme:v1',
    JSON.stringify({accent: '#abcdef', panel: '#123456', unknown: '#ffffff'}),
  )
  const root = document.documentElement
  root.style.setProperty('--puppet-color-accent', '#654321', 'important')
  restoreColorTheme(root)
  expect(root.style.getPropertyValue('--puppet-color-accent')).toBe('#654321')
  expect(root.style.getPropertyValue('--puppet-color-panel')).toBe('#123456')
  expect(root.style.getPropertyValue('--puppet-color-unknown')).toBe('')
})

test('should persist and restore custom error and warning colors', () => {
  const theme = {error: '#f080c0', warning: '#b0e080'}
  expect(saveColorTheme(theme)).toBe(true)
  restoreColorTheme(document.documentElement)
  expect(document.documentElement.style.getPropertyValue('--puppet-color-error')).toBe('#f080c0')
  expect(document.documentElement.style.getPropertyValue('--puppet-color-warning')).toBe('#b0e080')
})

test('should restore editing display colors independently', () => {
  const theme = {
    'axis-x': '#e080ff',
    shadow: '#201030',
    'weight-low': '#4060e0',
  }
  expect(saveColorTheme(theme)).toBe(true)
  restoreColorTheme(document.documentElement)
  for (const [key, value] of Object.entries(theme)) {
    expect(document.documentElement.style.getPropertyValue(`--puppet-color-${key}`)).toBe(value)
  }
  expect(document.documentElement.style.getPropertyValue('--puppet-color-control')).toBe('')
})

test('should ignore obsolete surface overrides and keep panel and canvas colors independent', () => {
  localStorage.setItem(
    'poffo:color-theme:v1',
    JSON.stringify({
      background: '#00ff00',
      canvas: '#654321',
      panel: '#203040',
      ruler: '#ff0000',
      'ruler-text': '#00ff00',
      'ruler-tick': '#0000ff',
      'text-muted': '#80e0ff',
      'text-secondary': '#ffe080',
    }),
  )
  restoreColorTheme(document.documentElement)
  expect(document.documentElement.style.getPropertyValue('--puppet-color-panel')).toBe('#203040')
  expect(document.documentElement.style.getPropertyValue('--puppet-color-canvas')).toBe('#654321')
  expect(document.documentElement.style.getPropertyValue('--puppet-color-background')).toBe('')
  expect(document.documentElement.style.getPropertyValue('--puppet-color-text-secondary')).toBe(
    '#ffe080',
  )
  expect(document.documentElement.style.getPropertyValue('--puppet-color-text-muted')).toBe(
    '#80e0ff',
  )
  expect(document.documentElement.style.getPropertyValue('--puppet-color-ruler')).toBe('')
  expect(document.documentElement.style.getPropertyValue('--puppet-color-ruler-text')).toBe('')
  expect(document.documentElement.style.getPropertyValue('--puppet-color-ruler-tick')).toBe('')
})

test.each(['{broken', 'null', '[]', '{"accent":"url(https://example.com)"}'])(
  'should ignore invalid stored colors: %s',
  (stored) => {
    localStorage.setItem('poffo:color-theme:v1', stored)
    restoreColorTheme(document.documentElement)
    expect(document.documentElement.style.getPropertyValue('--puppet-color-accent')).toBe('')
  },
)

test('should report persistence failure without throwing', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Full', 'QuotaExceededError')
  })
  expect(saveColorTheme({accent: '#abcdef'})).toBe(false)
})

test('should tolerate unavailable browser storage during restore', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('Denied', 'SecurityError')
  })
  expect(() => restoreColorTheme(document.documentElement)).not.toThrow()
})
