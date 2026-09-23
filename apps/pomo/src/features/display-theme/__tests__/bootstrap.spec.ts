import {runInNewContext} from 'node:vm'
import {describe, expect, it} from 'vitest'

import {DISPLAY_THEME_BOOTSTRAP_SCRIPT} from '../bootstrap'
import {DISPLAY_THEME_STORAGE_KEY} from '../model'

describe('DISPLAY_THEME_BOOTSTRAP_SCRIPT', () => {
  it('should serialize a standalone bootstrap script with the storage contract embedded', () => {
    expect(DISPLAY_THEME_BOOTSTRAP_SCRIPT).toContain(DISPLAY_THEME_STORAGE_KEY)
    expect(DISPLAY_THEME_BOOTSTRAP_SCRIPT).toContain('prefers-color-scheme: dark')
    expect(DISPLAY_THEME_BOOTSTRAP_SCRIPT).toContain('classList.toggle("dark", isDark)')
    expect(DISPLAY_THEME_BOOTSTRAP_SCRIPT).not.toContain('theme-color')
    expect(DISPLAY_THEME_BOOTSTRAP_SCRIPT).not.toMatch(/#[\da-f]{3,8}/iu)
  })
})

it.each([
  {dark: true, stored: null},
  {dark: false, stored: '"bright"'},
  {dark: false, stored: '"system"'},
  {dark: true, stored: 'invalid'},
])('should bootstrap the expected theme for $stored on a light OS', ({stored, dark}) => {
  let applied: boolean | undefined
  runInNewContext(DISPLAY_THEME_BOOTSTRAP_SCRIPT, {
    document: {
      documentElement: {
        classList: {
          toggle: (_name: string, value: boolean) => {
            applied = value
          },
        },
      },
    },
    localStorage: {getItem: () => stored},
    matchMedia: () => ({matches: false}),
  })
  expect(applied).toBe(dark)
})
